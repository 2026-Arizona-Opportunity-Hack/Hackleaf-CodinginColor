import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { requireDemoUser } from "@/features/demo-auth/session";
import { readDemoData } from "@/features/case-management/store";
import styles from "@/features/case-management/case.module.css";
export default async function ClientsPage({searchParams}:{searchParams:Promise<{q?:string}>}) {
  await requireDemoUser();const data=await readDemoData();const q=String((await searchParams).q??"").trim().slice(0,200);
  const clients=data.clients.filter(c=>c.name.toLowerCase().includes(q.toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name));
  return <><PageHeading title="Every client, known and supported." description="Register clients, keep contact and demographic details together, and follow their service history." action={<Link className="button" href="/clients/new">Register client</Link>}/>
    <p className={styles.note}>Local demo · Fictional records only · Client and service changes survive reloads on this server.</p>
    <form className={styles.search} action="/clients"><label><span>Search clients by name</span><input name="q" type="search" maxLength={200} defaultValue={q} placeholder="Search by client name…"/></label><button className="button">Search</button></form>
    <p role="status">{clients.length} {clients.length===1?"client":"clients"} {q?`matching “${q}”`:"registered"}</p>
    {clients.length?<div className="table-scroll"><table><caption>Registered clients</caption><thead><tr><th>Name / unique ID</th><th>Status</th><th>Date of birth</th><th>Contact</th><th>Service entries</th></tr></thead><tbody>{clients.map(c=><tr key={c.id}><td><Link href={`/clients/${c.id}`}>{c.name}</Link><code className={styles.id}>{c.id}</code></td><td>{c.active?"Active":"Inactive"}</td><td>{c.dateOfBirth}</td><td>{c.email||c.phone}</td><td>{data.visits.filter(v=>v.clientId===c.id).length}</td></tr>)}</tbody></table></div>:<section className={styles.card}><h2>No matching clients</h2><p>Try another name or register a new client.</p><Link href="/clients">Clear search</Link></section>}
  </>;
}
