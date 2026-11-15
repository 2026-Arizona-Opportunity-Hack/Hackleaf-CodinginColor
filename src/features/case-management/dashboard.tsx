import { StaffEmailStatus } from "@/features/reports/staff-email-status";
import { DashboardSummaryPanel } from "./dashboard-summary-panel";
import { summaryFacts,factualBrief } from "./dashboard-summary";
import { dashboardAIEnabled } from "./dashboard-summary-ai";
import Link from "next/link";
import { AppointmentReminders } from "./reminders";
import { requireDemoUser } from "@/features/demo-auth/session";
import { readDemoData } from "./store";
import { today } from "./model";
import { dashboardMetrics,DASHBOARD_PERIODS } from "./dashboard-metrics";
import { DashboardAnalytics,FundingOverview } from "./dashboard-analytics";
import styles from "./dashboard.module.css";
import { isDemoWorkspace } from "@/lib/workspace";
import { loadRequestFunding } from "@/features/donation-requests/live-repository";
import { LiveFundingOverview } from "./live-funding-overview";
export async function ClientDashboard(){
 const demo=isDemoWorkspace(),liveFunding=demo?null:await loadRequestFunding().catch(()=>null);
 const user=await requireDemoUser(),data=await readDemoData(),asOf=today(),now=new Date().getTime(),periods=DASHBOARD_PERIODS.map(days=>dashboardMetrics(data,asOf,days,now));
 const date=new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(`${asOf}T12:00:00Z`));
 const recent=[...data.visits].filter(v=>v.date<=asOf).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt)).slice(0,5);
 return <div className={styles.dashboard}><header className={styles.hero}><div><span className={styles.eyebrow}>Your organization, in focus</span><h1>{`Welcome, ${user.name}.`}</h1><p>A clearer picture of the people you serve, the work you do, and what comes next.</p><p style={{fontSize:11,marginTop:16}}>{date} · America/Phoenix · {user.role==='admin'?'Admin':'Staff'} workspace</p></div><div className={styles.heroActions}><Link className={styles.primary} href="/clients/new">＋ Register client</Link><Link className={styles.secondary} href="/client-reports">View reports ↗</Link></div></header>
 <DashboardSummaryPanel initial={factualBrief(summaryFacts(data,'today',asOf),dashboardAIEnabled()?'Ready for AI highlights. Choose a period or select Summarize with AI.':undefined)} aiEnabled={dashboardAIEnabled()}/>
 <StaffEmailStatus data={data}/>
 <DashboardAnalytics periods={periods}/>
 <div className={styles.equalGrid}>{demo?<FundingOverview/>:<LiveFundingOverview funding={liveFunding}/>}<section className={styles.panel}><header className={styles.panelHead}><div><h2>Latest service records</h2><p className={styles.caption}>The five most recent retained service entries</p></div><Link href="/clients">All clients ↗</Link></header><ol className={styles.recentList}>{recent.map(v=>{const client=data.clients.find(c=>c.id===v.clientId),name=client?.name??'Unavailable client';return <li key={v.id}><span className={styles.avatar} aria-hidden="true">{name.split(' ').map(s=>s[0]).slice(0,2).join('')}</span><div><Link href={`/clients/${v.clientId}`}>{name}</Link><p>{v.serviceTypeLabel} · {v.staffName}</p></div><time dateTime={v.date}>{v.date}</time></li>;})}</ol>{!recent.length&&<p className={styles.caption}>Your first service entry will appear here.</p>}<div className={styles.shortcuts}><Link href="/clients">Client directory →</Link><Link href="/appointments">Team calendar →</Link><Link href="/client-funder-reports">Funder templates →</Link>{user.role==='admin'&&<Link href="/client-settings">Workspace settings →</Link>}</div></section></div>
 <div className={styles.reminders}><AppointmentReminders data={data} userId={user.id}/></div>
 <p className={styles.footer}>{demo?"Fictional demo records · Client analytics use this organization’s local saved data. SQL is disabled. Funding is a separate browser-memory simulation and resets on reload.":"Live workspace · Client analytics use saved Supabase records. Request funding uses recorded receipts and allocations."} Charts describe recorded activity, not independently verified outcomes.</p></div>;
}
