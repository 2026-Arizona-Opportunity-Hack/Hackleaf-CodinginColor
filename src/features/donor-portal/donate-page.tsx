"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ZodError } from "zod";
import { demoDate } from "@/lib/demo/data";
import type { Gift } from "@/lib/domain/types";
import { formatMoney } from "@/lib/domain/rules";
import { allocateDonations, type Allocation } from "@/features/donation-requests/allocation";
import { frequencies, sources } from "@/features/donation-requests/requests";
import { useDemoWorkspace } from "./demo-workspace";
import { parseDonation, type GiftDetails } from "./model";
import { DonorGate, PortalFrame } from "./portal-frame";
import styles from "./portal.module.css";

interface Review { gift: Gift; details: GiftDetails; allocations: Allocation[] }
function DonationForm() {
  const demo = useDemoWorkspace();
  const profile = demo.profiles.find((item) => item.id === demo.currentId)!;
  const [amount, setAmount] = useState("20");
  const [formDraft, setFormDraft] = useState<ReturnType<typeof parseDonation> | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  function prepare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    try {
      const value = parseDonation({ ...Object.fromEntries(fields), is_anonymous: fields.has("is_anonymous") });
      setFormDraft(value);
      const id = `donor-demo-${crypto.randomUUID()}`;
      const gift: Gift = { id, donorId: profile.id, amountCents: value.amountCents, currency: value.currency, programId: value.programId, source: value.source, sourceRecordId: id, receivedOn: demoDate };
      setReview({ gift, details: { giftId: id, donorId: profile.id, frequency: value.frequency, note: value.note, is_anonymous: value.is_anonymous }, allocations: allocateDonations(demo.giving.requests, [...demo.giving.gifts, gift], demo.giving.allocations) });
      setError(""); setMessage("");
    } catch (cause) { setError(cause instanceof ZodError ? cause.issues[0].message : cause instanceof Error ? cause.message : "Check the donation fields."); }
  }
  function confirm() {
    if (!review) return;
    try {
      const gifts = [...demo.giving.gifts, review.gift];
      const allocations = allocateDonations(demo.giving.requests, gifts, demo.giving.allocations);
      demo.setGiving({ ...demo.giving, gifts, allocations });
      demo.setGiftDetails([...demo.giftDetails, review.details]);
      setReview(null); setMessage("Demo contribution added to your history and the NGO funding queue. No payment was collected.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The demo contribution could not be recorded."); }
  }
  const splits = review?.allocations.filter((item) => item.giftId === review.gift.id) ?? [];
  const allocated = splits.reduce((sum, item) => sum + item.amountCents, 0);
  return <div className={styles.entryGrid}><aside className={styles.intro}><h2>Choose your contribution.</h2><p>Your simulated donation automatically follows the NGO’s unique priority order.</p><p>Any amount that cannot yet reach an eligible request stays unallocated.</p><Link href="/donor-portal/history">View my donation history →</Link></aside>
    {!review ? <form className={styles.form} onSubmit={prepare}><h2>Donation details</h2>
      <div className={styles.quickAmounts} role="group" aria-label="Suggested donation amounts">{[20, 50, 100].map((value) => <button type="button" key={value} aria-pressed={amount === String(value)} onClick={() => setAmount(String(value))}>${value}</button>)}</div>
      <div className={styles.twoColumns}><label>Donation amount *<input name="amount" type="number" required min="0.01" step="0.01" max="999999999.99" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label>Currency<select name="currency"><option value="USD">USD</option></select></label></div>
      <label>Giving frequency<select name="frequency" defaultValue={formDraft?.frequency ?? "one_time"}>{Object.entries(frequencies).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <p className={styles.muted}>Monthly/annual selections record a preference only. No recurring payment is scheduled.</p>
      <label>Preferred giving channel<select name="source" defaultValue={formDraft?.source ?? "zeffy"}>{sources.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}</select></label>
      <label>Donation note (optional)<textarea name="note" defaultValue={formDraft?.note} rows={3} maxLength={500} placeholder="Anything you would like the NGO to know about this support." /></label>
      <label className={styles.checkbox}><input type="checkbox" name="is_anonymous" defaultChecked={formDraft?.is_anonymous ?? profile.is_anonymous} />Show this contribution as Anonymous in the NGO demo.</label>
      {error && <p className={styles.error} role="alert">{error}</p>}<button className={styles.primary}>Review donation</button><p role="status">{message}</p>
    </form> : <section className={styles.form} aria-label="Donation review"><h2>Review your demo donation</h2><p className={styles.amount}>{formatMoney(review.gift.amountCents)} USD</p>
      <dl className={styles.details}><div><dt>Funding order</dt><dd>NGO priority order</dd></div><div><dt>Frequency preference</dt><dd>{frequencies[review.details.frequency]}</dd></div><div><dt>NGO display name</dt><dd>{review.details.is_anonymous ? "Anonymous" : "Your donor name"}</dd></div></dl>
      <h3>Where this contribution goes</h3><ul className={styles.allocations}>{splits.map((item) => { const request = demo.giving.requests.find((request) => request.id === item.requestId)!; return <li key={item.requestId}><strong>Priority {request.priority} · {request.campaign}</strong><span>{formatMoney(item.amountCents)}</span></li>; })}</ul>
      <p>Allocated: {formatMoney(allocated)} · Unallocated: {formatMoney(review.gift.amountCents - allocated)}</p>
      <p className={styles.muted}>This confirms a simulation only. No money is transferred, no email is sent and no tax receipt is issued.</p>
      {error && <p className={styles.error} role="alert">{error}</p>}<div className={styles.actions}><button className={styles.primary} onClick={confirm}>Confirm demo donation</button><button className={styles.secondary} onClick={() => { setReview(null); setError(""); }}>Edit donation</button></div>
    </section>}
  </div>;
}
export function DonatePage() { return <PortalFrame title="Make a donation" description="Choose an amount, review its allocation and explore the difference it can make."><DonorGate><DonationForm /></DonorGate></PortalFrame>; }
