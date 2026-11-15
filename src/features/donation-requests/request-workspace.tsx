"use client";
import { useAIPriorities } from "./use-ai-priorities";
import { priorityOrder } from "./priority-planner";

import { useRef, useState } from "react";
import { formatMoney } from "@/lib/domain/rules";
import { frequencies, programs, funding, type DonationRequest } from "./requests";
import type { Gift } from "@/lib/domain/types";
import { allocateDonations, unallocatedCents } from "./allocation";
import { DemoDonationForm } from "./demo-donation-form";
import { RequestDetails, RequestForm } from "./request-drawer";
import { downloadRequestsSpreadsheet } from "./spreadsheet";
import { useGivingWorkspace } from "@/features/donation-requests/giving-workspace";
import styles from "./requests.module.css";

type Filter = "All requests" | "Active" | "Completed" | "Drafts";
type Panel = { kind: "create" | "donate" } | { kind: "edit" | "view"; request: DonationRequest };

function RequestIcon() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 8h18v4H3zM5 12v9h14v-9M12 8v13M12 8H8.5A2.5 2.5 0 1 1 11 5.5L12 8Zm0 0h3.5A2.5 2.5 0 1 0 13 5.5L12 8Z" />
  </svg>;
}

export function RequestWorkspace({aiEnabled=false}:{aiEnabled?:boolean}) {
  const priorities=useAIPriorities(aiEnabled);
  const { giving: store, setGiving: setStore } = useGivingWorkspace();
  const { requests, gifts, allocations } = store;
  const requestFunding = (request: DonationRequest) => funding(request, allocations);
  const [filter, setFilter] = useState<Filter>("All requests");
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState<Panel | null>(null);
  const [message, setMessage] = useState("");
  const trigger = useRef<HTMLElement | null>(null);
  const counts = { "All requests": requests.length, Active: 0, Completed: 0, Drafts: 0 };
  const totals = { raised: 0, remaining: 0 };
  requests.forEach((request) => {
    const data = requestFunding(request);
    counts[data.status === "Draft" ? "Drafts" : data.status]++;
    if (request.state !== "draft") { totals.raised += data.raisedCents; totals.remaining += data.remainingCents; }
  });
  const openPriority = Math.min(...requests.filter((request) => request.state === "active" && requestFunding(request).remainingCents > 0).map((request) => request.priority));
  const visible = priorityOrder(requests).filter((request) => {
    const status = requestFunding(request).status;
    const matchesStatus = filter === "All requests" || (filter === "Drafts" ? status === "Draft" : status === filter);
    const text = `${request.campaign} ${request.note} ${programs.find((program) => program.id === request.program_id)?.name}`;
    return matchesStatus && text.toLowerCase().includes(query.trim().toLowerCase());
  });
  function open(next: Panel) { trigger.current = document.activeElement as HTMLElement; setPanel(next); }
  function dismiss() { setPanel(null); requestAnimationFrame(() => trigger.current?.focus()); }
  function recordDonation(gift: Gift) {
    const nextGifts = [...gifts, gift];
    const nextAllocations = allocateDonations(requests, nextGifts, allocations);
    setStore({ requests, gifts: nextGifts, allocations: nextAllocations });
    const amount = nextAllocations.filter((item) => item.giftId === gift.id).reduce((sum, item) => sum + item.amountCents, 0);
    setMessage(`Demo donation recorded: ${formatMoney(amount)} allocated; ${formatMoney(gift.amountCents - amount)} remains unallocated. No money was collected.`);
    dismiss();
  }
  function save(request: DonationRequest) {
    const editing = requests.some((item) => item.id === request.id);
    const nextRequests = editing ? requests.map((item) => item.id === request.id ? request : item) : [...requests, request];
    const nextStore={ requests: nextRequests, gifts, allocations: allocateDonations(nextRequests, gifts, allocations) };
    setStore(nextStore);
    if(aiEnabled)void priorities.rank(nextStore);
    setFilter(request.state === "draft" ? "Drafts" : "All requests"); setQuery("");
    setMessage(`Demo request ${request.state === "draft" ? "saved as a draft" : editing ? "updated" : "created"}. Changes reset on reload.`);
    dismiss();
  }
  return <section className={`${styles.workspace} ${panel ? styles.withDrawer : ""}`}>
    <header className={styles.heading}><div><p className={styles.eyebrow}>NGO WORKSPACE</p><h1>Donation requests</h1>
      <p className={styles.subtitle}>Small requests. Meaningful possibilities.<br />Bring together the support your programs need.</p></div>
      <div className={styles.headerActions}><button className={styles.secondary} onClick={() => { downloadRequestsSpreadsheet(requests, allocations); setMessage("CSV spreadsheet downloaded with all requests and current funding totals."); }}>Download spreadsheet</button>
      <button className={styles.primary} onClick={() => open({ kind: "create" })}><span aria-hidden="true">＋</span> Make a donation request</button></div>
    </header>
    <p className={styles.demoNote}>Fictional demo · Requests and edits reset on reload. No payments are collected.</p>
    <div className={styles.aiPriorityNote}><div><strong>{priorities.pending?"AI is assigning priorities…":priorities.assigned?"AI priorities assigned":"Automatic priorities"}</strong><p>{priorities.notice}</p><small>Funded cards keep their priority. Successful AI rankings put unfunded active requests ahead of drafts. Existing donations never move. Lowest number appears first.</small></div><button className={styles.secondary} disabled={!aiEnabled||priorities.pending} onClick={()=>void priorities.rank(store)}>{priorities.pending?"Ranking…":"Refresh AI priorities"}</button></div>
    <dl className={styles.summary}><div><dt>Active requests</dt><dd>{counts.Active}</dd></div><div><dt>Raised toward requests</dt><dd>{formatMoney(totals.raised)}</dd></div><div><dt>Still needed</dt><dd>{formatMoney(totals.remaining)}</dd></div></dl>
    <div className={styles.allocationNote}><p>Each card has a unique priority. New donations fill the lowest-numbered unfinished request before moving to the next. Program-specific gifts keep their designation.</p>
      <div><strong>{formatMoney(unallocatedCents(gifts, allocations))} unallocated</strong><button className={styles.secondary} onClick={() => open({ kind: "donate" })}>Record a demo donation</button></div></div>
    <div className={styles.toolbar}><div className={styles.filters} role="group" aria-label="Filter request status">
      {(Object.keys(counts) as Filter[]).map((name) => <button key={name} className={filter === name ? styles.selectedFilter : ""} aria-pressed={filter === name} onClick={() => setFilter(name)}>{name} <span>({counts[name]})</span></button>)}
    </div><label className={styles.search}><span className={styles.srOnly}>Search donation requests</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search donation requests…" /></label></div>
    <p role="status" className={styles.feedback}>{message || `${visible.length} ${visible.length === 1 ? "request" : "requests"} shown`}</p>
    <div className={styles.cards}>{visible.map((request) => {
      const data = requestFunding(request);
      return <article className={styles.card} key={request.id} aria-label={request.campaign}>
        <div className={styles.cardTop}><span className={styles.requestIcon}><RequestIcon /></span><div className={styles.cardTitle}>
          <p className={styles.program}>{programs.find((program) => program.id === request.program_id)?.name}</p><h2><button className={styles.cardLink} aria-label={`Open ${request.campaign}`} onClick={() => open({ kind: "view", request })}>{request.campaign}</button></h2></div>
          <span className={`${styles.status} ${data.status === "Draft" ? styles.draftStatus : ""}`}><span aria-hidden="true">●</span> {data.status}</span></div>
        <div className={styles.tags}><span className={styles.priority}>Priority {request.priority}</span><span>{frequencies[request.frequency]} support</span><span>USD funding</span></div>
        <p className={styles.description}>{request.note}</p>
        <div className={styles.funding}><p><strong>{formatMoney(data.raisedCents)}</strong> raised of {formatMoney(request.goalCents)}</p><span>{data.percent}% funded</span></div>
        <progress className={styles.progress} value={Math.min(data.raisedCents, request.goalCents)} max={request.goalCents} aria-label={`Funding for ${request.campaign}`} aria-valuetext={`${formatMoney(data.raisedCents)} raised of ${formatMoney(request.goalCents)}`} />
        <p className={styles.remaining}>{data.status === "Draft" ? "Draft · Not yet active" : data.remainingCents ? `${formatMoney(data.remainingCents)} still needed` : "Funding goal reached"}</p>
        {data.remainingCents > 0 && request.state === "active" && request.priority > openPriority && <p className={styles.remaining}>New funding waits for Priority {openPriority} requests.</p>}
        <footer className={styles.cardActions}><button className={styles.secondary} aria-label={`View ${request.campaign}`} onClick={() => open({ kind: "view", request })}>View donors & details</button>
          <button className={styles.textButton} aria-label={`Edit ${request.campaign}`} onClick={() => open({ kind: "edit", request })}>Edit request <span aria-hidden="true">↗</span></button></footer>
      </article>;
    })}</div>
    {!visible.length && <div className={styles.empty}><span className={styles.requestIcon}><RequestIcon /></span><h2>{query ? "No matching requests" : `No ${filter === "All requests" ? "donation requests" : filter.toLowerCase()} yet`}</h2>
      <p>{query ? "Try a different title or program, or clear your search." : "Start with a request for the support your program needs."}</p>
      {query ? <button className={styles.secondary} onClick={() => setQuery("")}>Clear search</button> : <button className={styles.secondary} onClick={() => open({ kind: "create" })}>Make a donation request</button>}</div>}
    <p className={styles.bottomNote}>Built for relationships. Every request is a step toward your next program.</p>
    {panel?.kind === "donate" && <DemoDonationForm onSave={recordDonation} onDismiss={dismiss} />}
    {panel?.kind === "create" && <RequestForm requests={requests} onSave={save} onDismiss={dismiss} />}
    {panel?.kind === "edit" && <RequestForm requests={requests} fundedCents={funding(panel.request, allocations).raisedCents} request={panel.request} onSave={save} onDismiss={dismiss} />}
    {panel?.kind === "view" && <RequestDetails allocations={allocations} gifts={gifts} request={panel.request} onDismiss={dismiss} onEdit={() => setPanel({ kind: "edit", request: panel.request })} />}
  </section>;
}
