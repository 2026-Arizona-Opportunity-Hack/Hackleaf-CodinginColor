"use client";

import Link from "next/link";
import { formatMoney } from "@/lib/domain/rules";
import { programs, sources, frequencies } from "@/features/donation-requests/requests";
import { useDemoWorkspace } from "./demo-workspace";
import { DonorGate, PortalFrame } from "./portal-frame";
import styles from "./portal.module.css";

function History() {
  const demo = useDemoWorkspace();
  const gifts = demo.giving.gifts.filter((gift) => gift.donorId === demo.currentId).reverse().sort((a, b) => b.receivedOn.localeCompare(a.receivedOn));
  const total = gifts.reduce((sum, gift) => sum + gift.amountCents, 0);
  return <><dl className={styles.metrics}><div><dt>My simulated giving</dt><dd>{formatMoney(total)}</dd></div><div><dt>Contributions</dt><dd>{gifts.length}</dd></div><div><dt>Currency</dt><dd>USD</dd></div></dl>
    {!gifts.length ? <div className={styles.empty}><h2>Your history starts with your first contribution.</h2><p>No simulated donations have been recorded for this profile.</p><Link className={styles.primary} href="/donor-portal/donate">Make a donation</Link></div> : <ul className={styles.history}>{gifts.map((gift) => {
      const details = demo.giftDetails.find((item) => item.giftId === gift.id);
      const splits = demo.giving.allocations.filter((item) => item.giftId === gift.id);
      const allocated = splits.reduce((sum, item) => sum + item.amountCents, 0);
      return <li className={styles.historyCard} key={gift.id}><header><div><span className={styles.badge}>Demo simulation</span><h2>{formatMoney(gift.amountCents)}</h2><p><time dateTime={gift.receivedOn}>{gift.receivedOn}</time> · {programs.find((program) => program.id === gift.programId)?.name ?? "General support"}</p></div><span>{sources.find((source) => source.value === gift.source)?.label}</span></header>
        <p>{details ? `${frequencies[details.frequency]} preference · ${details.is_anonymous ? "Anonymous in NGO demo" : "Donor name visible in NGO demo"}` : "Fictional seed contribution · Additional preferences not recorded"}</p>
        {details?.note && <p>{details.note}</p>}<details><summary>View allocation and reference</summary><ul className={styles.allocations}>{splits.map((item, index) => <li key={`${item.requestId}-${index}`}><span>{demo.giving.requests.find((request) => request.id === item.requestId)?.campaign ?? "Unavailable request"}</span><strong>{formatMoney(item.amountCents)}</strong></li>)}</ul>
          <p>Unallocated balance: {formatMoney(gift.amountCents - allocated)}</p><p className={styles.reference}>Demo reference: {gift.sourceRecordId}</p><p className={styles.muted}>Not a payment confirmation or tax receipt.</p></details>
      </li>;
    })}</ul>}
  </>;
}
export function HistoryPage() { return <PortalFrame title="My donation history" description="A clear record of your simulated giving and the requests it supports."><DonorGate><History /></DonorGate></PortalFrame>; }
