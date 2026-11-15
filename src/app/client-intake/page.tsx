import styles from "@/features/client-p2/p2.module.css";
import { requireDemoUser } from "@/features/demo-auth/session";
import { readDemoData } from "@/features/case-management/store";
import { today } from "@/features/case-management/model";
import { IntakeWorkspace } from "@/features/client-p2/intake-workspace";
export default async function IntakePage(){await requireDemoUser();const data=await readDemoData();return <section className={styles.page}><h1>Photo intake.</h1><p>Read a form using local Tesseract OCR, then review and correct the proposed client record. Images stay on this server; no external AI service is used. Use fictional demo forms.</p><p><a href="/intake-example.png" download>Download fictional sample intake form</a></p><IntakeWorkspace fields={data.fields} maxDate={today()}/></section>;}
