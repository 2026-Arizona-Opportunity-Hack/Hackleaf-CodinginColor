"use client";
import { useActionState,useEffect } from "react";
import { useRouter } from "next/navigation";
import { appointmentAction } from "./appointment-actions";
import type { Appointment,ClientRecord,ServiceType } from "./model";
import styles from "./case.module.css";
export function ReminderRefresh(){const router=useRouter();useEffect(()=>{const timer=window.setInterval(()=>{if(document.visibilityState==="visible")router.refresh();},60000);return()=>window.clearInterval(timer);},[router]);return null;}
export function AppointmentForm({appointment,clients,types,users,actorId,admin,minDate,defaultDate,defaultTime}:{appointment?:Appointment;clients:Pick<ClientRecord,"id"|"name"|"active">[];types:ServiceType[];users:{id:string;name:string}[];actorId:string;admin:boolean;minDate:string;defaultDate:string;defaultTime:string}){
  const [state,action,pending]=useActionState(appointmentAction,{error:"",message:""});
  return <form action={action} className={styles.form} aria-label={appointment?`Edit appointment ${appointment.id}`:"Schedule appointment"}><fieldset className={styles.grid} disabled={pending}>
    <input type="hidden" name="op" value="save"/>{appointment&&<><input type="hidden" name="id" value={appointment.id}/><input type="hidden" name="revision" value={appointment.revision}/></>}
    <label>Client *<select name="clientId" required defaultValue={appointment?.clientId}>{clients.filter(c=>c.active||c.id===appointment?.clientId).map(c=><option key={c.id} value={c.id}>{c.name}{c.active?"":" (inactive)"}</option>)}</select></label>
    <label>Service type *<select name="serviceTypeId" required defaultValue={appointment?.serviceTypeId}>{types.filter(t=>t.active||t.id===appointment?.serviceTypeId).map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select></label>
    <label>Appointment date *<input name="date" type="date" required min={appointment?.date&&appointment.date<minDate?appointment.date:minDate} defaultValue={appointment?.date??defaultDate}/></label><label>Start time (Phoenix) *<input name="time" type="time" required defaultValue={appointment?.time??defaultTime}/></label>
    <label>Duration (minutes) *<input name="durationMinutes" type="number" required min={15} max={240} step={15} defaultValue={appointment?.durationMinutes??30}/></label>
    <label>Assigned staff *<select name="staffId" defaultValue={appointment?.staffId??actorId}>{users.filter(u=>admin||u.id===actorId).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
    <label className={styles.wide}>Appointment notes<textarea name="notes" rows={2} maxLength={1000} defaultValue={appointment?.notes} aria-label="Appointment notes"/></label>
    <div className={`${styles.actions} ${styles.wide}`}><button className="button" disabled={pending}>{pending?"Saving…":appointment?"Save appointment changes":"Schedule appointment"}</button></div>
  </fieldset>{state.error&&<p role="alert" className={styles.error}>{state.error}</p>}{state.message&&<p role="status" className={styles.success}>{state.message}</p>}</form>;
}
export function AppointmentCommand({appointment,op}:{appointment:Pick<Appointment,"id"|"revision">;op:"cancel"|"complete"|"delete"|"snooze"}){
  const [state,action,pending]=useActionState(appointmentAction,{error:"",message:""});
  return <form action={action} onSubmit={event=>{if(op==="delete"&&!window.confirm("Delete this fictional appointment?"))event.preventDefault();}}><input type="hidden" name="op" value={op}/><input type="hidden" name="id" value={appointment.id}/><input type="hidden" name="revision" value={appointment.revision}/><button className={`button ${op==="delete"?styles.danger:""}`} disabled={pending}>{pending?"Saving…":op==="snooze"?"Dismiss for 1 hour":op==="cancel"?"Cancel appointment":op==="complete"?"Mark completed":"Delete appointment"}</button>{state.error&&<p role="alert" className={styles.error}>{state.error}</p>}{state.message&&<p role="status" className={styles.success}>{state.message}</p>}</form>;
}
