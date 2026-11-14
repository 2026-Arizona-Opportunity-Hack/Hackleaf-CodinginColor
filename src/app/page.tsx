import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { TaskList } from "@/components/task-list";
import { demoCommunications, demoDonors, demoFollowUps, donorGiving } from "@/lib/demo/data";
import { classifyRetention, formatMoney } from "@/lib/domain/rules";
import { isDemoWorkspace } from "@/lib/workspace";

export default function OverviewPage() {
  if (!isDemoWorkspace()) return null;
  const giving = demoDonors.reduce((sum, d) => sum + donorGiving(d.id, 2026), 0);
  const lapsed = demoDonors.filter((d) => classifyRetention(donorGiving(d.id, 2025), donorGiving(d.id, 2026)) === "lapsed").length;
  return <>
    <PageHeading title="Every relationship, cared for." description="Know who needs a thank-you, a check-in, or a next step."
      action={<Link href="/donors" className="button">View donors</Link>} />
    <dl className="metric-strip">{[[demoDonors.length, "Donor relationships"], [formatMoney(giving), "Giving in 2026"], [demoFollowUps.length, "Open next steps"], [lapsed, "Lapsed donors"]].map(([value, label]) =>
      <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <div className="overview-columns"><div><section aria-labelledby="conversations-title"><div className="section-heading"><h2 id="conversations-title">Your next conversations</h2><Link href="/follow-ups">View all</Link></div>
      <TaskList tasks={demoFollowUps} /></section>
      <section className="recent-activity" aria-labelledby="activity-title"><h2 id="activity-title">Recent activity</h2><ul className="activity-list">
        <li><span>Jordan Ellis gave $250 to AI Academy</span><time dateTime="2026-11-12">Nov 12</time></li>
        <li><span>{demoCommunications[0].summary}</span><time dateTime="2026-11-11">Nov 11</time></li>
      </ul></section></div>
      <aside className="impact-aside"><h2>From gift to impact</h2><div className="impact-path"><ol>{["Gift received", "Relationship owned", "Next step dated", "Outcome documented"].map((step) => <li key={step}>{step}</li>)}</ol><p>Keep the evidence with the relationship.</p></div>
        <h3>Quarterly care</h3><p>Updates stay drafts until a person reviews and sends them.</p></aside></div>
  </>;
}
