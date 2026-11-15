import { DocumentPanel } from "@/features/client-p2/document-panel";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/page-heading";
import { requireDemoUser } from "@/features/demo-auth/session";
import { readDemoData } from "@/features/case-management/store";
import { chronologicalVisits,today } from "@/features/case-management/model";
import { ClientForm,DeleteRecord,VisitForm } from "@/features/case-management/forms";
import styles from "@/features/case-management/case.module.css";
export default async function ClientProfile({params}:{params:Promise<{id:string}>}) {
  const user=await requireDemoUser(),data=await readDemoData(),{id}=await params,asOf=today();
  if(id==="new")return <><PageHeading title="Register a client." description="Add contact details and the demographics your team uses."/><ClientForm fields={data.fields} maxDate={asOf}/><Link href="/clients">Back to clients</Link></>;
  const client=data.clients.find(c=>c.id===id);if(!client)notFound();
  const visits=chronologicalVisits(data.visits,client.id);
  return <><Link href="/clients">← All clients</Link><PageHeading title={client.name} description="Client demographics and chronological service history."/><code className={styles.id}>Client ID: {client.id}</code>
    <dl className={styles.demographics}><div><dt>Status</dt><dd>{client.active?"Active":"Inactive"}</dd></div><div><dt>Date of birth</dt><dd>{client.dateOfBirth}</dd></div><div><dt>Email</dt><dd>{client.email||"Not provided"}</dd></div><div><dt>Phone</dt><dd>{client.phone||"Not provided"}</dd></div>{data.fields.filter(f=>f.active).map(f=><div key={f.id}><dt>{f.label}</dt><dd>{client.demographics[f.id]||"Not provided"}</dd></div>)}</dl>
    {user.role==="admin" && <details className={styles.section}><summary>Edit client details</summary><ClientForm client={client} fields={data.fields} maxDate={asOf}/><DeleteRecord kind="client" id={client.id}/></details>}
    <DocumentPanel clientId={client.id} documents={(data.documents??[]).filter(d=>d.clientId===client.id)} admin={user.role==="admin"}/><section className={styles.section}><h2>Log a service</h2><VisitForm fields={data.serviceFields} maxDate={asOf} clientId={client.id} types={data.serviceTypes} staffName={user.name}/></section>
    <section className={styles.section}><h2>Service history ({visits.length})</h2><p className={styles.note}>Most recent service first. Staff names reflect the account that recorded each entry.</p>{visits.length?<ol className={styles.history} aria-label="Service history">{visits.map(visit=><li key={visit.id}><article className={styles.card} aria-label={`Service entry ${visit.id}`}><header><h3>{visit.serviceTypeLabel}</h3><time dateTime={visit.date}>{visit.date}</time></header><p>Recorded by <strong>{visit.staffName}</strong></p><p>{visit.notes||"No notes recorded."}</p><dl className={styles.demographics}>{data.serviceFields.filter(f=>f.active&&visit.customFields[f.id]).map(f=><div key={f.id}><dt>{f.label}</dt><dd>{visit.customFields[f.id]}</dd></div>)}</dl>{user.role==="admin" && <details><summary>Edit or delete service entry</summary><VisitForm fields={data.serviceFields} maxDate={asOf} clientId={client.id} types={data.serviceTypes} staffName={user.name} visit={visit}/><DeleteRecord kind="visit" id={visit.id}/></details>}</article></li>)}</ol>:<p>No service entries yet. Add the first one above.</p>}</section>
  </>;
}
