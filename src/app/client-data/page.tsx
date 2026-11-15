import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { requireDemoUser } from "@/features/demo-auth/session";
import { CsvWorkspace } from "@/features/case-management/csv-workspace";
import styles from "@/features/case-management/case.module.css";
export default async function ClientData(){
  const user=await requireDemoUser();if(user.role!=="admin")return <section><h1>Admin access required.</h1><p>Only Admin can import or export client and service records.</p><Link href="/clients">View clients</Link></section>;
  return <><PageHeading title="Move your records out of spreadsheets." description="Preview client imports, review invalid rows and export client or service records."/><div className={styles.actions}><a className="button" href="/api/clients/export?kind=template">Download CSV template</a><a className="button" href="/api/clients/export?kind=clients">Export all clients</a><a className="button" href="/api/clients/export?kind=services">Export all service logs</a></div><CsvWorkspace/></>;
}
