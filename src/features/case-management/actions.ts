"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireDemoUser } from "@/features/demo-auth/session";
import { mutateDemoData } from "./store";
import { auditSummary,recordAudit,changedAuditFields } from "./audit";
import { fieldSchema,canManage,clientInput,validateDemographics,visitInput } from "./model";
export interface ActionState {error:string;message:string}
export async function caseAction(_previous:ActionState,form:FormData):Promise<ActionState> {
  const actor=await requireDemoUser();let target="";
  try{
    await mutateDemoData(data=>{
      const op=String(form.get("op")),id=String(form.get("id")??"");
      const entity=op.startsWith("client.")?"client":op.startsWith("visit.")?"visit":"settings";
      let affectedId=id,changedFields:string[]=[];
      const before=auditSummary(data,entity,id);
      if(!["client.save","visit.save"].includes(op) || id){if(!canManage(actor.role))throw new Error("Staff can read and create records. Only an Admin can edit, delete or configure them.");}
      if(op==="client.save"){
        const old=id?data.clients.find(c=>c.id===id):undefined;
        if(id && (!old || old.revision!==Number(form.get("revision"))))throw new Error("This client changed. Refresh before editing.");
        const demographics=Object.fromEntries([...form.entries()].filter(([key])=>key.startsWith("demographic.")).map(([key,value])=>[key.slice(12),String(value)]));
        const input=clientInput.parse({name:form.get("name"),dateOfBirth:form.get("dateOfBirth"),email:String(form.get("email")??"").trim(),phone:form.get("phone")??"",demographics});
        const client={...input,active:old?form.get("active")!=="false":true,demographics:{...old?.demographics,...validateDemographics(input.demographics,data.fields)},id:old?.id??randomUUID(),revision:(old?.revision??0)+1,createdAt:old?.createdAt??new Date().toISOString()};
        if(old)data.clients[data.clients.indexOf(old)]=client;else data.clients.push(client);
        affectedId=client.id;changedFields=changedAuditFields(old,client);
        target=`/clients/${client.id}`;
      } else if(op==="client.delete"){
        if(!data.clients.some(c=>c.id===id))throw new Error("Client not found.");
        data.documents=data.documents?.filter(document=>document.clientId!==id);data.clients=data.clients.filter(c=>c.id!==id);data.visits=data.visits.filter(v=>v.clientId!==id);data.appointments=data.appointments.filter(a=>a.clientId!==id);data.reminderDismissals=data.reminderDismissals.filter(r=>data.appointments.some(a=>a.id===r.appointmentId));changedFields=["records"];target="/clients";
      } else if(op==="visit.save"){
        const old=id?data.visits.find(v=>v.id===id):undefined;
        if(id && (!old || old.revision!==Number(form.get("revision"))))throw new Error("This service entry changed. Refresh before editing.");
        const input=visitInput.parse({clientId:form.get("clientId"),date:form.get("date"),serviceTypeId:form.get("serviceTypeId"),notes:form.get("notes")??""});
        if(!data.clients.some(c=>c.id===input.clientId) || old && old.clientId!==input.clientId)throw new Error("Client not found.");
        const type=data.serviceTypes.find(t=>t.id===input.serviceTypeId && (t.active || old?.serviceTypeId===t.id));if(!type)throw new Error("Choose an available service type.");
        const customFields=Object.fromEntries([...form.entries()].filter(([key])=>key.startsWith("serviceCustom.")).map(([key,value])=>[key.slice(14),String(value)]));
        const visit={...input,customFields:{...old?.customFields,...validateDemographics(customFields,data.serviceFields)},id:old?.id??randomUUID(),serviceTypeLabel:type.label,staffId:old?.staffId??actor.id,staffName:old?.staffName??actor.name,revision:(old?.revision??0)+1,createdAt:old?.createdAt??new Date().toISOString()};
        if(old)data.visits[data.visits.indexOf(old)]=visit;else data.visits.push(visit);
        affectedId=visit.id;changedFields=changedAuditFields(old,visit);
      } else if(op==="visit.delete"){
        if(!data.visits.some(v=>v.id===id))throw new Error("Service entry not found.");data.visits=data.visits.filter(v=>v.id!==id);changedFields=["records"];
      } else if(["field.save","field.delete","service.save","service.delete"].includes(op)){
        if(data.settingsRevision!==Number(form.get("settingsRevision")))throw new Error("Settings changed. Refresh before saving.");
        const scope=z.enum(["client","visit"]).parse(form.get("fieldScope")??"client");
        const fields=scope==="client"?data.fields:data.serviceFields;
        if(op==="field.save"){
          const label=z.string().trim().min(1).max(60).parse(form.get("label"));
          const type=z.enum(["text","number","select"]).parse(form.get("type"));
          const options=String(form.get("options")??"").split(/[,\n]/).map(s=>s.trim()).filter(Boolean);
          if(type==="select" && (!options.length || options.length>20 || options.some(s=>s.length>80) || new Set(options).size!==options.length))throw new Error("Provide 1–20 unique dropdown options, separated by commas.");
          const field=id?fields.find(f=>f.id===id && f.active):undefined;
          if(id && !field)throw new Error("Field not found.");
          if(!field && fields.filter(f=>f.active).length>=(scope==="client"?5:8))throw new Error(scope==="client"?"Use 3–5 active demographic fields.":"Use at most 8 service-log fields.");
          if(fields.some(f=>f.active && f.id!==id && f.label.toLowerCase()===label.toLowerCase()))throw new Error("That field label already exists.");
          const value={id:field?.id??randomUUID(),label,type,options:type==="select"?options:[],active:true};
          if(field){
            const values=scope==="client"?data.clients.map(c=>c.demographics[field.id]):data.visits.map(v=>v.customFields[field.id]);
            for(const existing of values.filter(Boolean)){try{validateDemographics({[value.id]:existing},[value]);}catch{throw new Error("Existing records use values that do not fit this change. Keep their options or add a new field.");}}
            fields[fields.indexOf(field)]=value;
          }else fields.push(value);
        }else if(op==="field.delete"){
          const field=fields.find(f=>f.id===id && f.active);if(!field)throw new Error("Field not found.");
          if(scope==="client" && fields.filter(f=>f.active).length<=3)throw new Error("Keep at least 3 active demographic fields.");field.active=false;
        }else if(op==="service.save"){
          const label=z.string().trim().min(1).max(80).parse(form.get("label"));const type=id?data.serviceTypes.find(t=>t.id===id && t.active):undefined;
          if(id && !type)throw new Error("Service type not found.");
          if(data.serviceTypes.some(t=>t.active && t.id!==id && t.label.toLowerCase()===label.toLowerCase()))throw new Error("That service type already exists.");
          if(!type && data.serviceTypes.filter(t=>t.active).length>=20)throw new Error("Use at most 20 service types.");
          if(type)type.label=label;else data.serviceTypes.push({id:randomUUID(),label,active:true});
        }else{
          const type=data.serviceTypes.find(t=>t.id===id && t.active);if(!type)throw new Error("Service type not found.");
          if(data.serviceTypes.filter(t=>t.active).length<=1)throw new Error("Keep at least one service type.");type.active=false;
        }
        data.settingsRevision++;changedFields=["definition","schema"];
      }else throw new Error("Unknown action.");
      data.schemas={clients:fieldSchema(data.fields),visits:fieldSchema(data.serviceFields)};
      recordAudit(data,actor,op.endsWith(".save")?op.replace(".save",id?".update":".create"):op,entity,before,auditSummary(data,entity,affectedId),changedFields);
    });
  }catch(error){return {error:error instanceof z.ZodError?error.issues[0].message:error instanceof Error?error.message:"Could not save. Please retry.",message:""};}
  revalidatePath("/clients","layout");revalidatePath("/client-settings");revalidatePath("/dashboard");revalidatePath("/client-reports");revalidatePath("/appointments");revalidatePath("/audit");
  if(target)redirect(target);
  return {error:"",message:"Saved in the local demo."};
}
