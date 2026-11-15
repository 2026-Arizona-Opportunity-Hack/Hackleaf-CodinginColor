"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ZodError } from "zod";
import { formatMoney } from "@/lib/domain/rules";
import { frequencies, nextAvailablePriority, parseRequest, programs, sources, type DonationRequest } from "./requests";
import { demoDonors } from "@/lib/demo/data";
import type { Gift } from "@/lib/domain/types";
import { type Allocation } from "./allocation";
import { funding as requestFunding } from "./requests";
import styles from "./requests.module.css";

export function RequestDrawer({ title, children, onDismiss }: { title: string; children: ReactNode; onDismiss: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current!; element.showModal(); return () => element.close(); }, []);
  return <dialog ref={dialog} className={styles.drawer} aria-labelledby="request-drawer-title" onCancel={onDismiss} onKeyDown={(event) => {
    if (event.key !== "Tab") return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("button, input, select, textarea, a[href], [tabindex='0']")]
      .filter((element) => !element.matches(":disabled") && element.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }}>
    <header className={styles.drawerHeading}><div><p className={styles.eyebrow}>CODING IN COLOR</p><h2 id="request-drawer-title">{title}</h2></div>
      <button type="button" className={styles.close} aria-label="Close request panel" onClick={onDismiss}>×</button></header>
    {children}
  </dialog>;
}

export function RequestForm({ request, onSave, onDismiss, requests, fundedCents = 0 }: { requests: DonationRequest[]; fundedCents?: number; request?: DonationRequest; onSave: (request: DonationRequest) => void; onDismiss: () => void }) {
  const [note, setNote] = useState(request?.note ?? "");
  const [error, setError] = useState("");
  const alert = useRef<HTMLParagraphElement>(null);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const values = parseRequest({ ...Object.fromEntries(new FormData(event.currentTarget)), priority: request?.priority ?? nextAvailablePriority(requests) });
      if (fundedCents > 0 && request?.program_id !== values.program_id) throw new Error("The program cannot change after donations have been linked.");
      if (values.goalCents < fundedCents) throw new Error("The goal cannot be lower than the amount already allocated.");
      const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
      onSave({ ...values, id: request?.id ?? crypto.randomUUID(), state: submitter?.value === "draft" ? "draft" : "active",
        createdAt: request?.createdAt ?? new Date().toISOString() });
    } catch (cause) {
      setError(cause instanceof ZodError ? cause.issues[0].message : cause instanceof Error ? cause.message : "Check the request fields.");
      requestAnimationFrame(() => alert.current?.focus());
    }
  }
  return <RequestDrawer title={request ? "Edit donation request" : "Make a donation request"} onDismiss={onDismiss}>
    <form onSubmit={submit} className={styles.drawerForm}>
      <div className={styles.formFields}>
        <p className={styles.muted}>Tell your community what you need and the funding that will make it possible.</p>
        <label><span>Donation title <b aria-hidden="true">*</b></span><input name="campaign" required maxLength={120} defaultValue={request?.campaign} placeholder="e.g. Laptops for hands-on learning" /></label>
        <label><span>Program <b aria-hidden="true">*</b></span><select name="program_id" defaultValue={request?.program_id ?? "ai-academy"} aria-describedby={fundedCents > 0 ? "program-help" : undefined}>
          {programs.map((program) => <option key={program.id} value={program.id} disabled={fundedCents > 0 && request?.program_id !== program.id}>{program.name}</option>)}
        </select></label>
        {fundedCents > 0 && <p id="program-help" className={styles.help}>The program is fixed because this request already has linked donations.</p>}
        <div className={styles.fieldRow}>
          <label><span>Amount required <b aria-hidden="true">*</b></span><span className={styles.moneyInput}><span aria-hidden="true">$</span><input name="amount" type="number" min="0.01" max="999999999.99" step="0.01" inputMode="decimal" required defaultValue={request ? (request.goalCents / 100).toFixed(2) : undefined} placeholder="0.00" /></span></label>
          <label>Currency<select name="currency" defaultValue="USD"><option value="USD">USD</option></select></label>
        </div>
        <p className={styles.help}>A monetary funding goal, including requests for supplies or equipment.</p>
        <label>Donation type / frequency<select name="frequency" defaultValue={request?.frequency ?? "one_time"}>
          {Object.entries(frequencies).map(([value, label]) => <option key={value} value={value}>{label} monetary support</option>)}
        </select></label>
        <label>Preferred giving channel<select name="source" defaultValue={request?.source ?? "zeffy"}>
          {sources.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}
        </select></label>
        <label><span>What is the donation for? <b aria-hidden="true">*</b></span><textarea name="note" rows={4} required maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Describe the resources needed and how they will support your program." /></label>
        <span className={styles.counter}>{note.length} / 500</span>
        <p className={styles.help}>Fields marked * are required. Creating a request does not collect a payment.</p>
        {error && <p role="alert" ref={alert} tabIndex={-1} className={styles.error}>{error}</p>}
      </div>
      <footer className={styles.formFooter}><p>Demo workspace · Changes stay on this page and reset on reload.</p>
        <div className={styles.formActions}><button className={styles.primary} name="action" value="active">{request ? "Save changes" : "Create request"}</button>
          {(!request || request.state === "draft") && <button className={styles.secondary} name="action" value="draft">Save as draft</button>}
          <button type="button" className={styles.textButton} onClick={onDismiss}>Cancel</button></div>
      </footer>
    </form>
  </RequestDrawer>;
}

export function RequestDetails({ request, allocations, gifts, onEdit, onDismiss }: { allocations: Allocation[]; gifts: Gift[]; request: DonationRequest; onEdit: () => void; onDismiss: () => void }) {
  const funding = requestFunding(request, allocations);
  const contributionTotals = new Map<string, number>();
  allocations.filter((item) => item.requestId === request.id).forEach((item) => contributionTotals.set(item.giftId, (contributionTotals.get(item.giftId) ?? 0) + item.amountCents));
  const contributions = [...contributionTotals].map(([giftId, amountCents]) => ({ giftId, amountCents, gift: gifts.find((gift) => gift.id === giftId)! }));
  return <RequestDrawer title="Request details" onDismiss={onDismiss}>
    <div className={styles.formFields}><span className={styles.status}>{funding.status}</span><h3>{request.campaign}</h3><p>{request.note}</p>
      <dl className={styles.details}><div><dt>Program</dt><dd>{programs.find((program) => program.id === request.program_id)?.name}</dd></div>
        <div><dt>Funding priority</dt><dd>Priority {request.priority}</dd></div><div><dt>Type</dt><dd>{frequencies[request.frequency]} monetary support</dd></div><div><dt>Giving channel</dt><dd>{sources.find((source) => source.value === request.source)?.label}</dd></div>
        <div><dt>Amount required</dt><dd>{formatMoney(request.goalCents)} USD</dd></div><div><dt>Amount raised</dt><dd>{formatMoney(funding.raisedCents)} USD</dd></div>
        <div><dt>Still needed</dt><dd>{formatMoney(funding.remainingCents)} USD</dd></div></dl>
      <h3>Who donated</h3><p className={styles.muted}>Amounts below show each donor’s contribution allocated to this request. All records are fictional.</p>
      {contributions.length ? <ul className={styles.giftList}>{contributions.map((item, index) => <li key={`${item.giftId}-${index}`}>
        <strong>{demoDonors.find((donor) => donor.id === item.gift.donorId)?.name ?? "Unknown donor"}</strong>
        <span>{formatMoney(item.amountCents)} allocated</span><small>{item.gift.receivedOn} · {sources.find((source) => source.value === item.gift.source)?.label}</small>
        {item.amountCents !== item.gift.amountCents && <small>Part of a {formatMoney(item.gift.amountCents)} donation</small>}
      </li>)}</ul> : <p>No donations received for this request yet.</p>}

    </div><footer className={styles.formFooter}><button className={styles.primary} onClick={onEdit}>Edit request</button></footer>
  </RequestDrawer>;
}
