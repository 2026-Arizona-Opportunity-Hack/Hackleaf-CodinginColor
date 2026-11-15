import "server-only";
import { randomUUID } from "node:crypto";
import { fieldSchema,type DemoData } from "./model";
import { phoenixParts } from "./dates";
import { recordAudit,auditSummary } from "./audit";
// Upgrade only the known local v1 format. Existing clients, accounts, visits and
// sessions survive; old clinical content is never reconstructed into audit rows.
export function upgradeDemoData(data:DemoData):DemoData {
  data.version=2;data.serviceFields=[{id:"delivery_mode",label:"Delivery mode",type:"select",options:["In person","Phone","Video"],active:true},{id:"service_minutes",label:"Service duration (minutes)",type:"number",options:[],active:true}];
  data.schemas={clients:fieldSchema(data.fields),visits:fieldSchema(data.serviceFields)};data.audit=[];data.importBatches=[];data.reminderDismissals=[];
  data.clients.forEach(c=>{c.active??=true;});data.visits.forEach(v=>{v.customFields??={};});
  data.appointments=data.clients.slice(0,3).map((client,i)=>{const parts=phoenixParts(new Date(Date.now()+(i===0?30*60000:(i+1)*86400000)));const staff=data.users[i%data.users.length],type=data.serviceTypes.find(t=>t.active)!;return {id:randomUUID(),clientId:client.id,...parts,durationMinutes:30,serviceTypeId:type.id,serviceTypeLabel:type.label,staffId:staff.id,staffName:staff.name,notes:"Fictional demonstration appointment.",status:"scheduled" as const,revision:1,createdAt:new Date().toISOString()};});
  const summary=auditSummary(data,"settings");recordAudit(data,{id:"system",name:"Demo system"},"demo.schema_upgrade","settings",summary,summary,["schema"]);
  return data;
}
