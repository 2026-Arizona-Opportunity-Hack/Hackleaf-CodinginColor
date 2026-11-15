import Link from "next/link";
import { requireDemoUser } from "@/features/demo-auth/session";
import { readDemoData } from "@/features/case-management/store";
import { FieldForm,RemoveSetting,ServiceTypeForm } from "@/features/case-management/forms";
import { PageHeading } from "@/components/page-heading";
import styles from "@/features/case-management/case.module.css";
export default async function ClientSettings(){
  const user=await requireDemoUser();if(user.role!=="admin")return <section><h1>Admin access required.</h1><p>Staff can read clients and create client/service records. Only Admin can change demographic fields and service types.</p><Link href="/clients">View clients</Link></section>;
  const data=await readDemoData();
  return <><PageHeading title="Make the records fit your work." description="Configure 3–5 demographic fields and the service types staff can log. No code changes needed."/>
    <p className={styles.note}>Removing a field hides it from new forms; existing stored values remain in the local demo. Retiring a service type preserves historical visit labels.</p>
    <section className={styles.section}><h2>Demographic fields ({data.fields.filter(f=>f.active).length}/5)</h2>{data.fields.filter(f=>f.active).map(field=><details key={field.id}><summary>{field.label} · {field.type}</summary><FieldForm field={field} revision={data.settingsRevision}/><RemoveSetting kind="field" id={field.id} revision={data.settingsRevision}/></details>)}<details><summary>Add demographic field</summary><FieldForm revision={data.settingsRevision}/></details></section>
    <section className={styles.section}><h2>Service-log custom fields ({data.serviceFields.filter(f=>f.active).length}/8)</h2>{data.serviceFields.filter(f=>f.active).map(field=><details key={field.id}><summary>{field.label} · {field.type}</summary><FieldForm field={field} scope="visit" revision={data.settingsRevision}/><RemoveSetting kind="field" scope="visit" id={field.id} revision={data.settingsRevision}/></details>)}<details><summary>Add service-log field</summary><FieldForm scope="visit" revision={data.settingsRevision}/></details></section>
    <section className={styles.section}><h2>Service types</h2>{data.serviceTypes.filter(t=>t.active).map(type=><details key={type.id}><summary>{type.label}</summary><ServiceTypeForm type={type} revision={data.settingsRevision}/><RemoveSetting kind="service" id={type.id} revision={data.settingsRevision}/></details>)}<details><summary>Add service type</summary><ServiceTypeForm revision={data.settingsRevision}/></details></section>
    <details className={styles.section}><summary>Advanced: JSON field schemas</summary><p><a href="/api/clients/export?kind=schema">Download field schemas</a></p><pre>{JSON.stringify(data.schemas,null,2)}</pre></details>
  </>;
}
