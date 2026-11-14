"use client";

import { useState } from "react";
import { demoDonors } from "@/lib/demo/data";

const THANK_YOU_TEMPLATE = (name: string) =>
  `Dear ${name},\n\nThank you so much for your generous support of Coding in Color. Your contribution directly funds our programs and makes a real difference for the students we serve.\n\nWe will share a program update with you shortly.\n\nWith gratitude,\nCoding in Color`;

type DraftState = "draft" | "approved";

interface Draft {
  donorId: string;
  donorName: string;
  channel: "email" | "sms";
  subject: string;
  body: string;
  state: DraftState;
  createdAt: string;
}

export function OutreachDraftForm() {
  const [donorId, setDonorId] = useState(demoDonors[0].id);
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [subject, setSubject] = useState("Thank you for your support of Coding in Color");
  const [body, setBody] = useState(() => THANK_YOU_TEMPLATE(demoDonors[0].name));
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [open, setOpen] = useState(false);

  function handleDonorChange(id: string) {
    setDonorId(id);
    const name = demoDonors.find((d) => d.id === id)?.name ?? "";
    setBody(THANK_YOU_TEMPLATE(name));
  }

  function saveDraft(e: React.FormEvent) {
    e.preventDefault();
    const donor = demoDonors.find((d) => d.id === donorId);
    if (!donor) return;
    setDrafts([
      {
        donorId,
        donorName: donor.name,
        channel,
        subject: channel === "email" ? subject : "",
        body: body.trim(),
        state: "draft",
        createdAt: new Date().toISOString(),
      },
      ...drafts,
    ]);
    setOpen(false);
  }

  function approve(idx: number) {
    setDrafts(drafts.map((d, i) => i === idx ? { ...d, state: "approved" } : d));
  }

  return (
    <section>
      <h2>Outreach drafts</h2>

      {drafts.length > 0 && (
        <ul className="simple-list">
          {drafts.map((d, i) => (
            <li key={i}>
              <strong>{d.donorName}</strong> · {d.channel}
              {" · "}
              <span>{d.state === "approved" ? "✓ approved" : "draft"}</span>
              {d.channel === "email" && d.subject && <p><em>{d.subject}</em></p>}
              <p>{d.body.slice(0, 100)}{d.body.length > 100 ? "…" : ""}</p>
              {d.state === "draft" && (
                <button type="button" onClick={() => approve(i)}>Mark approved</button>
              )}
              {d.state === "approved" && (
                <p><small>Approved · a human must still send this from their own mail client. This app does not send messages.</small></p>
              )}
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <form className="filters" onSubmit={saveDraft} aria-label="New outreach draft">
          <label>
            Donor
            <select value={donorId} onChange={(e) => handleDonorChange(e.target.value)}>
              {demoDonors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <label>
            Channel
            <select value={channel} onChange={(e) => setChannel(e.target.value as "email" | "sms")}>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
            </select>
          </label>
          {channel === "email" && (
            <label>
              Subject
              <input
                type="text"
                value={subject}
                maxLength={200}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>
          )}
          <label>
            Body
            <textarea
              value={body}
              rows={8}
              maxLength={2000}
              required
              onChange={(e) => setBody(e.target.value)}
              style={{ width: "100%", fontFamily: "inherit" }}
            />
          </label>
          <button type="submit">Save draft</button>
          <button type="button" onClick={() => setOpen(false)}>Cancel</button>
        </form>
      ) : (
        <button type="button" onClick={() => setOpen(true)}>New thank-you draft</button>
      )}

      <p><small>Drafts are saved in this browser session. Approval marks a draft ready for a human to send — this app never delivers messages on your behalf.</small></p>
    </section>
  );
}
