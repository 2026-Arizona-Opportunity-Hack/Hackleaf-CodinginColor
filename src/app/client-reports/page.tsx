import { z } from "zod";
import { PageHeading } from "@/components/page-heading";
import { requireDemoUser } from "@/features/demo-auth/session";
import { readDemoData } from "@/features/case-management/store";
import { today } from "@/features/case-management/model";
import { monthYear,reportingMonths } from "@/features/reports/report-period";
import { reportData } from "@/features/case-management/reporting";
import { ReportCharts } from "@/features/case-management/report-charts";
import { PrintReportButton } from "@/features/case-management/print-button";
import styles from "@/features/case-management/case.module.css";
export default async function ClientReports({searchParams}:{searchParams:Promise<{start?:string;end?:string}>}){
  await requireDemoUser();const data=await readDemoData(),params=await searchParams,asOf=today();let report,error="";const start=(params.start??asOf).slice(0,7),end=(params.end??asOf).slice(0,7);
  try{const window=reportingMonths(start,end,asOf);report=reportData(data,asOf,window.start,window.end);}catch(e){error=e instanceof z.ZodError?"Use valid reporting months.":e instanceof Error?e.message:"The report could not load.";}
  return <section className={styles.report}><PageHeading title="Client service report." description="Understand how many people are active and how your team's services change over time." action={<PrintReportButton/>}/><p className={styles.note}>Fictional demo records · Generated {monthYear(asOf)} · Operational timezone: America/Phoenix · Week starts Monday</p>
    <form className={styles.search} action="/client-reports"><label><span>Report start month</span><input type="month" name="start" defaultValue={start} max={asOf.slice(0,7)}/></label><label><span>Report end month</span><input type="month" name="end" defaultValue={end} max={asOf.slice(0,7)}/></label><button className="button">Update report</button></form>
    {error&&<p role="alert" className={styles.error}>{error}</p>}{report&&<><dl className="metric-strip"><div><dt>Active clients</dt><dd>{report.activeClients}</dd></div><div><dt>Services this week</dt><dd>{report.week}</dd></div><div><dt>Services this month</dt><dd>{report.month}</dd></div><div><dt>Services this quarter</dt><dd>{report.quarter}</dd></div></dl><h2>{report.selectedCount} services · {monthYear(start)}{start!==end?` – ${monthYear(end)}`:""}</h2><ReportCharts data={report}/></>}
  </section>;
}
