"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { useOptionalDemoWorkspace } from "@/features/donor-portal/demo-workspace";
import { useAssistantWorkspace } from "./workspace-context";
import { applyDemoAction } from "./demo-state";
import { demoDate } from "@/lib/demo/data";
import { safePath, type Action, type Artifact, type AssistantEvent, type DemoSnapshot, type Proposal } from "./contracts";
import { readAssistantStream } from "./stream";
import { AssistantIcon } from "./icons";
import styles from "./chat.module.css";

type Review = Omit<Proposal, "before"> & { state: "pending" | "applying" | "applied" | "cancelled"; error?: string };
interface Message { id: string; role: "user" | "assistant"; content: string; proposals: Review[]; artifacts: Artifact[]; }
interface Status { ready: boolean; mode?: string; message: string; }
const newMessage = (role: Message["role"], content: string): Message => ({ id: crypto.randomUUID(), role, content, proposals: [], artifacts: [] });
const labels: Record<string, string> = { workspace_overview: "Checking giving and next steps", search_donors: "Finding donor relationships", get_donor: "Reading the donor timeline", list_follow_ups: "Checking next steps", board_workload: "Checking board ownership", list_requests: "Checking the funding queue", my_donor_profile: "Checking your donor demo", prepare_funder_packet: "Assembling a funder packet", preview_import: "Validating the attached CSV", export_data: "Preparing your download", navigate: "Opening the page", platform_help: "Checking how this works" };

function download(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: filename.endsWith(".csv") ? "text/csv;charset=utf-8" : "text/markdown;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ChatPanel({ demo, open, onClose }: { demo: boolean; open: boolean; onClose: () => void }) {
  const pathname = usePathname(), router = useRouter();
  const workspace = useAssistantWorkspace(), donorWorkspace = useOptionalDemoWorkspace();
  const audience = pathname.startsWith("/donor-portal") ? "donor" : "staff";
  const [status, setStatus] = useState<Status | null>(null), [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(""), [busy, setBusy] = useState(false), [progress, setProgress] = useState("");
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [attachment, setAttachment] = useState<{ name: string; csv: string } | null>(null);
  const [importSource, setImportSource] = useState("spreadsheet");
  const textarea = useRef<HTMLTextAreaElement>(null), scroller = useRef<HTMLDivElement>(null), fileInput = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null), applied = useRef(new Set<string>());
  const applying = messages.some((m) => m.proposals.some((p) => p.state === "applying"));

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/assistant/status?path=${encodeURIComponent(pathname)}`, { signal: controller.signal, cache: "no-store" })
      .then((r) => r.json()).then(setStatus).catch((e) => { if (e.name !== "AbortError") setStatus({ ready: false, message: "Couldn’t connect to the assistant. Close and reopen to retry." }); });
    return () => controller.abort();
  }, [pathname]);
  useEffect(() => { if (open) textarea.current?.focus(); }, [open]);
  useEffect(() => { if (scroller.current && messages.length) scroller.current.scrollTop = scroller.current.scrollHeight; }, [messages, busy, progress]);
  useEffect(() => () => abort.current?.abort(), []);

  function snapshot(forRequest = true): DemoSnapshot | null {
    if (!demo || !workspace || !donorWorkspace) return null;
    const profile = donorWorkspace.profiles.find((p) => p.id === donorWorkspace.currentId) ?? null;
    const gifts = [...new Map([...workspace.relationships.gifts, ...donorWorkspace.giving.gifts].map((gift) => [gift.id, gift])).values()];
    if (forRequest && audience === "donor") return {
      relationships: { donors: [], gifts: [], tasks: [], communications: [], drafts: [] },
      giving: { ...donorWorkspace.giving, gifts: donorWorkspace.giving.gifts.filter((gift) => gift.donorId === profile?.id) }, profile,
    };
    return { relationships: { ...workspace.relationships, gifts }, giving: donorWorkspace.giving, profile };
  }
  function patch(id: string, update: (message: Message) => Message) { setMessages((current) => current.map((m) => m.id === id ? update(m) : m)); }
  function review(id: string, proposalId: string, changes: Partial<Review>) { patch(id, (m) => ({ ...m, proposals: m.proposals.map((p) => p.id === proposalId ? { ...p, ...changes } : p) })); }

  async function send(event?: FormEvent, suggestion?: string) {
    event?.preventDefault();
    const text = (suggestion ?? input).trim();
    if (!text || busy || applying || !status?.ready) return;
    const user = newMessage("user", text + (attachment ? `\nAttached CSV: ${attachment.name}` : ""));
    const reply = newMessage("assistant", "");
    const history = [...messages, user].slice(-19).map((m) => ({ role: m.role, content: (m.content + (m.proposals.length ? `\nReview cards: ${m.proposals.map((p) => `${p.title}: ${p.state}`).join("; ")}` : "")).slice(0, 5900) || "Continue." }));
    while (history.length > 1 && history.reduce((sum, message) => sum + message.content.length, 0) > 24000) history.shift();
    setMessages((current) => [...current, user, reply]); setInput(""); setBusy(true); setError(""); setProgress("Thinking through your request"); setNotice("");
    const controller = new AbortController(); abort.current = controller;
    let spokenReply = "";
    try {
      const response = await fetch("/api/assistant/chat", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ messages: history, path: pathname, demo: snapshot(), attachment: attachment ? { ...attachment, name: `${attachment.name} (${importSource})` } : null }) });
      await readAssistantStream(response, (event: AssistantEvent) => {
        if (event.type === "text") { spokenReply += event.delta; patch(reply.id, (m) => ({ ...m, content: m.content + event.delta })); }
        if (event.type === "proposal") patch(reply.id, (m) => ({ ...m, proposals: [...m.proposals, { ...event.proposal, state: "pending" }] }));
        if (event.type === "artifact") patch(reply.id, (m) => ({ ...m, artifacts: [...m.artifacts, event.artifact] }));
        if (event.type === "tool") setProgress(event.state === "running" ? labels[event.name] ?? "Preparing a change for your review" : "Putting the answer together");
        if (event.type === "navigate" && safePath(event.path, audience)) router.push(event.path);
        if (event.type === "error") setError(event.message);
        if (event.type === "done") setAnnouncement(spokenReply || "Your review cards and downloads are ready.");
      });
    } catch (cause) {
      if (controller.signal.aborted) setNotice("Response stopped. Unapplied changes are still only proposals.");
      else setError(cause instanceof Error ? cause.message : "The assistant could not respond. Please retry.");
    } finally { setBusy(false); setProgress(""); abort.current = null; }
  }

  async function apply(messageId: string, proposal: Review) {
    if (busy || applying || proposal.state !== "pending") return;
    review(messageId, proposal.id, { state: "applying", error: undefined });
    try {
      const current = snapshot(false);
      const response = await fetch("/api/assistant/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: proposal.token, path: pathname, demo: snapshot() }) });
      const result: { error?: string; id: string; mode: string; action?: Action } = await response.json();
      if (!response.ok) throw new Error(result.error ?? "This action could not be applied.");
      if (result.mode === "demo" && current && result.action && !applied.current.has(result.id)) {
        const next = applyDemoAction(current, result.action, result.id, demoDate);
        workspace!.setRelationships(next.relationships); donorWorkspace!.setGiving(next.giving);
        if (next.profile) donorWorkspace!.setProfiles(donorWorkspace!.profiles.map((p) => p.id === next.profile!.id ? next.profile! : p));
        applied.current.add(result.id);
      } else if (result.mode === "live") router.refresh();
      review(messageId, proposal.id, { state: "applied" });
      setNotice(demo ? "Applied to this fictional tab-session workspace. Nothing was sent or charged." : "Applied to your authorized workspace. No message was sent.");
    } catch (cause) { review(messageId, proposal.id, { state: "pending", error: cause instanceof Error ? cause.message : "Could not apply. Please try again." }); }
  }

  const suggestions = audience === "donor" ? ["How does priority-based giving work?", "Show my donation history", "Help me update my contact preferences"] : pathname === "/imports" ? ["Explain how to import a CSV", "Check the CSV I attached", "How do you detect duplicate gifts?"] : ["Who needs a follow-up?", "Find donors who lapsed this year", "Prepare a funder packet", "Show the funding priorities"];
  return <section id="hackleaf-assistant" className={styles.panel} role="dialog" aria-modal="false" aria-labelledby="assistant-title" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }}>
    <header className={styles.header}><span className={styles.avatar}><AssistantIcon name="chat" /></span><div><h2 id="assistant-title">Hackleaf assistant</h2><p>{demo ? "Help for your fictional workspace" : "Help for your CIC workspace"}</p></div>
      <button type="button" className={styles.iconButton} aria-label="New conversation" disabled={busy || applying} onClick={() => { setMessages([]); setError(""); setNotice(""); setAttachment(null); textarea.current?.focus(); }}><AssistantIcon name="new" /></button>
      <button type="button" className={styles.iconButton} aria-label="Close assistant panel" onClick={onClose}><AssistantIcon name="close" /></button></header>
    <div className={styles.context}><span className={styles.liveDot} />{audience === "donor" ? "Donor portal" : "CIC relationship workspace"}<span>{demo ? "Demo" : "Live"}</span></div>
    <div className={styles.messages} ref={scroller} role="log" aria-label="Assistant conversation" aria-live="off" tabIndex={0}>
      {!messages.length && <div className={styles.welcome}><span className={styles.welcomeIcon}><AssistantIcon name="chat" /></span><h3>What can we move forward?</h3><p>{audience === "donor" ? "Understand your giving, explore priorities, and manage your demo preferences." : "Find the right relationship. Plan the next step. Turn your records into useful work."}</p>
        <div className={styles.suggestions}>{suggestions.map((text) => <button key={text} disabled={!status?.ready} onClick={() => void send(undefined, text)}>{text}<span aria-hidden="true">↗</span></button>)}</div>
        <p className={styles.trust}>I can read your workspace and prepare changes. You review and apply each change. Messages and payments are never sent automatically.</p></div>}
      {messages.map((message) => <article key={message.id} className={message.role === "user" ? styles.userMessage : styles.assistantMessage} aria-label={message.role === "user" ? "Your message" : "Assistant reply"}>
        {message.content && <div className={styles.markdown}>{message.role === "user" ? <p>{message.content}</p> : <ReactMarkdown skipHtml urlTransform={(url) => safePath(url, audience) ?? ""} components={{ h1: "h3", h2: "h3", a: ({ href, children }) => href ? <a href={href}>{children}</a> : <span>{children}</span> }}>{message.content}</ReactMarkdown>}</div>}
        {message.proposals.map((proposal) => <section key={proposal.id} className={styles.reviewCard} aria-label={proposal.title}>
          <div className={styles.reviewHeader}><span>{proposal.state === "applied" ? "Applied" : proposal.state === "cancelled" ? "Cancelled" : "Review before applying"}</span><span>{demo ? "Demo change" : "Workspace change"}</span></div><h4>{proposal.title}</h4>
          <dl>{Object.entries(proposal.fields).map(([label, value]) => <div key={label}><dt>{label}</dt><dd tabIndex={value.length > 600 ? 0 : undefined}>{value}</dd></div>)}</dl>
          {proposal.error && <p role="alert" className={styles.error}>{proposal.error}</p>}
          {proposal.state === "pending" || proposal.state === "applying" ? <div className={styles.reviewActions}><button disabled={busy || applying || Date.now() >= proposal.expiresAt} className={styles.primary} onClick={() => void apply(message.id, proposal)}>{proposal.state === "applying" ? "Applying…" : demo ? "Apply demo change" : "Apply change"}</button><button disabled={applying} onClick={() => review(message.id, proposal.id, { state: "cancelled" })}>Cancel</button></div> : null}
          {proposal.state === "applied" && <p className={styles.receipt}>Saved {demo ? "for this tab session" : "to your workspace"}. {proposal.action.name === "draft_outreach" ? "Draft only. Nothing was sent." : ""}</p>}
        </section>)}
        {message.artifacts.map((artifact) => <button key={artifact.id} className={styles.artifact} onClick={() => download(artifact.filename, artifact.content)}><AssistantIcon name="download" /><span><strong>{artifact.title}</strong><small>{artifact.filename} · Download</small></span></button>)}
        {message.role === "assistant" && message.content && !busy && <button className={styles.copy} aria-label="Copy assistant reply" onClick={() => { navigator.clipboard.writeText(message.content).then(() => setNotice("Reply copied.")).catch(() => setNotice("Could not copy. Select the text to copy it manually.")); }}><AssistantIcon name="copy" />Copy</button>}
      </article>)}
      {busy && <p className={styles.progress} role="status"><span className={styles.pulse} />{progress || "Working on it"}</p>}
    </div>
    {error && <div className={styles.errorBar} role="alert">{error}<button disabled={busy} onClick={() => { const last = messages.filter((m) => m.role === "user").at(-1); if (last) void send(undefined, last.content); }}>Retry</button></div>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    {status && !status.ready && <p className={styles.setup} role="status">{status.message}</p>}
    <form className={styles.composer} onSubmit={(event) => void send(event)}>
      {attachment && <div className={styles.attachment}><span>{attachment.name}</span><select aria-label="Attached CSV source" value={importSource} onChange={(e) => setImportSource(e.target.value)}><option value="spreadsheet">Spreadsheet</option><option value="zeffy">Zeffy</option><option value="benevity">Benevity</option></select><button type="button" aria-label="Remove attached CSV" onClick={() => setAttachment(null)}>×</button></div>}
      <label className={styles.srOnly} htmlFor="assistant-message">Message Hackleaf assistant</label>
      <textarea id="assistant-message" ref={textarea} value={input} maxLength={5000} rows={2} placeholder={status?.ready ? "Ask, find, or get something done…" : "The assistant is connecting…"} disabled={!status?.ready || busy || applying} onChange={(e) => setInput(e.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} />
      <div className={styles.composerActions}><input ref={fileInput} hidden type="file" accept=".csv,text/csv" tabIndex={-1} onChange={async (event) => { const file = event.target.files?.[0]; event.target.value = ""; if (!file) return; if (file.size > 50000) { setError("Attach a CSV smaller than 50 KB."); return; } setAttachment({ name: file.name.slice(0, 170), csv: await file.text() }); setError(""); }} />
        <button type="button" className={styles.iconButton} aria-label="Attach CSV for review" disabled={!status?.ready || busy || audience === "donor"} onClick={() => fileInput.current?.click()}><AssistantIcon name="attach" /></button><span>Shift + Enter for a new line</span>
        {busy ? <button type="button" className={styles.send} aria-label="Stop assistant response" onClick={() => abort.current?.abort()}><AssistantIcon name="stop" /></button> : <button type="submit" className={styles.send} aria-label="Send message" disabled={!input.trim() || !status?.ready || applying}><AssistantIcon name="send" /></button>}</div>
    </form>
    <footer className={styles.footer}>Powered by OpenAI · Check important details</footer>
    <p className={styles.srOnly} role="status" aria-live="polite">{announcement}</p>
  </section>;
}
