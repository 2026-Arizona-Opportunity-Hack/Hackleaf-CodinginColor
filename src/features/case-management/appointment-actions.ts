"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireDemoUser } from "@/features/demo-auth/session";
import { mutateDemoData } from "./store";
import { appointmentInput,validateSlot } from "./appointments";
import { appointmentStart } from "./dates";
import { auditSummary,recordAudit,changedAuditFields } from "./audit";
import type { ActionState } from "./actions";
export async function appointmentAction(_previous:ActionState,form:FormData):Promise<ActionState>{
  const actor=await requireDemoUser();
  try{
    await mutateDemoData(data=>{
      const op=z.enum(["save","cancel","complete","delete","snooze"]).parse(form.get("op")),id=String(form.get("id")??"");
      const old=id?data.appointments.find(a=>a.id===id):undefined;
      if(id&&!old)throw new Error("Appointment not found.");
      if(old&&actor.role!=="admin"&&old.staffId!==actor.id)throw new Error("You can manage only appointments assigned to you.");
      const before=auditSummary(data,"appointment",id);let affectedId=id,changedFields:string[]=[];
      if(op==="save"){
        if(old&&(old.revision!==Number(form.get("revision"))||old.status!=="scheduled"))throw new Error("This appointment changed. Refresh before editing.");
        const input=appointmentInput.parse({clientId:form.get("clientId"),date:form.get("date"),time:form.get("time"),durationMinutes:form.get("durationMinutes"),serviceTypeId:form.get("serviceTypeId"),staffId:form.get("staffId"),notes:form.get("notes")??""});
        if(actor.role!=="admin"&&input.staffId!==actor.id)throw new Error("Staff can schedule only their own appointments.");
        const staff=data.users.find(u=>u.id===input.staffId&&u.active),client=data.clients.find(c=>c.id===input.clientId&&c.active),type=data.serviceTypes.find(t=>t.id===input.serviceTypeId&&(t.active||old?.serviceTypeId===t.id));
        if(!staff||!client||!type)throw new Error("Choose an active client, staff member and service type.");
        const appointment={...input,id:old?.id??randomUUID(),staffName:staff.name,serviceTypeLabel:type.label,status:"scheduled" as const,revision:(old?.revision??0)+1,createdAt:old?.createdAt??new Date().toISOString()};
        validateSlot(appointment,data.appointments,Date.now(),old);
        if(old)data.appointments[data.appointments.indexOf(old)]=appointment;else data.appointments.push(appointment);
        data.reminderDismissals=data.reminderDismissals.filter(r=>r.appointmentId!==appointment.id);
        affectedId=appointment.id;changedFields=changedAuditFields(old,appointment);
      }else{
        if(!old)throw new Error("Appointment not found.");
        if(op==="snooze"){
          if(old.staffId!==actor.id||old.status!=="scheduled")throw new Error("Only your upcoming reminders can be dismissed.");
          data.reminderDismissals=data.reminderDismissals.filter(r=>r.userId!==actor.id||r.appointmentId!==id);data.reminderDismissals.push({appointmentId:id,userId:actor.id,until:Date.now()+3600000});
        }else{
          if(old.revision!==Number(form.get("revision")))throw new Error("This appointment changed. Refresh before updating.");
          if(op==="delete"){
            if(actor.role!=="admin")throw new Error("Only Admin can delete appointments.");
            data.appointments=data.appointments.filter(a=>a.id!==id);changedFields=["records"];
          }else{
            if(old.status!=="scheduled")throw new Error("This appointment is no longer scheduled.");
            if(op==="complete"&&appointmentStart(old)>Date.now())throw new Error("An appointment cannot be completed before its start time.");
            old.status=op==="complete"?"completed":"cancelled";old.revision++;changedFields=["status"];
          }
          data.reminderDismissals=data.reminderDismissals.filter(r=>r.appointmentId!==id);
        }
      }
      recordAudit(data,actor,op==="save"?(id?"appointment.update":"appointment.create"):`appointment.${op}`,"appointment",before,auditSummary(data,"appointment",affectedId),changedFields);
    });
    revalidatePath("/appointments");revalidatePath("/dashboard");revalidatePath("/audit");revalidatePath("/clients","layout");return {error:"",message:form.get("op")==="snooze"?"Reminder dismissed for one hour.":"Appointment saved in the local demo."};
  }catch(error){return {error:error instanceof z.ZodError?error.issues[0].message:error instanceof Error?error.message:"Appointment could not be saved.",message:""};}
}
