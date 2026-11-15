import Link from "next/link";
import { z } from "zod";
import { PageHeading } from "@/components/page-heading";
import { requireDemoUser } from "@/features/demo-auth/session";
import { readDemoData } from "@/features/case-management/store";
import { today } from "@/features/case-management/model";
import { addDays,weekStart,appointmentStart,phoenixParts } from "@/features/case-management/dates";
import { AppointmentForm,AppointmentCommand,ReminderRefresh } from "@/features/case-management/appointment-forms";
import styles from "@/features/case-management/case.module.css";
export default async function AppointmentsPage({searchParams}:{searchParams:Promise<{date?:string;view?:string}>}){
  const actor=await requireDemoUser(),data=await readDemoData(),params=await searchParams,asOf=today();
  const selected=z.iso.date().safeParse(params.date),date=selected.success?selected.data:asOf,view=params.view==="day"?"day":"week",start=view==="day"?date:weekStart(date),days=Array.from({length:view==="day"?1:7},(_,i)=>addDays(start,i));
  const visible=data.appointments.filter(a=>a.date>=days[0]&&a.date<=days.at(-1)!).sort((a,b)=>appointmentStart(a)-appointmentStart(b));
  const defaults=phoenixParts(new Date(new Date().getTime()+3600000)),users=data.users.filter(u=>u.active).map(({id,name})=>({id,name})),clients=data.clients.map(({id,name,active})=>({id,name,active}));
  const formProps={clients,users,types:data.serviceTypes,actorId:actor.id,admin:actor.role==="admin",minDate:asOf,defaultDate:defaults.date,defaultTime:defaults.time};
  return <><ReminderRefresh/><PageHeading title="Keep the next visit on the calendar." description="Schedule future client appointments and manage your team's week. Times use America/Phoenix."/>
    <div className={styles.actions}><Link className="button" href={`/appointments?date=${asOf}&view=day`}>Today</Link><Link className="button" href={`/appointments?date=${asOf}&view=week`}>This week</Link><Link href={`/appointments?date=${addDays(date,view==="day"?-1:-7)}&view=${view}`}>← Previous</Link><Link href={`/appointments?date=${addDays(date,view==="day"?1:7)}&view=${view}`}>Next →</Link></div>
    <form className={styles.search} action="/appointments"><label><span>Calendar date</span><input type="date" name="date" defaultValue={date}/></label><label><span>Calendar view</span><select name="view" defaultValue={view}><option value="day">Day</option><option value="week">Week</option></select></label><button className="button">Show calendar</button></form>
    <section className={styles.calendar} style={view==="day"?{gridTemplateColumns:"1fr"}:undefined} aria-label={`${view} calendar`}>{days.map(day=><section key={day} className={styles.day}><h2><Link href={`/appointments?date=${day}&view=day`}>{new Intl.DateTimeFormat("en-US",{weekday:"short",month:"short",day:"numeric",timeZone:"UTC"}).format(new Date(`${day}T12:00:00Z`))}</Link></h2>{visible.filter(a=>a.date===day).map(a=><article key={a.id} className={styles.card} aria-label={`Appointment ${a.id}`}><span className={styles.badge}>{a.status}</span><h3><Link href={`/clients/${a.clientId}`}>{data.clients.find(c=>c.id===a.clientId)?.name??"Client"}</Link></h3><p><strong>{a.time}</strong> · {a.durationMinutes} min<br/>{a.serviceTypeLabel}<br/>{a.staffName}</p>{a.notes&&<p>{a.notes}</p>}{(actor.role==="admin"||a.staffId===actor.id)&&<>{a.status==="scheduled"&&<><details><summary>Edit appointment</summary><AppointmentForm {...formProps} appointment={a}/></details><div className={styles.actions}><AppointmentCommand appointment={a} op="cancel"/>{appointmentStart(a)<=Date.now()&&<AppointmentCommand appointment={a} op="complete"/>}</div></>}{actor.role==="admin"&&<AppointmentCommand appointment={a} op="delete"/>}</>}</article>)}{!visible.some(a=>a.date===day)&&<p className={styles.note}>No appointments.</p>}</section>)}</section>
    <section className={styles.section}><h2>Schedule an appointment</h2>{clients.some(c=>c.active)?<AppointmentForm {...formProps}/>:<p>Register an active client before scheduling.</p>}</section>
  </>;
}
