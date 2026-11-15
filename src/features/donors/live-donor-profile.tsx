import { z } from "zod";
import { getLiveStaff } from "@/lib/supabase/member";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeading } from "@/components/page-heading";
import { formatDate, formatMoney } from "@/lib/domain/rules";
import { fetchLiveDonor } from "./donor-repository";
import { LogCommunicationForm } from "./log-communication-form";
import { FundingChart } from "./funding-chart";

export async function LiveDonorProfile({ id }: { id: string }) {
  const access=await getLiveStaff();
  if(access.status!=="authorized")return <section className="setup-state"><h1>Staff access required.</h1><p>An active staff membership is required to view live donor records.</p><Link href={access.status==="signed_out"?"/auth/sign-in":"/dashboard"}>{access.status==="signed_out"?"Staff sign-in":"Return to dashboard"}</Link></section>;
  const donor = z.uuid().safeParse(id).success?await fetchLiveDonor(id):null;
  if (!donor) notFound();

  const events = [
    ...donor.gifts.map((g) => ({
      id: g.id,
      date: g.receivedOn,
      title: `${formatMoney(g.amountCents)} gift`,
      detail: `${g.programId} · ${g.source}`,
    })),
    ...donor.communications.map((c) => ({
      id: c.id,
      date: c.occurredAt.slice(0, 10),
      title: c.summary,
      detail: `${c.channel} · logged`,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <Link href="/donors">← Back to donors</Link>
      <PageHeading title={donor.name} description="The relationship, the history, and what comes next." />
      <dl className="detail-grid">
        <div><dt>Type</dt><dd style={{ textTransform: "capitalize" }}>{donor.kind}</dd></div>
        <div><dt>Board-member owner</dt><dd>{donor.ownerName}</dd></div>
        <div><dt>Email</dt><dd>{donor.email ?? "Not provided"}</dd></div>
        <div><dt>Total giving</dt><dd>{formatMoney(donor.totalCents)}</dd></div>
        <div><dt>Giving sources</dt><dd>{donor.sources.join(", ") || "None recorded"}</dd></div>
      </dl>
      <FundingChart gifts={donor.funding} scope="This donor's recorded gifts"/>

      <section className="recent-activity">
        <h2>Relationship timeline</h2>
        {events.length === 0 ? (
          <p>No gifts or communications recorded yet.</p>
        ) : (
          <ul className="simple-list">
            {events.map((event) => (
              <li key={event.id}>
                <time dateTime={event.date}>{formatDate(event.date)}, {event.date.slice(0, 4)}</time>
                <p><strong>{event.title}</strong></p>
                <p>{event.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <LogCommunicationForm donorId={donor.id} donorName={donor.name} />
    </>
  );
}
