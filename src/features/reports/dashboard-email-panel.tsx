"use client";

import { useId, useState } from "react";
import type { DashboardBrief } from "@/features/case-management/dashboard-summary";
import { dashboardEmailDraft, emailUpdate, emailAppUrl, emailDraftFile } from "./dashboard-email";
import styles from "./dashboard-email.module.css";

export function DashboardEmailPanel({ brief, disabled }: { brief: DashboardBrief; disabled: boolean }) {
  const id = useId();
  const [draft, setDraft] = useState<ReturnType<typeof dashboardEmailDraft> | null>(null);
  const [to, setTo] = useState(''), [reviewed, setReviewed] = useState(false), [notice, setNotice] = useState('');
  const [source, setSource] = useState('');
  const identity = JSON.stringify(brief);
  const parsed = emailUpdate.safeParse({ to, subject: draft?.subject, body: draft?.body });
  const url = parsed.success ? emailAppUrl(parsed.data) : '';
  const ready = parsed.success && reviewed;
  const longLink = url.length > 1900;
  function changed() { setReviewed(false); setNotice(''); }
  function loadBrief() { setDraft(dashboardEmailDraft(brief)); setSource(identity); changed(); }
  function download() {
    if (!ready || !parsed.success) return;
    const blob = new Blob([emailDraftFile(parsed.data)], { type: 'message/rfc822' });
    const objectUrl = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = objectUrl; link.download = `hackleaf-dashboard-${brief.end}.eml`; link.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    setNotice('Email draft downloaded. Open it in your email app, review, and send there. Nothing has been sent by Hackleaf.');
  }
  return <div className={styles.share}>
    <button type="button" className={styles.trigger} disabled={disabled} aria-expanded={!!draft} aria-controls={`${id}-composer`} onClick={() => { if (draft) setDraft(null); else loadBrief(); }}>{draft ? 'Close email draft' : 'Email update ↗'}</button>
    {draft && <section id={`${id}-composer`} className={styles.composer} aria-label="Email dashboard update">
      <h3>Share an important update</h3>
      <p>Review this aggregate brief and add what matters to your team. Your email app sends the message; Hackleaf has no delivery provider or send tracking.</p>
      {source !== identity && <div role="status">The dashboard period or summary changed. This draft keeps your previous snapshot and edits. <button type="button" disabled={disabled} onClick={loadBrief}>Replace with latest brief</button></div>}
      <label htmlFor={`${id}-to`}>Recipients (up to 5, separated by commas)</label>
      <input id={`${id}-to`} type="email" multiple maxLength={1300} placeholder="colleague@example.org" autoComplete="off" value={to} onChange={e => { setTo(e.target.value); changed(); }} />
      <label htmlFor={`${id}-subject`}>Email subject</label>
      <input id={`${id}-subject`} maxLength={150} value={draft.subject} onChange={e => { setDraft({ ...draft, subject: e.target.value }); changed(); }} />
      <label htmlFor={`${id}-body`}>Important updates</label>
      <textarea id={`${id}-body`} rows={10} maxLength={6000} value={draft.body} onChange={e => { setDraft({ ...draft, body: e.target.value }); changed(); }} />
      <p>Includes fictional aggregate client/service figures only. Avoid adding names, contact details or private case notes.</p>
      {!parsed.success && <p id={`${id}-validation`}>Enter valid recipient emails, a subject, and a message to continue.</p>}
      <label className={styles.review}><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} />I reviewed this message and its recipients.</label>
      {longLink && <p>This message is too long for a reliable email link. Download the email draft instead.</p>}
      <div className={styles.actions}>
        <a href={ready && !longLink ? url : undefined} aria-disabled={!ready || longLink} onClick={e => { if (!ready || longLink) e.preventDefault(); else setNotice('Email app requested. Review and send there. Hackleaf cannot confirm whether it opened or whether the message was sent.'); }}>Open email app ↗</a>
        <button type="button" disabled={!ready} onClick={download}>Download email draft (.eml)</button>
      </div>
      <p role="status">{notice}</p>
    </section>}
  </div>;
}
