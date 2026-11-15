"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/page-heading";
import { TaskList } from "@/components/task-list";
import { demoCommunications, demoDonors, demoFollowUps, demoGifts, demoMembers } from "@/lib/demo/data";
import { formatDate, formatMoney } from "@/lib/domain/rules";
import { LogCommunicationForm } from "./log-communication-form";
import { FundingChart } from "./funding-chart";
import { useAssistantWorkspace } from "@/features/assistant/workspace-context";

export function DonorProfile({ id }: { id: string }) {
  const workspace = useAssistantWorkspace();
  const donors = workspace?.relationships.donors ?? demoDonors;
  const gifts = workspace?.relationships.gifts ?? demoGifts;
  const communications = workspace?.relationships.communications ?? demoCommunications;
  const tasks = workspace?.relationships.tasks ?? demoFollowUps;
  const donor = donors.find((d) => d.id === id);
  if (!donor) notFound();
  const events = [
    ...gifts.filter((g) => g.donorId === id).map((g) => ({ id: g.id, date: g.receivedOn, title: `${formatMoney(g.amountCents)} gift`, detail: `${g.programId} · ${g.source} · ${g.sourceRecordId}` })),
    ...communications.filter((c) => c.donorId === id).map((c) => ({ id: c.id, date: c.occurredAt.slice(0, 10), title: c.summary, detail: `${c.channel} · Manually logged outreach` })),
  ].sort((a, b) => b.date.localeCompare(a.date));
  return <><Link href="/donors">Back to donors</Link><PageHeading title={donor.name} description="The relationship, the history, and what comes next." />
    <dl className="detail-grid"><div><dt>Board-member owner</dt><dd>{demoMembers.find((m) => m.id === donor.ownerId)?.name}</dd></div><div><dt>Email · fictional</dt><dd>{donor.email ?? "Not provided"}</dd></div><div><dt>Giving sources</dt><dd>{donor.sources.join(", ")}</dd></div></dl>
    <FundingChart gifts={gifts.filter(g=>g.donorId===id)} scope="This fictional donor's recorded gifts"/><section><h2>Next steps</h2>{tasks.some((t) => t.donorId === id) ? <TaskList tasks={tasks.filter((t) => t.donorId === id)} /> : <p>No next step has been recorded for this fictional relationship.</p>}</section>
    <section className="recent-activity"><h2>Relationship timeline</h2><ul className="simple-list">{events.map((event) => <li key={event.id}><time dateTime={event.date}>{formatDate(event.date)}, {event.date.slice(0, 4)}</time><p><strong>{event.title}</strong></p><p>{event.detail}</p></li>)}</ul>{events.length === 0 ? <p>No gifts or communications recorded yet.</p> : null}</section>
    <LogCommunicationForm donorId={donor.id} donorName={donor.name} />
  </>;
}
