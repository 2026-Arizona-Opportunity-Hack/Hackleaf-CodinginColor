import Link from "next/link";
import { z } from "zod";
import { getLiveStaff } from "@/lib/supabase/member";
import { PageHeading } from "@/components/page-heading";
import { formatMoney } from "@/lib/domain/rules";
import { fetchLiveDonor } from "./donor-repository";

export async function LiveDonorProfile({ id }: { id: string }) {
  const access = await getLiveStaff();
  if (access.status !== "authorized") return <section className="setup-state"><h1>Staff access required.</h1><p>An approved active staff membership is required to view donor records.</p><Link href={access.status === "signed_out" ? "/auth/sign-in" : "/dashboard"}>{access.status === "signed_out" ? "Staff sign-in" : "Return to dashboard"}</Link></section>;
  const donor = z.uuid().safeParse(id).success ? await fetchLiveDonor(id) : null;
  if (!donor) return <section className="setup-state"><h1>Donor record unavailable.</h1><p>The record could not be loaded for your account. It may not exist, may be outside your access, or the database query may have failed.</p><Link href="/donors">Back to donors</Link></section>;
  return <><Link href="/donors">Back to donors</Link><PageHeading title={donor.name} description="Live giving history and communication records authorized for your account." />
    <dl className="detail-grid"><div><dt>Owner</dt><dd>{donor.ownerName}</dd></div><div><dt>Email</dt><dd>{donor.email ?? "Not provided"}</dd></div><div><dt>Total giving · USD</dt><dd>{formatMoney(donor.totalCents)}</dd></div></dl>
    <h2>Giving history</h2>{donor.gifts.length ? <div className="table-scroll"><table><caption>Recorded gifts from the live database</caption><thead><tr><th>Date</th><th>Amount · USD</th><th>Program</th><th>Source</th></tr></thead><tbody>{donor.gifts.map((gift) => <tr key={gift.id}><td>{gift.receivedOn}</td><td>{formatMoney(gift.amountCents)}</td><td>{gift.programId}</td><td>{gift.source}</td></tr>)}</tbody></table></div> : <p>No gifts recorded.</p>}
    <section className="recent-activity"><h2>Communication history</h2>{donor.communications.length ? <ul className="simple-list">{donor.communications.map((communication) => <li key={communication.id}><time dateTime={communication.occurredAt}>{communication.occurredAt}</time><p>{communication.channel} · {communication.summary}</p></li>)}</ul> : <p>No communications recorded.</p>}</section>
  </>;
}
