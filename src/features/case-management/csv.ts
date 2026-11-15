import { z } from "zod";
import { clientInput,validateDemographics,type DemoData } from "./model";
export const MAX_CSV_BYTES=500000;
export function csvCell(value:unknown){let s=String(value??"");if(/^[\s\uFEFF]*[=+@-]/.test(s)||/^[\t\r\n]/.test(s))s=`'${s}`;return `"${s.replaceAll('"','""')}"`;}
const fromCell=(s:string)=>/^'[\s\uFEFF]*[=+@-]/.test(s)?s.slice(1):s;
export function csvText(rows:unknown[][]){return `\uFEFF${rows.map(row=>row.map(csvCell).join(",")).join("\r\n")}\r\n`;}
// Strict RFC-style quoting, duplicate/unknown headers and row-width checks. No
// row data enters logs, and malformed input is never partially interpreted.
export function csvRows(raw:string){
  const text=raw.replace(/^\uFEFF/,"");if(!text.trim())throw new Error("CSV is empty.");
  const rows:{line:number;cells:string[]}[]=[];let cells:string[]=[],value="",quoted=false,closed=false,line=1,start=1;
  const push=()=>{cells.push(fromCell(value));rows.push({line:start,cells});cells=[];value="";closed=false;start=line;};
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(quoted){if(c==='"'){if(text[i+1]==='"'){value+='"';i++;}else{quoted=false;closed=true;}}else{value+=c;if(c==='\n')line++;}continue;}
    if(c==='"'){if(value || closed)throw new Error(`Invalid quote at line ${line}.`);quoted=true;}
    else if(c===','){cells.push(fromCell(value));value="";closed=false;}
    else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;line++;push();}
    else{if(closed)throw new Error(`Unexpected text after a closing quote at line ${line}.`);value+=c;}
  }
  if(quoted)throw new Error("CSV has an unclosed quoted cell.");if(value||cells.length||closed)push();
  while(rows.length&&rows.at(-1)!.cells.every(v=>!v.trim()))rows.pop();
  if(rows.length>1001)throw new Error("Upload at most 1,000 client rows at a time.");
  return rows;
}
const normalize=(s:string)=>s.trim().toLowerCase().replace(/[\s-]+/g,"_");
export function prepareClientImport(raw:string,data:DemoData){
  if(new TextEncoder().encode(raw).length>MAX_CSV_BYTES)throw new Error("CSV must be 500 KB or smaller.");
  const parsed=csvRows(raw);if(parsed.length<2)throw new Error("Add at least one client row below the headers.");
  const headers=parsed[0].cells.map(h=>h.trim());if(headers.some(h=>!h))throw new Error("Every CSV column needs a header.");
  const aliases:Record<string,string>={name:"name",client_name:"name",date_of_birth:"dateOfBirth",dob:"dateOfBirth",email:"email",phone:"phone",client_id:"id",id:"id",active:"active"};
  const mapping=headers.map(header=>{
    if(Object.hasOwn(aliases,normalize(header)))return aliases[normalize(header)];
    const field=data.fields.find(f=>header===`demographic.${f.id}`)??data.fields.find(f=>normalize(f.label)===normalize(header));
    if(!field)throw new Error(`Unknown CSV column: ${header.slice(0,80)}. Use the current template.`);
    return `demographic.${field.id}`;
  });
  if(new Set(mapping).size!==mapping.length)throw new Error("CSV contains duplicate columns for the same field.");
  if(!mapping.includes("name")||!mapping.includes("dateOfBirth"))throw new Error("CSV needs name and date_of_birth columns.");
  const seen=new Set<string>();
  const rows=parsed.slice(1).map(row=>{
    const values=Object.fromEntries(mapping.map((key,i)=>[key,row.cells[i]??""]));
    try{
      if(row.cells.length!==headers.length)throw new Error("Column count does not match the headers.");
      const id=values.id?.trim()||null;if(id)z.uuid().parse(id);
      if(id&&seen.has(id))throw new Error("Duplicate client_id in this file.");if(id)seen.add(id);
      if(values.active&&!/^(true|false|active|inactive|1|0)$/i.test(values.active.trim()))throw new Error("active must be true or false.");
      const demographics=Object.fromEntries(Object.entries(values).filter(([k])=>k.startsWith("demographic.")).map(([k,v])=>[k.slice(12),v]));
      const input=clientInput.parse({name:values.name,dateOfBirth:values.dateOfBirth?.trim(),email:(values.email??"").trim(),phone:values.phone??"",demographics});
      const client={...input,demographics:validateDemographics(input.demographics,data.fields.map(f=>({...f,active:true}))),active:! /^(false|inactive|0)$/i.test(values.active?.trim()??"")};
      return {line:row.line,id,client,error:"",skip:!!id&&data.clients.some(c=>c.id===id)};
    }catch(error){return {line:row.line,id:null,client:null,error:error instanceof z.ZodError?`${error.issues[0].path.join(".")}: ${error.issues[0].message}`:error instanceof Error?error.message:"Invalid row.",skip:false};}
  });
  return {rows,ready:rows.filter(r=>r.client&&!r.skip).length,rejected:rows.filter(r=>r.error).length,skipped:rows.filter(r=>r.skip).length};
}
export function clientsCsv(data:DemoData,template=false){
  const fields=data.fields.filter(f=>f.active);
  const header=["client_id","name","date_of_birth","email","phone","active",...fields.map(f=>`demographic.${f.id}`)];
  const rows=template?[["","Example Client","2000-01-01","example-client@example.org","","true",...fields.map(()=>"")]]:data.clients.map(c=>[c.id,c.name,c.dateOfBirth,c.email,c.phone,String(c.active),...fields.map(f=>c.demographics[f.id]??"")]);
  return csvText([header,...rows]);
}
export function servicesCsv(data:DemoData){
  const fields=data.serviceFields.filter(f=>f.active);
  return csvText([["service_id","client_id","client_name","service_date","service_type","staff_member","notes",...fields.map(f=>`custom.${f.id}`)],...data.visits.map(v=>[v.id,v.clientId,data.clients.find(c=>c.id===v.clientId)?.name??"Deleted client",v.date,v.serviceTypeLabel,v.staffName,v.notes,...fields.map(f=>v.customFields[f.id]??"")])]);
}
