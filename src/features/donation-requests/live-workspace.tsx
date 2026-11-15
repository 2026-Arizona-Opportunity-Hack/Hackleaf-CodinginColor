"use client";

import { priorityOrder } from "./priority-planner";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/domain/rules";
import { RequestDrawer } from "./request-drawer";
import { frequencies, sources, parseAmount, type DonationRequest } from "./requests";
import { requestsCsv } from "./spreadsheet";
import { liveFunding, type FundingSnapshot, type LiveRequest } from "./live-contract";
import { saveLiveRequest } from "./live-actions";
import styles from "./requests.module.css";

type Panel = { kind: "create" } | { kind: "view" | "edit"; request: LiveRequest };
export function LiveRequestWorkspace({ data }: { data: FundingSnapshot }) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All requests");
  const [message, setMessage] = useState("");
  const trigger = useRef<HTMLElement | null>(null);
  const totals = data.requests.filter(r => r.state === "active").reduce((total,r) => {
    const f = liveFunding(r,data.allocations);
    return { raised: total.raised+f.raised, remaining: total.remaining+f.remaining };
  }, { raised: 0, remaining: 0 });
  const next = priorityOrder(data.requests).find(r => r.state === "active" && liveFunding(r,data.allocations).remaining > 0);
  const visible = priorityOrder(data.requests).filter(r => (filter === "All requests" || liveFunding(r,data.allocations).status === filter) &&
    `${r.campaign} ${r.note} ${data.programs.find(p=>p.id===r.program_id)?.name}`.toLowerCase().includes(query.toLowerCase().trim()));
  function open(p: Panel) { trigger.current = document.activeElement as HTMLElement; setPanel(p); }
  function dismiss() { setPanel(null); requestAnimationFrame(()=>trigger.current?.focus()); }
  function download() {
    const requests: DonationRequest[] = data.requests.map(r=>({ ...r, goalCents: r.goal_cents, createdAt: r.created_at }));
    const allocations = data.allocations.map((a,i)=>({ giftId: String(i), requestId: a.request_id, amountCents: a.amount_cents }));
    const url=URL.createObjectURL(new Blob([requestsCsv(requests,allocations,{ label: "Live workspace", programs: data.programs })],{ type: "text/csv;charset=utf-8" }));
    const link=document.createElement("a"); link.href=url; link.download="donation-requests.csv"; link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000); setMessage("Live request spreadsheet downloaded.");
  }
  return <section className={`${styles.workspace} ${panel ? styles.withDrawer : ""}`}>
    <header className={styles.heading}><div><p className={styles.eyebrow}>NGO WORKSPACE</p><h1>Donation requests</h1><p className={styles.subtitle}>Create requests and track received support in priority order.</p></div>
      <div className={styles.headerActions}><button className={styles.secondary} onClick={download}>Download spreadsheet</button><button className={styles.primary} onClick={()=>open({ kind: "create" })}>＋ Make a donation request</button></div></header>
    <p className={styles.demoNote}>Live workspace · Requests and allocations are stored in Supabase.</p>
    <dl className={styles.summary}><div><dt>Active requests</dt><dd>{data.requests.filter(r=>liveFunding(r,data.allocations).status==="Active").length}</dd></div><div><dt>Raised toward requests</dt><dd>{formatMoney(totals.raised)}</dd></div><div><dt>Still needed</dt><dd>{formatMoney(totals.remaining)}</dd></div></dl>
    <div className={styles.allocationNote}><p>Each request gets a unique priority automatically. Received donations fill the first unfinished active request, then the next. Existing program restrictions are honored. Historic gifts recorded before funding was enabled are excluded.</p><div><strong>{formatMoney(data.unallocated_cents)} unallocated</strong><button className={styles.secondary} onClick={()=>{router.refresh();setMessage("Refreshing recorded donations and request funding…");}}>Refresh funding</button></div></div>
    <div className={styles.toolbar}><div className={styles.filters} role="group" aria-label="Filter request status">{["All requests","Active","Completed","Draft"].map(name=><button key={name} className={filter===name?styles.selectedFilter:""} aria-pressed={filter===name} onClick={()=>setFilter(name)}>{name} ({data.requests.filter(r=>name==="All requests" || liveFunding(r,data.allocations).status===name).length})</button>)}</div><label className={styles.search}><span className={styles.srOnly}>Search donation requests</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search donation requests…" /></label></div>
    <p role="status" className={styles.feedback}>{message || `${visible.length} requests shown`}</p>
    <div className={styles.cards}>{visible.map(request=>{
      const f=liveFunding(request,data.allocations);
      return <article className={styles.card} key={request.id} aria-label={request.campaign}>
        <div className={styles.cardTop}><div className={styles.cardTitle}><p className={styles.program}>{data.programs.find(p=>p.id===request.program_id)?.name}</p><h2><button className={styles.cardLink} onClick={()=>open({ kind:"view",request })}>{request.campaign}</button></h2></div><span className={styles.status}>{f.status}</span></div>
        <div className={styles.tags}><span className={styles.priority}>Priority {request.priority}</span><span>{frequencies[request.frequency]} support</span></div><p className={styles.description}>{request.note}</p>
        <div className={styles.funding}><p><strong>{formatMoney(f.raised)}</strong> raised of {formatMoney(request.goal_cents)}</p><span>{f.percent}% funded</span></div><progress className={styles.progress} value={f.raised} max={request.goal_cents} aria-label={`Funding for ${request.campaign}`} />
        <p className={styles.remaining}>{request.state==="draft"?"Draft · Not yet active":f.remaining?`${formatMoney(f.remaining)} still needed`:"Funding goal reached"}</p>
        {next && request.state==="active" && request.priority>next.priority && f.remaining>0 && <p className={styles.remaining}>New funding waits for Priority {next.priority}.</p>}
        <footer className={styles.cardActions}><button className={styles.secondary} onClick={()=>open({kind:"view",request})}>View donors &amp; details</button><button className={styles.textButton} onClick={()=>open({kind:"edit",request})}>Edit request ↗</button></footer>
      </article>;
    })}</div>
    {!visible.length && <div className={styles.empty}><h2>{query?"No matching requests":"No requests in this view"}</h2><p>Create a request or choose another filter.</p></div>}
    {panel && panel.kind!=="view" && <LiveRequestForm key={panel.kind==="edit"?panel.request.id:"create"} data={data} request={panel.kind==="edit"?panel.request:undefined} onDismiss={dismiss} onSaved={()=>{dismiss();setMessage("Request saved to Supabase. Funding has been updated in priority order.");router.refresh();}} />}
    {panel?.kind==="view" && <RequestDrawer title="Request details" onDismiss={dismiss}><div className={styles.formFields}><h3>{panel.request.campaign}</h3><p>{panel.request.note}</p><p>Priority {panel.request.priority} · {formatMoney(liveFunding(panel.request,data.allocations).raised)} raised of {formatMoney(panel.request.goal_cents)}</p><h3>Who donated</h3><p className={styles.muted}>Received amounts allocated to this request. Donor identities follow your staff permissions.</p><ul className={styles.giftList}>{data.allocations.filter(a=>a.request_id===panel.request.id).map((a,i)=><li key={i}><strong>{a.donor_name}</strong><span>{formatMoney(a.amount_cents)} allocated</span>{a.received_on && <small>{a.received_on}</small>}</li>)}</ul>{!data.allocations.some(a=>a.request_id===panel.request.id) && <p>No donations allocated yet.</p>}</div><footer className={styles.formFooter}><button className={styles.primary} onClick={()=>setPanel({kind:"edit",request:panel.request})}>Edit request</button></footer></RequestDrawer>}
  </section>;
}

function LiveRequestForm({ data, request, onSaved, onDismiss }: { data: FundingSnapshot; request?: LiveRequest; onSaved: ()=>void; onDismiss: ()=>void }) {
  const [id] = useState(()=>request?.id ?? crypto.randomUUID());
  const [pending,setPending]=useState(false), [error,setError]=useState("");
  const raised=request?liveFunding(request,data.allocations).raised:0;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    const form=new FormData(e.currentTarget);
    const state=(e.nativeEvent as SubmitEvent).submitter?.getAttribute("value")==="draft"?"draft":"active";
    try {
      const goal_cents=parseAmount(String(form.get("amount")));
      setPending(true);setError("");
      const result=await saveLiveRequest({ id, revision:request?.revision??null, campaign:form.get("campaign"),program_id:form.get("program_id"),goal_cents,source:form.get("source"),frequency:form.get("frequency"),note:form.get("note"),state });
      if(result.error) setError(result.error); else onSaved();
    } catch { setError("Enter a valid amount with at most two decimal places, or retry if your connection was interrupted."); }
    finally { setPending(false); }
  }
  return <RequestDrawer title={request?"Edit donation request":"Make a donation request"} onDismiss={()=>{if(!pending)onDismiss();}}><form onSubmit={submit} className={styles.drawerForm}><fieldset disabled={pending} style={{ border:0, padding:0, margin:0, minWidth:0, minHeight:0, display:"flex", flexDirection:"column", flex:1 }}><div className={styles.formFields}>
    <label>Donation title *<input name="campaign" required maxLength={120} defaultValue={request?.campaign} /></label>
    <label>Program *<select name="program_id" defaultValue={request?.program_id??data.programs[0]?.id} required>{data.programs.map(p=><option key={p.id} value={p.id} disabled={raised>0 && request?.program_id!==p.id}>{p.name}</option>)}</select></label>
    <label>Amount required (USD) *<input name="amount" type="number" min={Math.max(1,raised)/100} max="999999999.99" step="0.01" inputMode="decimal" required defaultValue={request?(request.goal_cents/100).toFixed(2):undefined} /></label>
    <label>Donation type / frequency<select name="frequency" defaultValue={request?.frequency??"one_time"}>{Object.entries(frequencies).map(([v,label])=><option key={v} value={v}>{label} monetary support</option>)}</select></label>
    <label>Preferred giving channel<select name="source" defaultValue={request?.source??"zeffy"}>{sources.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
    <label>What is the donation for? *<textarea name="note" required maxLength={500} rows={4} defaultValue={request?.note} /></label>
    <p className={styles.help}>Priority is assigned automatically. A request is a goal; only received gifts count toward funding.</p>{error && <p role="alert" className={styles.error}>{error}</p>}
  </div><footer className={styles.formFooter}><div className={styles.formActions}><button className={styles.primary} value="active">{pending?"Saving…":request?"Save changes":"Create request"}</button>{(!request || request.state==="draft") && <button className={styles.secondary} value="draft">Save as draft</button>}<button type="button" className={styles.textButton} onClick={onDismiss}>Cancel</button></div></footer></fieldset></form></RequestDrawer>;
}
