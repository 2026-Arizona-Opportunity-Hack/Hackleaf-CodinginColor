import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDemoWorkspace } from "@/lib/workspace";
import { demoDate, demoMembers } from "@/lib/demo/data";
import { phoenixDate } from "@/features/follow-ups/tasks";
import { donorSchema, giftSchema, taskSchema, communicationSchema, draftSchema, safePath, type DemoSnapshot, type Relationships } from "./contracts";
import type { Actor } from "./policy";
import { sessionFor } from "./security";
import type { BoardMember, OutcomeEvidence } from "@/lib/domain/types";

export class AssistantFailure extends Error { constructor(message: string, public status = 400) { super(message); } }
type Database = Awaited<ReturnType<typeof createSupabaseServerClient>>;
export interface AssistantData extends Relationships { members: BoardMember[]; evidence: OutcomeEvidence[]; partial: boolean; }
export interface ToolContext {
  actor: Actor; snapshot: DemoSnapshot | null; db: Database | null;
  attachment: { name: string; csv: string } | null;
  data: () => Promise<AssistantData>;
}

export async function createContext(request: Request, path: string, snapshot: DemoSnapshot | null, sessionId?: string): Promise<ToolContext> {
  const session = sessionId ?? sessionFor(request);
  if (!session) throw new AssistantFailure("Open the assistant again to start a secure session.", 401);
  const audience = "staff";
  if (!safePath(path, "staff")) throw new AssistantFailure("This page is not supported by the assistant.");
  let db: Database | null = null;
  let actor: Actor;
  if (isDemoWorkspace()) {
    if (process.env.NODE_ENV === "production" && process.env.AI_DEMO_ENABLED !== "true") throw new AssistantFailure("The public demo assistant is disabled. Enable AI_DEMO_ENABLED deliberately to allow paid demo requests.", 503);
    actor = { id: `demo:${session}:staff:staff`, sessionId: session, audience, mode: "demo", role: "admin", today: demoDate };
  } else {
    try { db = await createSupabaseServerClient(); } catch { throw new AssistantFailure("Live authentication is not configured.", 503); }
    const { data: { user }, error } = await db.auth.getUser();
    if (error || !user) throw new AssistantFailure("Sign in with your CIC staff account before using the live assistant.", 401);
    const member = await db.from("members").select("role,active").eq("id", user.id).single();
    if (!member.data?.active || !["admin", "board_member"].includes(member.data.role)) throw new AssistantFailure("Your account does not have an active CIC staff membership.", 403);
    actor = { id: user.id, sessionId: session, audience, mode: "live", role: member.data.role as "admin" | "board_member", today: phoenixDate(new Date()) };
  }
  let cached: Promise<AssistantData> | undefined;
  return { actor, snapshot: actor.mode === "demo" ? snapshot : null, db, attachment: null, data: () => cached ??= loadData(actor, snapshot, db) };
}

async function loadData(actor: Actor, snapshot: DemoSnapshot | null, db: Database | null): Promise<AssistantData> {
  if (actor.audience !== "staff") throw new AssistantFailure("Staff records are not accessible from the donor assistant.", 403);
  if (actor.mode === "demo") {
    if (!snapshot) throw new AssistantFailure("The demo workspace is not ready. Reopen the assistant.");
    return { ...snapshot.relationships, members: demoMembers, evidence: [], partial: false };
  }
  if (!db) throw new AssistantFailure("Live data is not configured.", 503);
  const [donors, gifts, tasks, communications, drafts, members, evidence] = await Promise.all([
    db.from("donors").select("id,name,kind,email,owner_id").order("id").limit(2001),
    db.from("gifts").select("id,donor_id,amount_cents,currency,received_on,program_id,source,source_record_id").order("id").limit(5001),
    db.from("follow_ups").select("id,donor_id,owner_id,title,due_on,status,kind").order("id").limit(2001),
    db.from("communications").select("id,donor_id,actor_id,channel,summary,occurred_at,origin").order("occurred_at", { ascending: false }).limit(2001),
    db.from("outreach_drafts").select("id,donor_id,channel,subject,body,state,approved_by,approved_at,sent_at").order("id").limit(1001),
    db.from("members").select("id,display_name,active,last_assigned_at,role").order("id").limit(101),
    db.from("outcome_evidence").select("id,program_id,period_start,period_end,metric,value,unit,source_url,verified_at,attribution_note").order("id").limit(501),
  ]);
  if ([donors, gifts, tasks, communications, drafts, members, evidence].some((r) => r.error)) throw new AssistantFailure("Workspace data could not be loaded. Check your access and database migrations.", 503);
  const ds = (donors.data ?? []).map((d) => donorSchema.parse({ id: d.id, name: d.name, kind: d.kind, email: d.email, ownerId: d.owner_id, sources: [] }));
  return {
    donors: ds,
    gifts: (gifts.data ?? []).map((g) => giftSchema.parse({ id: g.id, donorId: g.donor_id, amountCents: Number(g.amount_cents), currency: g.currency, receivedOn: g.received_on, programId: g.program_id, source: g.source, sourceRecordId: g.source_record_id })),
    tasks: (tasks.data ?? []).map((t) => taskSchema.parse({ id: t.id, donorId: t.donor_id, ownerId: t.owner_id, title: t.title, dueOn: t.due_on, status: t.status, kind: t.kind })),
    communications: (communications.data ?? []).map((c) => communicationSchema.parse({ id: c.id, donorId: c.donor_id, actorId: c.actor_id, channel: c.channel, summary: c.summary, occurredAt: c.occurred_at, origin: c.origin })),
    drafts: (drafts.data ?? []).map((d) => draftSchema.parse({ id: d.id, donorId: d.donor_id, channel: d.channel, subject: d.subject, body: d.body, state: d.state, approvedBy: d.approved_by, approvedAt: d.approved_at, sentAt: d.sent_at })),
    members: (members.data ?? []).filter((m) => m.role === "board_member").map((m) => ({ id: m.id, name: m.display_name, active: m.active, lastAssignedAt: m.last_assigned_at, assignedCount: ds.filter((d) => d.ownerId === m.id).length })),
    evidence: (evidence.data ?? []).map((e) => ({ id: e.id, programId: e.program_id, periodStart: e.period_start, periodEnd: e.period_end, metric: e.metric, value: Number(e.value), unit: e.unit, sourceUrl: e.source_url, verifiedAt: e.verified_at, attributionNote: e.attribution_note })),
    partial: (donors.data?.length ?? 0) > 2000 || (gifts.data?.length ?? 0) > 5000 || (tasks.data?.length ?? 0) > 2000 || (communications.data?.length ?? 0) > 2000 || (drafts.data?.length ?? 0) > 1000 || (evidence.data?.length ?? 0) > 500,
  };
}
