"use server";
import { randomBytes,randomUUID } from "node:crypto";
import { requireDemoUser } from "@/features/demo-auth/session";
import { mutateDemoData } from "@/features/case-management/store";
import { auditSummary,recordAudit } from "@/features/case-management/audit";
import { webhookHash } from "./webhooks";
import { revalidatePath } from "next/cache";
export async function integrationAction(_previous:{error:string;token:string},form:FormData){const actor=await requireDemoUser();if(actor.role!=='admin')return {error:'Admin access required.',token:''};try{let token='';await mutateDemoData(data=>{const before=auditSummary(data,'integration');data.webhookKeys??=[];if(form.get('op')==='create'){if(data.webhookKeys.length>=5)throw new Error('Revoke an existing key first (maximum 5).');token='hl_'+randomBytes(32).toString('hex');data.webhookKeys.push({id:randomUUID(),hash:webhookHash(token),ownerId:actor.id,createdAt:new Date().toISOString()});}else if(form.get('op')==='revoke'){const id=String(form.get('id'));if(!data.webhookKeys.some(k=>k.id===id))throw new Error('Key not found.');data.webhookKeys=data.webhookKeys.filter(k=>k.id!==id);}else throw new Error('Unknown action.');recordAudit(data,actor,form.get('op')==='create'?'integration.create':'integration.delete','integration',before,auditSummary(data,'integration'),['records']);});revalidatePath('/client-integrations');revalidatePath('/audit');return {error:'',token};}catch(e){return {error:e instanceof Error?e.message:'Could not update integration.',token:''};}}
