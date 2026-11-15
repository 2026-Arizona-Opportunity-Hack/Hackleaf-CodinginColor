"use server";
import { createHash,randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireDemoUser } from "@/features/demo-auth/session";
import { readDemoData,mutateDemoData } from "./store";
import { prepareClientImport } from "./csv";
import { auditSummary,recordAudit } from "./audit";
const fingerprint=(raw:string)=>createHash("sha256").update(raw.replace(/^\uFEFF/,"").replaceAll("\r\n","\n")).digest("hex");
export async function previewClientsCsv(form:FormData){
  const raw=String(form.get("csv")??"");
  const actor=await requireDemoUser();if(actor.role!=="admin")return {error:"Admin access is required to import clients.",preview:null};
  try{
    const data=await readDemoData(),preview=prepareClientImport(raw,data),replayed=data.importBatches.some(b=>b.hash===fingerprint(raw));
    return {error:"",preview:{...preview,rows:preview.rows.slice(0,20),settingsRevision:data.settingsRevision,replayed}};
  }catch(error){return {error:error instanceof Error?error.message:"Could not preview CSV.",preview:null};}
}
export async function commitClientsCsv(form:FormData){
  const raw=String(form.get("csv")??""),settingsRevision=Number(form.get("settingsRevision")),allowPartial=form.get("allowPartial")==="true";
  const actor=await requireDemoUser();if(actor.role!=="admin")return {error:"Admin access is required to import clients.",imported:0,skipped:0,rejected:0};
  try{
    const result=await mutateDemoData(data=>{
      if(data.settingsRevision!==settingsRevision)throw new Error("Fields changed. Preview the CSV again before importing.");
      const preview=prepareClientImport(raw,data),hash=fingerprint(raw);
      if(data.importBatches.some(b=>b.hash===hash))return {imported:0,skipped:preview.rows.length,rejected:0};
      if(preview.rejected&&!allowPartial)throw new Error("Confirm that invalid rows should be skipped, or fix the CSV first.");
      const before=auditSummary(data,"client");let imported=0;
      for(const row of preview.rows){if(!row.client||row.skip)continue;data.clients.push({...row.client,id:row.id??randomUUID(),revision:1,createdAt:new Date().toISOString()});imported++;}
      if(imported){data.importBatches.push({hash,at:new Date().toISOString(),count:imported});recordAudit(data,actor,"client.import","client",before,{...auditSummary(data,"client"),imported,skipped:preview.skipped,rejected:preview.rejected},["records"]);}
      return {imported,skipped:preview.skipped,rejected:preview.rejected};
    });
    revalidatePath("/clients");revalidatePath("/dashboard");revalidatePath("/client-reports");revalidatePath("/audit");
    return {error:"",...result};
  }catch(error){return {error:error instanceof Error?error.message:"Import failed. No records were changed.",imported:0,skipped:0,rejected:0};}
}
