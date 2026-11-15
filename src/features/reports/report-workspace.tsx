"use client";

import { useState, type FormEvent } from "react";
import { demoDate, demoDonors, demoGifts } from "@/lib/demo/data";
import { formatMoney } from "@/lib/domain/rules";
import { adaptEvidence } from "./evidence";
import { assemblePacket } from "./packet";
import styles from "./reports.module.css";
import { useAssistantWorkspace } from "@/features/assistant/workspace-context";
import type { Donor } from "@/lib/domain/types";

const demoNow = new Date(`${demoDate}T12:00:00-07:00`);
const feed = adaptEvidence(null, demoNow);

export function ReportWorkspace() {
  const workspace=useAssistantWorkspace(),funders=(workspace?.relationships.donors??demoDonors).filter(d=>d.kind!=="individual");
  if(!funders.length)return <section><h1>Funder packets</h1><p>No funder relationships are assigned to your account.</p></section>;
  return <ReportBuilder key={funders.map(f=>f.id).join(':')} funders={funders}/>;
}
function ReportBuilder({funders}:{funders:Donor[]}) {
  const [selection, setSelection] = useState({ donorId: funders[0].id, start: "2026-01-01", end: demoDate });
  const [packet, setPacket] = useState(() => assemblePacket(funders[0], demoGifts, selection.start, selection.end, feed, demoNow));
  const [error, setError] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [message, setMessage] = useState("");
  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const donor = funders.find((item) => item.id === selection.donorId);
      if (!donor) throw new Error("Choose a funder.");
      setPacket(assemblePacket(donor, demoGifts, selection.start, selection.end, feed, demoNow));
      setReviewed(false); setError(""); setMessage("Packet preview updated. Review it before printing.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to prepare packet."); }
  }
  const changed = packet.donor.id !== selection.donorId || packet.start !== selection.start || packet.end !== selection.end;
  return <div className={styles.workspace}>
    <header className={`page-heading ${styles.heading}`}><div><h1>A renewal starts with evidence.</h1><p>Review gifts, program designations and evidence gaps before sharing.</p></div></header>
    <div className={styles.controls}>
      <p className={styles.notice}>Fictional demo · No live donor data or verified outcomes are connected. Printing includes this disclosure. Live donor access is not available yet.</p>
      <form onSubmit={prepare} className={styles.form}>
        <label>Funder<select aria-label="Funder" value={selection.donorId} onChange={(event) => { setSelection({ ...selection, donorId: event.target.value }); setReviewed(false); }}>
          {funders.map((funder) => <option key={funder.id} value={funder.id}>{funder.name}</option>)}
        </select></label>
        <label>Reporting start<input type="date" required value={selection.start} onChange={(event) => { setSelection({ ...selection, start: event.target.value }); setReviewed(false); }} /></label>
        <label>Reporting end<input type="date" required value={selection.end} onChange={(event) => { setSelection({ ...selection, end: event.target.value }); setReviewed(false); }} /></label>
        <button className="button" type="submit">Prepare packet preview</button>
      </form>
      {error && <p role="alert">{error}</p>}
      {changed && <p>Selection changed. Prepare a new preview before printing.</p>}
      <label className={styles.review}><input type="checkbox" checked={reviewed} disabled={changed} onChange={(event) => setReviewed(event.target.checked)} />I reviewed the gifts, reporting window, attribution and missing evidence.</label>
      <button className="button" disabled={!reviewed || changed} onClick={() => { setMessage("Print dialog opened. Choose Save as PDF to export; nothing is shared automatically."); window.print(); }}>Print / save PDF</button>
      <p role="status">{message}</p>
    </div>
    <article className={styles.packet} aria-label="Funder packet preview">
      <p className={styles.notice}><strong>FICTIONAL DEMO PACKET · Not a record of CIC funding or impact.</strong></p>
      <h2>{packet.donor.name}</h2><p>Reporting window: {packet.start}–{packet.end}, inclusive · America/Phoenix</p><p>Prepared as of {demoDate} · Currency: USD</p>
      <section><h3>Giving and program designations</h3><p>Total selected gifts: <strong>{formatMoney(packet.totalCents)}</strong> · {packet.gifts.length} gift(s)</p>
        {!packet.gifts.length ? <p>No gifts for this funder in the selected window. This does not establish a funding or outcome relationship.</p> : <div className={styles.table}><table>
          <caption>Fictional gift records with source provenance</caption><thead><tr><th>Date / amount</th><th>Program designation</th><th>Source / record</th></tr></thead>
          <tbody>{packet.gifts.map((gift) => <tr key={gift.id}><td>{gift.receivedOn}<br />{formatMoney(gift.amountCents)}</td><td>{gift.programId}</td><td>{gift.source}<br />{gift.sourceRecordId}<br /><small>Gift ID: {gift.id}</small></td></tr>)}</tbody>
        </table></div>}
      </section>
      <section><h3>Verified aggregate outcome evidence</h3><p>{feed.note}</p>
        {!packet.evidence.length && <p><strong>Outcomes unavailable for this packet. No impact totals are asserted.</strong></p>}
        {packet.evidence.map((item) => <div key={item.id} className={styles.evidence}>
          <h4>{item.metric}: {item.value} {item.unit}</h4><p>Program: {item.programId} · Period: {item.periodStart}–{item.periodEnd}</p>
          <p>Source: <a href={item.sourceUrl} rel="noreferrer">{item.sourceUrl}</a></p><p>Verified: {item.verifiedAt} · Evidence ID: {item.id}</p>
          {packet.staleIds.includes(item.id) && <p><strong>Stale verification — older than the provisional 90-day threshold; reconfirm with CIC.</strong></p>}
          <p>Source attribution note: {item.attributionNote}</p>
        </div>)}
      </section>
      <section><h3>Missing data and attribution limits</h3>
        <ul className={styles.list}>
          {packet.missing.map((programId) => <li key={programId}>No current, verified evidence wholly within this reporting window for {programId}.</li>)}
          <li>Funder-to-outcome attribution has not been confirmed by CIC. Gift program designations indicate recorded support; they do not prove that these gifts caused an outcome.</li>
          <li>No learning gains, dollars-per-student ratios or causal impact claims are calculated.</li>
          <li>Evidence that only overlaps the reporting window is excluded rather than prorated. Excluded evidence records: {packet.excludedEvidence}.</li>
          <li>Source integration: {feed.status}. No student records or contact details are included.</li>
        </ul>
      </section>
    </article>
  </div>;
}
