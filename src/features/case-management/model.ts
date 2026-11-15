import { z } from "zod";

export type DemoRole = "admin" | "staff";
export interface DemoUser { id: string; name: string; email: string; role: DemoRole; salt: string; passwordHash: string; active: boolean }
export interface CustomField { id: string; label: string; type: "text" | "number" | "select"; options: string[]; active: boolean }
export interface ServiceType { id: string; label: string; active: boolean }
export interface ClientRecord { id: string; name: string; dateOfBirth: string; email: string; phone: string; demographics: Record<string,string>; revision: number; createdAt: string; active: boolean }
export interface ServiceVisit { customFields: Record<string,string>; id: string; clientId: string; date: string; serviceTypeId: string; serviceTypeLabel: string; staffId: string; staffName: string; notes: string; revision: number; createdAt: string }
export interface Appointment { id:string; clientId:string; date:string; time:string; durationMinutes:number; serviceTypeId:string; serviceTypeLabel:string; staffId:string; staffName:string; notes:string; status:"scheduled"|"completed"|"cancelled"; revision:number; createdAt:string }
export interface AuditEvent { id:string; at:string; actorId:string; actorName:string; action:string; entity:string; before:Record<string,number|boolean|null>; after:Record<string,number|boolean|null>; changedFields:string[] }
export interface FieldSchema { $schema:string; type:"object"; additionalProperties:false; properties:Record<string,{type:"string";title:string;maxLength:number;enum?:string[];pattern?:string;deprecated:boolean;"x-inputType":CustomField["type"]}> }
export interface DemoData { version: 2; documents?:import("../client-p2/documents").ClientDocument[]; webhookKeys?:{id:string;hash:string;ownerId:string;createdAt:string}[]; webhookReceipts?:{keyId:string;externalId:string;hash:string;clientId:string}[]; appointments:Appointment[]; audit:AuditEvent[]; serviceFields:CustomField[]; schemas:{clients:FieldSchema;visits:FieldSchema}; reminderDismissals:{appointmentId:string;userId:string;until:number}[]; importBatches:{hash:string;at:string;count:number}[]; users: DemoUser[]; sessions: { hash: string; userId: string; expiresAt: number }[]; clients: ClientRecord[]; visits: ServiceVisit[]; fields: CustomField[]; serviceTypes: ServiceType[]; settingsRevision: number }
export const DEMO_ACCOUNTS = { admin: { email: "admin@hackleaf.demo", password: "DemoAdmin!2026" }, staff: { email: "staff@hackleaf.demo", password: "DemoStaff!2026" } } as const;
export const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Phoenix",year:"numeric",month:"2-digit",day:"2-digit" }).format(new Date());
const date = z.iso.date().refine(value => value <= today(), "Choose today or an earlier date.");
export const clientInput = z.object({ name: z.string().trim().min(1).max(200),dateOfBirth:date,
  email: z.union([z.literal(""),z.email().max(254)]),phone:z.string().trim().max(30).refine(v=>!v || /^[+\d() .-]{5,30}$/.test(v),"Enter a valid phone number."),
  demographics:z.record(z.string(),z.string().trim().max(200)),
}).strict().refine(value=>!!(value.email || value.phone), "Provide a phone number or email address.");
export const visitInput = z.object({ clientId:z.uuid(),date,serviceTypeId:z.string().min(1).max(100),notes:z.string().trim().max(2000) }).strict();
export function validateDemographics(values: Record<string,string>, fields: CustomField[]) {
  const result: Record<string,string> = {};
  for (const field of fields.filter(f=>f.active)) {
    const value=values[field.id]?.trim() ?? "";
    if (value && field.type==="number" && (!/^\d{1,6}$/.test(value))) throw new Error(`${field.label} must be a nonnegative whole number.`);
    if (value && field.type==="select" && !field.options.includes(value)) throw new Error(`Choose a listed ${field.label.toLowerCase()}.`);
    result[field.id]=value;
  }
  if(Object.keys(values).some(key=>!fields.some(f=>f.id===key && f.active))) throw new Error("The configured fields changed. Refresh the form.");
  return result;
}
export function canManage(role: DemoRole) { return role === "admin"; }
export function chronologicalVisits(visits: ServiceVisit[], clientId: string) { return visits.filter(v=>v.clientId===clientId).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id)); }

export function fieldSchema(fields:CustomField[]):FieldSchema {
  return {$schema:"https://json-schema.org/draft/2020-12/schema",type:"object",additionalProperties:false,properties:Object.fromEntries(fields.map(f=>[f.id,{type:"string" as const,title:f.label,maxLength:200,deprecated:!f.active,"x-inputType":f.type,...(f.type==="select"?{enum:["",...f.options]}:f.type==="number"?{pattern:"^$|^[0-9]{1,6}$"}:{})}]))};
}
