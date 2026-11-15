"use client";

import Link from "next/link";
import { PageHeading } from "./page-heading";
import { TaskList } from "./task-list";
import { useAssistantWorkspace } from "@/features/assistant/workspace-context";
import { useOptionalDemoWorkspace } from "@/features/donor-portal/demo-workspace";
import { demoCommunications, demoDonors, demoFollowUps, demoGifts } from "@/lib/demo/data";
import { classifyRetention, formatMoney } from "@/lib/domain/rules";

export function OverviewWorkspace() {
  const workspace = useAssistantWorkspace();
  const giving = useOptionalDemoWorkspace();
  const donors = workspace?.relationships.donors ?? demoDonors;
  const gifts = [...new Map([...(workspace?.relationships.gifts ?? demoGifts), ...(giving?.giving.gifts ?? [])].map((gift) => [gift.id, gift])).values()];
  const tasks = (workspace?.relationships.tasks ?? demoFollowUps).filter((task) => task.status === "open");
  const communications = workspace?.relationships.communications ?? demoCommunications;
  const donorTotal = (id: string, year: number) => gifts.filter((gift) => gift.donorId === id && gift.receivedOn.startsWith(String(year))).reduce((sum, gift) => sum + gift.amountCents, 0);
  const total = gifts.filter((gift) => gift.receivedOn.startsWith("2026")).reduce((sum, gift) => sum + gift.amountCents, 0);
  const lapsed = donors.filter((donor) => classifyRetention(donorTotal(donor.id, 2025), donorTotal(donor.id, 2026)) === "lapsed").length;
  return <>
    <PageHeading title="Every relationship, cared for." description="Know who needs a thank-you, a check-in, or a next step." action={<Link href="/donors" className="button">View donors</Link>} />
    <dl className="metric-strip">{[[donors.length, "Donor relationships"], [formatMoney(total), "Giving in 2026"], [tasks.length, "Open next steps"], [lapsed, "Lapsed donors"]].map(([value, label]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <div className="overview-columns"><div><section aria-labelledby="conversations-title"><div className="section-heading"><h2 id="conversations-title">Your next conversations</h2><Link href="/follow-ups">View all</Link></div><TaskList tasks={[...tasks].sort((a, b) => a.dueOn.localeCompare(b.dueOn))} /></section>
      <section className="recent-activity" aria-labelledby="activity-title"><h2 id="activity-title">Recent activity</h2><ul className="activity-list"><li><span>Jordan Ellis gave $250 to AI Academy</span><time dateTime="2026-11-12">Nov 12</time></li>
        {[...communications].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, 3).map((communication) => <li key={communication.id}><span>{communication.summary}</span><time dateTime={communication.occurredAt}>{communication.occurredAt.slice(0, 10)}</time></li>)}
      </ul></section></div><aside className="impact-aside"><h2>From gift to impact</h2><div className="impact-path"><ol>{["Gift received", "Relationship owned", "Next step dated", "Outcome documented"].map((step) => <li key={step}>{step}</li>)}</ol><p>Keep the evidence with the relationship.</p></div><h3>Quarterly care</h3><p>Updates stay drafts until a person reviews and sends them.</p></aside></div>
  </>;
}
