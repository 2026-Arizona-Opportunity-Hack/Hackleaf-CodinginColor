import { z } from "zod";
import { appointmentStart } from "./dates";
import type { Appointment,DemoData } from "./model";
export const appointmentInput=z.object({clientId:z.uuid(),date:z.iso.date(),time:z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/,"Enter a valid time."),durationMinutes:z.coerce.number().int().min(15).max(240),serviceTypeId:z.string().min(1).max(100),staffId:z.uuid(),notes:z.string().trim().max(1000)}).strict();
export function validateSlot(candidate:Appointment,appointments:Appointment[],now=Date.now(),old?:Appointment){
  const start=appointmentStart(candidate),end=start+candidate.durationMinutes*60000;
  if(!Number.isFinite(start)||(!old||start!==appointmentStart(old))&&start<now)throw new Error("Choose a future appointment date and time.");
  const conflict=appointments.some(a=>a.id!==candidate.id&&a.status==="scheduled"&&(a.staffId===candidate.staffId||a.clientId===candidate.clientId)&&start<appointmentStart(a)+a.durationMinutes*60000&&end>appointmentStart(a));
  if(conflict)throw new Error("That staff member or client already has an overlapping appointment.");
}
export function upcomingReminders(data:DemoData,userId:string,now=Date.now()){
  return data.appointments.filter(a=>a.staffId===userId&&a.status==="scheduled"&&appointmentStart(a)>=now-86400000&&appointmentStart(a)<=now+86400000&&!data.reminderDismissals.some(r=>r.userId===userId&&r.appointmentId===a.id&&r.until>now)).sort((a,b)=>appointmentStart(a)-appointmentStart(b));
}
