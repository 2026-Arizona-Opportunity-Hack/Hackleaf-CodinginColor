"use client";

import { useState } from "react";

const CHANNELS = ["email", "sms", "meeting", "phone"] as const;
type Channel = typeof CHANNELS[number];

interface LoggedEntry { channel: Channel; summary: string; date: string }

export function LogCommunicationForm({ donorName }: { donorName: string }) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<Channel>("email");
  const [summary, setSummary] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [entries, setEntries] = useState<LoggedEntry[]>([]);
  const [saved, setSaved] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!summary.trim()) return;
    setEntries([{ channel, summary: summary.trim(), date }, ...entries]);
    setSaved(`${channel} logged for ${donorName} on ${date}.`);
    setSummary("");
    setOpen(false);
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

      {saved && <p role="status" aria-live="polite">{saved}</p>}

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
          <button type="submit">Save</button>
          <button type="button" onClick={() => setOpen(false)}>Cancel</button>
        </form>
      ) : (
        <button type="button" onClick={() => setOpen(true)}>
          Log outreach with {donorName}
        </button>
      )}

      <p><small>Demo mode: entries are saved in this browser session only. Live persistence requires the authenticated communication API.</small></p>
    </section>
  );
}
