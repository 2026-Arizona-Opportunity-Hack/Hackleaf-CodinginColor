import Link from "next/link";
import { liveFunding, type FundingSnapshot } from "@/features/donation-requests/live-contract";
import { formatMoney } from "@/lib/domain/rules";
import styles from "./dashboard.module.css";
export function LiveFundingOverview({ funding }: { funding: FundingSnapshot | null }) {
  if (!funding) return <section className={styles.panel}><h2>Request funding</h2><p>Funding records could not be loaded. Refresh before making funding decisions.</p><Link href="/donation-requests">Open donation requests</Link></section>;
  const active=funding.requests.filter(r=>r.state==="active").sort((a,b)=>a.priority-b.priority);
  const goal=active.reduce((n,r)=>n+r.goal_cents,0),allocated=active.reduce((n,r)=>n+liveFunding(r,funding.allocations).raised,0);
  return <section className={`${styles.panel} ${styles.funding}`}><header className={styles.panelHead}><div><h2>Funding the next possibility</h2><p className={styles.caption}>Saved donation requests and allocated receipts</p></div><Link href="/donation-requests">Manage requests ↗</Link></header>
    <div className={styles.fundingTotal}><strong>{formatMoney(allocated)}</strong><span>allocated of {formatMoney(goal)} requested</span></div>
    <ol className={styles.fundingQueue}>{active.map(r=>{const state=liveFunding(r,funding.allocations);return <li key={r.id}><b>{r.priority}</b><div><p>{r.campaign}</p><div className={styles.track}><span style={{width:`${state.percent}%`}}/></div></div><small>{formatMoney(state.raised)} / {formatMoney(r.goal_cents)}</small></li>;})}</ol>
    {!active.length&&<p>No active donation requests.</p>}<p className={styles.caption}>Unallocated eligible receipts: {formatMoney(funding.unallocated_cents)}. Allocations describe recorded funding, not verified program outcomes.</p>
  </section>;
}
