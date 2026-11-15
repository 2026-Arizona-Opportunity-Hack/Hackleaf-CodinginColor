import { z } from "zod";
import { PageHeading } from "@/components/page-heading";
import { requireDemoUser } from "@/features/demo-auth/session";
import { readDemoData } from "@/features/case-management/store";
import { today } from "@/features/case-management/model";
import { addDays } from "@/features/case-management/dates";
import { reportData } from "@/features/case-management/reporting";
import { ReportCharts } from "@/features/case-management/report-charts";
import { PrintReportButton } from "@/features/case-management/print-button";
import styles from "@/features/case-management/case.module.css";
export default async function ClientReports({searchParams}:{searchParams:Promise<{start?:string;end?:string}>}){
  await requireDemoUser();const data=await readDemoData(),params=await searchParams,asOf=today();let report,error="",start=params.start??addDays(asOf,-29),end=params.end??asOf;
  try{start=z.iso.date().parse(start);end=z.iso.date().parse(end);if(end<start||end>asOf)throw new Error("Choose a valid range ending today or earlier.");report=reportData(data,asOf,start,end);}catch(e){error=e instanceof z.ZodError?"Use valid reporting dates.":e instanceof Error?e.message:"The report could not load.";}
  return <section className={styles.report}><PageHeading title="Client service report." description="Understand how many people are active and how your team's services change over time." action={<PrintReportButton/>}/><p className={styles.note}>Fictional demo records · Generated {asOf} · Operational timezone: America/Phoenix · Week starts Monday</p>
    <form className={styles.search} action="/client-reports"><label><span>Report start</span><input type="date" name="start" defaultValue={start} max={asOf}/></label><label><span>Report end</span><input type="date" name="end" defaultValue={end} max={asOf}/></label><button className="button">Update report</button></form>
    {error&&<p role="alert" className={styles.error}>{error}</p>}{report&&<><dl className="metric-strip"><div><dt>Active clients</dt><dd>{report.activeClients}</dd></div><div><dt>Services this week</dt><dd>{report.week}</dd></div><div><dt>Services this month</dt><dd>{report.month}</dd></div><div><dt>Services this quarter</dt><dd>{report.quarter}</dd></div></dl><h2>{report.selectedCount} services · {start} to {end}</h2><ReportCharts data={report}/></>}
  </section>;
}
