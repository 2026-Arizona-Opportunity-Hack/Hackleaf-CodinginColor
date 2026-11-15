import Link from "next/link";
import { upcomingReminders } from "./appointments";
import { appointmentStart } from "./dates";
import { AppointmentCommand,ReminderRefresh } from "./appointment-forms";
import type { DemoData } from "./model";
import styles from "./case.module.css";
export function AppointmentReminders({data,userId}:{data:DemoData;userId:string}){
  const reminders=upcomingReminders(data,userId);
  return <section className={styles.section} aria-label="Appointment reminders"><ReminderRefresh/><h2>Your appointment reminders ({reminders.length})</h2><p className={styles.note}>Assigned appointments in the next 24 hours, plus overdue appointments from the last 24 hours. Updates every minute while this page is visible.</p>{reminders.length?<ul className={styles.history}>{reminders.map(a=><li key={a.id}><article className={styles.card} aria-label={`Appointment reminder ${a.id}`}><span className={styles.badge}>{appointmentStart(a)<new Date().getTime()?"Overdue":"Upcoming"}</span><h3>{data.clients.find(c=>c.id===a.clientId)?.name??"Client"}</h3><p>{a.serviceTypeLabel} · {a.date} at {a.time} Phoenix</p><div className={styles.actions}><Link href={`/appointments?date=${a.date}&view=day`}>Open appointment</Link><AppointmentCommand appointment={a} op="snooze"/></div></article></li>)}</ul>:<p>No upcoming reminders assigned to you in this window.</p>}</section>;
}
