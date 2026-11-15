import "server-only";
import { randomUUID } from "node:crypto";
import type { DemoData } from "./model";
type Actor={id:string;name:string};
const safeKeys=new Set(["documents","webhookKeys","clients","visits","appointments","users","sessions","reminders","clientFields","visitFields","serviceTypes","settingsRevision","revision","exists","imported","skipped","rejected"]);
const safeFields=new Set(["name","dateOfBirth","email","phone","demographics","customFields","active","date","time","durationMinutes","serviceTypeId","notes","staffId","status","definition","schema","records","session"]);
export function auditSummary(data:DemoData,entity:string,id="") {
  const row=entity==="client"?data.clients.find(r=>r.id===id):entity==="visit"?data.visits.find(r=>r.id===id):entity==="appointment"?data.appointments.find(r=>r.id===id):undefined;
  return {documents:data.documents?.length??0,webhookKeys:data.webhookKeys?.length??0,clients:data.clients.length,visits:data.visits.length,appointments:data.appointments.length,users:data.users.length,sessions:data.sessions.length,reminders:data.reminderDismissals.length,clientFields:data.fields.filter(f=>f.active).length,visitFields:data.serviceFields.filter(f=>f.active).length,serviceTypes:data.serviceTypes.filter(f=>f.active).length,settingsRevision:data.settingsRevision,exists:!!row,revision:row?.revision??null};
}
export function recordAudit(data:DemoData,actor:Actor,action:string,entity:string,before:Record<string,number|boolean|null>,after:Record<string,number|boolean|null>,changedFields:string[]) {
  const clean=(summary:Record<string,number|boolean|null>)=>Object.fromEntries(Object.entries(summary).filter(([key,value])=>safeKeys.has(key)&&(value===null||typeof value==="boolean"||typeof value==="number"&&Number.isFinite(value))));
  // No client identifiers, names, contact details, DOB, notes, custom values or
  // appointment times enter this immutable-through-the-UI metadata history.
  data.audit.push({id:randomUUID(),at:new Date().toISOString(),actorId:actor.id,actorName:actor.name,action,entity,before:clean(before),after:clean(after),changedFields:changedFields.filter(key=>safeFields.has(key))});
}
export function changedAuditFields(before:object|undefined,after:object|undefined){
  const a=(before??{}) as Record<string,unknown>,b=(after??{}) as Record<string,unknown>;
  return [...safeFields].filter(key=>JSON.stringify(a[key])!==JSON.stringify(b[key]));
}
