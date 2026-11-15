"use client";

import { useState } from "react";
import { demoCommunications, demoDate, demoDonors, demoMembers } from "@/lib/demo/data";
import { approveDraft, contactProblem, editDraft, hasQuarterlyTouch, logExternal, newDraft, quarterWindow, type ContactPolicy, type DemoDraft, type ExternalLog } from "./outreach";
import styles from "./workspace.module.css";
import { useAssistantWorkspace } from "@/features/assistant/workspace-context";

function download(draft: DemoDraft) {
  const blob = new Blob([`FICTIONAL DEMO — reviewed copy, not sent\nTo: ${draft.recipient}\nChannel: email\nSubject: ${draft.subject}\n\n${draft.body}`], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = `demo-outreach-${draft.donorId}.txt`; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function OutreachWorkspace() {
  const workspace = useAssistantWorkspace();
  const communications = workspace?.relationships.communications ?? demoCommunications;
  // Deliberately fictional permission scenarios; never infer consent from a gift.
  const contacts = (workspace?.relationships.donors ?? demoDonors).map((donor, index) => ({ donor: index === 3 ? { ...donor, email: null } : donor,
    policy: (index === 2 ? "opted_out" : index === 4 ? "unknown" : "allowed") as ContactPolicy }));
  const [selected, setSelected] = useState(demoDonors[0].id);
  const [localDrafts, setLocalDrafts] = useState<DemoDraft[]>([]);
  const drafts: DemoDraft[] = workspace ? workspace.relationships.drafts.map((draft) => ({ ...draft, recipient: (workspace.relationships.donors.find((d) => d.id === draft.donorId)?.email ?? ""), purpose: draft.subject?.toLowerCase().includes("thank") ? "thank_you" : "quarterly" })) : localDrafts;
  const [logs, setLogs] = useState<ExternalLog[]>([]);
  const [purpose, setPurpose] = useState<DemoDraft["purpose"]>("quarterly");
  const [reviewed, setReviewed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [occurredOn, setOccurredOn] = useState(demoDate);
  const [result, setResult] = useState<ExternalLog["result"]>("manual_log");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const contact = contacts.find((item) => item.donor.id === selected)!;
  const draft = drafts.filter((item) => item.donorId === selected).at(-1);
  const logged = logs.some((item) => item.draftId === draft?.id && item.result === "manual_log");
  const problem = contactProblem(contact.donor, contact.policy);
  const quarter = quarterWindow(demoDate);
  function update(next: DemoDraft) {
    if (workspace) {
      const { recipient: _recipient, purpose: _purpose, ...base } = next;
      void _recipient; void _purpose;
      workspace.setRelationships((current) => ({ ...current, drafts: current.drafts.some((item) => item.id === base.id) ? current.drafts.map((item) => item.id === base.id ? base : item) : [...current.drafts, base] }));
    } else setLocalDrafts((current) => current.some((item) => item.id === next.id) ? current.map((item) => item.id === next.id ? next : item) : [...current, next]);
  }
  function act(action: () => void) { try { action(); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update demo outreach."); } }
  const covered = contacts.filter(({ donor }) => hasQuarterlyTouch(donor.id, demoDate, communications, logs)).length;

  return <section className={styles.stack} aria-label="Quarterly outreach">
    <h2>Quarterly outreach and review</h2>
    <p>Quarter: {quarter.start}–{quarter.end} · {covered} of {contacts.length} donors have a recorded touch through {demoDate}.</p>
    <p className={styles.notice}>Fictional demo · Permission scenarios are invented for testing. Provisional coverage counts dated communication records and successful manual logs; CIC must confirm its touch policy. Gifts, tasks, drafts, downloads and failed attempts do not count. No delivery provider is connected.</p>
    <details><summary>View donor coverage and contact restrictions</summary><ul>{contacts.map(({ donor, policy }) => <li className={styles.card} key={donor.id}>
      <strong>{donor.name}</strong><span>{hasQuarterlyTouch(donor.id, demoDate, communications, logs) ? "Recorded touch this quarter" : "Needs quarterly touch"} · {contactProblem(donor, policy) ?? "Fictional email permission supplied"}</span>
    </li>)}</ul></details>
    <div className={styles.form}>
      <label>Outreach donor<select value={selected} onChange={(event) => { setSelected(event.target.value); setReviewed(false); setConfirmed(false); setError(""); setMessage(""); }}>
        {contacts.map(({ donor }) => <option value={donor.id} key={donor.id}>{donor.name}</option>)}
      </select></label>
      <label>Draft template<select value={purpose} onChange={(event) => setPurpose(event.target.value as DemoDraft["purpose"])}><option value="quarterly">Quarterly update</option><option value="thank_you">Thank you</option></select></label>
      {problem && <p>{problem}</p>}
      <button disabled={!!problem || (!!draft && !logged)} onClick={() => act(() => { update(newDraft(contact.donor, contact.policy, purpose, crypto.randomUUID())); setReviewed(false); setConfirmed(false); setMessage("Editable demo template created. Replace the placeholder before review."); })}>Create demo draft</button>
      {draft && <>
        <h3>Review {draft.purpose === "quarterly" ? "quarterly update" : "thank you"}</h3>
        <p>Recipient: {draft.recipient} · Channel: email</p>
        <p>Owner/reviewer: {demoMembers.find((member) => member.id === contact.donor.ownerId)?.name} (fictional role; no sign-in)</p>
        <p>State: {logged ? "Manually logged externally — no provider confirmation" : draft.state === "approved" ? "Approved — not sent" : "Draft — not approved or sent"}</p>
        <label>Subject<input value={draft.subject ?? ""} maxLength={200} disabled={logged} onChange={(event) => { update(editDraft(draft, { subject: event.target.value, body: draft.body })); setReviewed(false); setConfirmed(false); }} /></label>
        <label>Message body<textarea value={draft.body} maxLength={10000} disabled={logged} onChange={(event) => { update(editDraft(draft, { subject: draft.subject, body: event.target.value })); setReviewed(false); setConfirmed(false); }} /></label>
        <label><input type="checkbox" checked={reviewed} disabled={logged || draft.state === "approved"} onChange={(event) => setReviewed(event.target.checked)} />I reviewed this recipient, email channel and complete message.</label>
        <button disabled={!reviewed || draft.state !== "draft" || logged || !!problem} onClick={() => act(() => { update(approveDraft(draft, contact.donor, contact.policy, reviewed, contact.donor.ownerId, `${demoDate}T12:00:00-07:00`)); setMessage("Demo version approved. Any edit requires a new review. Nothing was sent."); })}>Approve demo version</button>
        <button disabled={draft.state !== "approved"} onClick={() => { download(draft); setMessage("Reviewed copy downloaded. Nothing was sent or counted as a touch."); }}>Download reviewed copy</button>
        <fieldset disabled={draft.state !== "approved" || logged}>
          <legend>Separately log an external attempt</legend>
          <label>External attempt date<input type="date" value={occurredOn} max={demoDate} min={draft.approvedAt?.slice(0, 10)} onChange={(event) => { setOccurredOn(event.target.value); setConfirmed(false); }} /></label>
          <label>External attempt result<select value={result} onChange={(event) => { setResult(event.target.value as ExternalLog["result"]); setConfirmed(false); }}><option value="manual_log">Human confirms completed outreach</option><option value="failed">Attempt failed — no completed touch</option></select></label>
          <label><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I confirm this fictional attempt happened outside Hackleaf with the selected result.</label>
          <button disabled={!confirmed} onClick={() => act(() => { const log = logExternal(draft, logs, { occurredOn, result, confirmed }, demoDate, crypto.randomUUID()); setLogs((current) => [...current, log]); setConfirmed(false); setMessage(result === "failed" ? "Failed external attempt recorded. Coverage did not change." : "Manual external outreach recorded. This is a human report, not provider-confirmed delivery."); })}>Record external attempt</button>
        </fieldset>
      </>}
      {error && <p role="alert" className={styles.error}>{error}</p>}<p role="status">{message}</p>
    </div>
    <section><h3>Outreach history</h3><ul>
      {communications.map((item) => <li className={styles.card} key={item.id}>{item.summary} · Manually logged · {item.occurredAt} · {item.channel}</li>)}
      {drafts.map((item) => <li className={styles.card} key={item.id}>{demoDonors.find((donor) => donor.id === item.donorId)?.name} · {item.state === "approved" ? `Version approved ${item.approvedAt}; not proof of delivery` : "Draft; not sent"} · {item.channel} · {item.recipient}</li>)}
      {logs.map((item) => <li className={styles.card} key={item.id}>{demoDonors.find((donor) => donor.id === item.donorId)?.name} · {item.occurredOn} · {item.result === "failed" ? "Failed external attempt; no completed touch" : "Manually logged external outreach; no provider confirmation"}</li>)}
    </ul></section>
  </section>;
}
