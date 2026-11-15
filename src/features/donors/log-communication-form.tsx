"use client";

import { useState } from "react";

const CHANNELS = ["email", "sms", "meeting", "phone"] as const;
type Channel = typeof CHANNELS[number];

interface LoggedEntry { channel: Channel; summary: string; date: string }

const isLiveMode = !!(typeof process !== "undefined" && process.env.NEXT_PUBLIC_SUPABASE_URL);

export function LogCommunicationForm({ donorId, donorName }: { donorId: string; donorName: string }) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<Channel>("email");
  const [summary, setSummary] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [entries, setEntries] = useState<LoggedEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!summary.trim()) return;
    setSaving(true);
    setStatus(null);

    if (isLiveMode) {
      const res = await fetch(`/api/donors/${donorId}/communications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, summary: summary.trim(), occurredAt: `${date}T12:00:00` }),
      });
      if (!res.ok) {
        const data = await res.json();
        setStatus(`Error: ${data.error ?? "Could not save."}`);
        setSaving(false);
        return;
      }
    }

    setEntries([{ channel, summary: summary.trim(), date }, ...entries]);
    setStatus(`${channel} logged for ${donorName} on ${date}.`);
    setSummary("");
    setOpen(false);
    setSaving(false);
  }

  return (
    <section>
      <h2>Log outreach</h2>

      {entries.length > 0 && (
        <ul className="simple-list">
          {entries.map((e, i) => (
            <li key={i}>
              <time dateTime={e.date}>{e.date}</time>
              {" — "}
              <strong>{e.channel}</strong>: {e.summary}
            </li>
          ))}
        </ul>
      )}

      {status && <p role="status" aria-live="polite">{status}</p>}

      {open ? (
        <form className="filters" onSubmit={submit} aria-label="Log outreach">
          <label>
            Channel
            <select value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
              {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label>
            Date
            <input type="date" value={date} required onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            Summary
            <input
              type="text"
              value={summary}
              required
              maxLength={500}
              placeholder="What happened in this conversation?"
              onChange={(e) => setSummary(e.target.value)}
            />
          </label>
          <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          <button type="button" onClick={() => setOpen(false)}>Cancel</button>
        </form>
      ) : (
        <button type="button" onClick={() => setOpen(true)}>
          Log outreach with {donorName}
        </button>
      )}

      {!isLiveMode && (
        <p><small>Demo mode: entries are saved in this browser session only.</small></p>
      )}
    </section>
  );
}
