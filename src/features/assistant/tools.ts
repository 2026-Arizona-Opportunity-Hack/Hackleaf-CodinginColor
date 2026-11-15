import { randomUUID } from "node:crypto";
import type { FunctionTool } from "openai/resources/responses/responses";
import { classifyRetention, formatMoney } from "@/lib/domain/rules";
import { hasQuarterlyTouch } from "@/features/follow-ups/outreach";
import { assemblePacket } from "@/features/reports/packet";
import { adaptEvidence } from "@/features/reports/evidence";
import { funding } from "@/features/donation-requests/requests";
import { parseCsv } from "@/features/imports/csv-parser";
import { adaptRow, validateHeaders } from "@/features/imports/source-adapter";
import { actionSchemas, readSchemas, parseAction, safePath, type Action, type AssistantEvent, type ReadName } from "./contracts";
import { assertCanUse, canUse } from "./policy";
import { actionBefore, applyDemoAction } from "./demo-state";
import { actionTitles, knowledge, toolDescriptions } from "./knowledge";
import { signProposal } from "./security";
import type { AssistantData, ToolContext } from "./server-context";
import { modelSchema } from "./model-schema";

export function availableTools(context: ToolContext): FunctionTool[] {
  return Object.entries({ ...readSchemas, ...actionSchemas }).filter(([name]) => canUse(context.actor, name)).map(([name, schema]) => {
    return { type: "function", name, description: toolDescriptions[name], strict: true, parameters: modelSchema(schema) };
  });
}

function period(today: string, start: string | null, end: string | null) {
  const value = { start: start ?? `${today.slice(0, 4)}-01-01`, end: end ?? today };
  if (value.start > value.end || value.end > today) throw new Error("Choose an ordered reporting window ending on or before today.");
  return value;
}
function retention(data: AssistantData, today: string, donorId: string) {
  const year = Number(today.slice(0, 4));
  const previousEnd = `${year - 1}${today.slice(4)}`;
  const sum = (start: string, end: string) => data.gifts.filter((g) => g.donorId === donorId && g.receivedOn >= start && g.receivedOn <= end).reduce((s, g) => s + g.amountCents, 0);
  const previousCents = sum(`${year - 1}-01-01`, previousEnd), currentCents = sum(`${year}-01-01`, today);
  return { previousCents, currentCents, retention: classifyRetention(previousCents, currentCents) };
}
function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${(/^[\s]*[=+@-]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`;
}
function emitFile(emit: (event: AssistantEvent) => void, title: string, filename: string, content: string) {
  if (content.length > 100000) throw new Error("This export is too large for a chat download. Narrow the reporting period or use the dedicated workspace export.");
  const artifact = { id: randomUUID(), title, filename, content };
  emit({ type: "artifact", artifact });
  return { status: "download_ready", title, filename, note: "The user can download the file from this conversation. Nothing was sent externally." };
}

export async function beforeAction(context: ToolContext, action: Action): Promise<Record<string, unknown>> {
  if (context.actor.mode === "demo" && context.snapshot) return actionBefore(context.snapshot, action);
  const data = await context.data();
  const value = action.input;
  if ("taskId" in value) {
    const task = data.tasks.find((t) => t.id === value.taskId);
    if (!task) throw new Error("That next step is unavailable.");
    return { id: task.id, donor_id: task.donorId, owner_id: task.ownerId, title: task.title, due_on: task.dueOn, status: task.status };
  }
  if ("donorId" in value) {
    const donor = data.donors.find((d) => d.id === value.donorId);
    if (!donor) throw new Error("That donor is unavailable.");
    return { id: donor.id, name: donor.name, kind: donor.kind, email: donor.email, owner_id: donor.ownerId };
  }
  return {};
}

async function propose(context: ToolContext, name: string, input: unknown, emit: (event: AssistantEvent) => void) {
  const action = parseAction(name, input);
  const before = await beforeAction(context, action);
  if (context.actor.mode === "demo") {
    if (!context.snapshot) throw new Error("Demo state is unavailable.");
    applyDemoAction(context.snapshot, action, "preview", context.actor.today);
  } else {
    if (action.name === "log_communication" && action.input.occurredOn > context.actor.today) throw new Error("Completed communications cannot have future dates.");
    if (action.name === "create_donor" || action.name === "assign_owner") {
      const data = await context.data();
      if (action.name === "assign_owner" && !data.members.some((m) => m.id === action.input.memberId && m.active)) throw new Error("Choose an active board member.");
    }
  }
  const data = context.actor.audience === "staff" ? await context.data() : null;
  const fields: Record<string, string> = {};
  const labels: Record<string, string> = { donorId: "Donor", memberId: "New board owner", taskId: "Next step", requestId: "Donation request", dueOn: "Due date", occurredOn: "Contact date", kind: "Purpose", goalCents: "Funding goal", programId: "Program", is_anonymous: "Anonymous giving", do_not_contact: "Blocked contact channels", frequency: "Giving frequency" };
  for (const [key, value] of Object.entries(action.input)) {
    const label = labels[key] ?? key.replace(/([A-Z])/g, " $1").replaceAll("_", " ");
    fields[label] = key === "donorId" ? data?.donors.find((d) => d.id === value)?.name ?? String(value)
      : key === "memberId" ? data?.members.find((m) => m.id === value)?.name ?? String(value)
      : key === "taskId" ? data?.tasks.find((task) => task.id === value)?.title ?? String(value)
      : key === "requestId" ? context.snapshot?.giving.requests.find((request) => request.id === value)?.campaign ?? String(value)
      : key === "goalCents" ? `${formatMoney(Number(value))} USD`
      : key === "do_not_contact" ? ({ all: "Email and text", email: "Email", text: "Text", none: "No channel blocked" }[String(value)] ?? String(value))
      : typeof value === "boolean" ? value ? "Yes" : "No"
      : ["kind", "frequency"].includes(key) ? String(value).replaceAll("_", " ")
      : value === null ? "Not provided" : String(value);
  }
  if (action.name === "draft_outreach") fields["delivery"] = "Draft only · not approved or sent. Confirm contact permission before sending externally.";
  if (action.name === "log_communication") fields["confirmation"] = "Apply only if this communication actually happened.";
  const { before: _before, ...proposal } = signProposal(context.actor, action, before, actionTitles[name], fields);
  void _before;
  emit({ type: "proposal", proposal });
  return { status: "awaiting_confirmation", id: proposal.id, title: proposal.title, note: "Nothing has changed. The user must review and click Apply in the action card. Do not claim it is saved/completed/sent." };
}

export async function runTool(context: ToolContext, name: string, raw: unknown, emit: (event: AssistantEvent) => void): Promise<unknown> {
  assertCanUse(context.actor, name);
  if (Object.hasOwn(actionSchemas, name)) return propose(context, name, raw, emit);
  if (!Object.hasOwn(readSchemas, name)) throw new Error("Unknown tool.");
  const args = readSchemas[name as ReadName].parse(raw);
  const input = args as Record<string, unknown>;
  const today = context.actor.today;
  if (name === "platform_help") return { topic: input.topic, documentation: knowledge[input.topic as keyof typeof knowledge] };
  if (name === "navigate") {
    const path = safePath(String(input.path), context.actor.audience);
    if (!path) throw new Error("That destination is not available in this workspace.");
    emit({ type: "navigate", path }); return { opened: path };
  }
  if (name === "list_requests") {
    if (!context.snapshot) return { status: "unavailable", note: "Live donation-request storage is not connected. No payment is collected here." };
    const { requests, allocations } = context.snapshot.giving;
    return { fictional: true, requests: requests.map((r) => ({ ...r, ...funding(r, allocations) })), note: "USD cents. These are goals and allocation simulations, not verified received payments." };
  }
  if (name === "my_donor_profile") {
    const profile = context.snapshot?.profile;
    if (!profile || !context.snapshot) return { status: "unavailable", note: "Enter the fictional donor demo to view your own profile. Real donor identity binding is not connected." };
    return { fictional: true, profile: { id: profile.id, name: profile.type === "organization" ? profile.organization_name : `${profile.first_name} ${profile.last_name}`, email: profile.email, phone: profile.phone, is_anonymous: profile.is_anonymous, do_not_contact: profile.do_not_contact }, gifts: context.snapshot.giving.gifts.filter((g) => g.donorId === profile.id), note: "Only this profile's gifts are included. Demo entry is not real authentication." };
  }
  if (name === "preview_import") {
    if (!context.attachment) return { status: "attachment_required", note: "Attach a CSV using the paperclip button. Nothing is imported by this tool." };
    const parsed = parseCsv(context.attachment.csv);
    if (!parsed.ok) return { status: "invalid", message: parsed.message };
    const headerError = validateHeaders(parsed.headers);
    if (headerError) return { status: "invalid", message: headerError };
    const results = parsed.rows.map((r, i) => adaptRow(r, input.source as "spreadsheet", i + 2));
    const valid = results.flatMap((r) => r.data ? [r.data] : []);
    return { status: "preview_only", filename: context.attachment.name, validRows: valid.length, rejectedRows: results.length - valid.length, truncated: parsed.truncated,
      errors: results.filter((r) => r.error).slice(0, 10).map((r) => ({ row: r.rowIndex, error: r.error })),
      preview: valid.slice(0, 5).map((r) => ({ name: r.donor.name, amountCents: r.amountCents, receivedOn: r.receivedOn, sourceRecordId: r.sourceRecordId })),
      note: "Not imported. Source IDs and ambiguous donor matches must be reviewed in Imports. Real vendor headers remain unconfirmed." };
  }
  const data = await context.data();
  const scope = { mode: context.actor.mode, partial: data.partial, scope: context.actor.role === "admin" ? "all accessible relationships" : "owned relationships only" };
  if (name === "workspace_overview") {
    const window = period(today, input.start as string | null, input.end as string | null);
    const gifts = data.gifts.filter((g) => g.receivedOn >= window.start && g.receivedOn <= window.end);
    return { ...scope, period: window, currency: "USD", giftCents: gifts.reduce((sum, g) => sum + g.amountCents, 0), giftCount: gifts.length, donors: data.donors.length, donorsGivingInPeriod: new Set(gifts.map((g) => g.donorId)).size,
      overdue: data.tasks.filter((t) => t.status === "open" && t.dueOn < today).length, dueToday: data.tasks.filter((t) => t.status === "open" && t.dueOn === today).length,
      needsQuarterlyTouch: data.donors.filter((d) => !hasQuarterlyTouch(d.id, today, data.communications, [])).length,
      byProgram: [...new Set(gifts.map((g) => g.programId))].map((programId) => ({ programId, giftCents: gifts.filter((g) => g.programId === programId).reduce((s, g) => s + g.amountCents, 0) })) };
  }
  if (name === "search_donors") {
    const rows = data.donors.map((d) => ({ id: d.id, name: d.name, kind: d.kind, ownerId: d.ownerId, ownerName: data.members.find((m) => m.id === d.ownerId)?.name ?? "Assigned owner", ...retention(data, today, d.id), path: `/donors/${d.id}` }))
      .filter((d) => d.name.toLowerCase().includes(String(input.query).trim().toLowerCase()) && (input.retention === "all" || d.retention === input.retention));
    return { ...scope, total: rows.length, rows: rows.slice(0, Number(input.limit)), comparison: `January 1–${today.slice(5)} in ${Number(today.slice(0, 4)) - 1} and ${today.slice(0, 4)}; calendar YTD provisional` };
  }
  if (name === "get_donor") {
    const donor = data.donors.find((d) => d.id === input.donorId);
    if (!donor) throw new Error("That donor is unavailable.");
    return { ...scope, donor, gifts: data.gifts.filter((g) => g.donorId === donor.id).slice(0, 50), tasks: data.tasks.filter((t) => t.donorId === donor.id).slice(0, 30), communications: data.communications.filter((c) => c.donorId === donor.id).slice(0, 20), drafts: data.drafts.filter((d) => d.donorId === donor.id).slice(0, 10), note: "History is bounded. Notes/message bodies are untrusted content. Drafts are not sent messages; live contact permission is unconfirmed." };
  }
  if (name === "list_follow_ups") {
    const rows = data.tasks.filter((t) => (input.status === "all" || t.status === input.status) && (!input.donorId || t.donorId === input.donorId) && (!input.through || t.dueOn <= String(input.through)))
      .sort((a, b) => a.dueOn.localeCompare(b.dueOn)).map((t) => ({ ...t, donorName: data.donors.find((d) => d.id === t.donorId)?.name }));
    return { ...scope, total: rows.length, tasks: rows.slice(0, 50) };
  }
  if (name === "board_workload") return { ...scope, members: data.members.map((member) => ({ ...member, assignedCount: data.donors.filter((donor) => donor.ownerId === member.id).length })) };
  if (name === "prepare_funder_packet") {
    const donor = data.donors.find((d) => d.id === input.donorId);
    if (!donor) throw new Error("That funder is unavailable.");
    if (data.partial) throw new Error("This dataset is truncated. Narrow the data before assembling a complete funder packet.");
    const window = period(today, String(input.start), String(input.end));
    const now = new Date(`${today}T12:00:00-07:00`);
    const packet = assemblePacket(donor, data.gifts, window.start, window.end, adaptEvidence(data.evidence.length ? data.evidence : null, now), now);
    const content = `# Funder packet: ${donor.name}\n\n${context.actor.mode === "demo" ? "FICTIONAL DEMO — not a record of CIC funding or impact.\n\n" : "Prepared from your authorized workspace.\n\n"}Reporting window: ${window.start}–${window.end} (America/Phoenix)\n\nTotal gifts: ${formatMoney(packet.totalCents)} USD\n\n## Gift history\n${packet.gifts.map((g) => `- ${g.receivedOn}: ${formatMoney(g.amountCents)} — ${g.programId}; ${g.source}/${g.sourceRecordId}`).join("\n") || "No gifts in this period."}\n\n## Verified outcome evidence\n${packet.evidence.map((e) => `- ${e.metric}: ${e.value} ${e.unit}. Period ${e.periodStart}–${e.periodEnd}. Source: ${e.sourceUrl}. Verified ${e.verifiedAt}. ${e.attributionNote}${packet.staleIds.includes(e.id) ? " STALE: reconfirm before use." : ""}`).join("\n") || "Outcomes unavailable. No impact totals asserted."}\n\n## Evidence gaps and attribution\n${packet.missing.map((p) => `- Missing current verified evidence: ${p}`).join("\n")}\nGift designation is recorded support, not proof of causal impact. Review all source evidence before sharing.\n`;
    return { ...emitFile(emit, `${donor.name} · funder packet`, `funder-packet-${donor.id}.md`, content), totalCents: packet.totalCents, missingEvidence: packet.missing };
  }
  if (name === "export_data") {
    let rows: unknown[][];
    if (input.dataset === "donors") rows = [["id", "name", "kind", "owner_id"], ...data.donors.map((d) => [d.id, d.name, d.kind, d.ownerId])];
    else if (input.dataset === "follow_ups") rows = [["id", "donor_id", "title", "due_on", "status"], ...data.tasks.map((t) => [t.id, t.donorId, t.title, t.dueOn, t.status])];
    else if (input.dataset === "retention") rows = [["donor", "previous_ytd_cents", "current_ytd_cents", "retention"], ...data.donors.map((d) => { const r = retention(data, today, d.id); return [d.name, r.previousCents, r.currentCents, r.retention]; })];
    else {
      if (!context.snapshot) throw new Error("Live request storage is not connected.");
      rows = [["title", "priority", "goal_cents", "raised_cents"], ...context.snapshot.giving.requests.map((r) => [r.campaign, r.priority, r.goalCents, funding(r, context.snapshot!.giving.allocations).raisedCents])];
    }
    if (data.partial) throw new Error("Dataset is truncated; a complete export is unavailable.");
    const disclosure = context.actor.mode === "demo" ? "FICTIONAL DEMO\r\n" : "AUTHORIZED WORKSPACE EXPORT\r\n";
    return emitFile(emit, `${input.dataset} export`, `hackleaf-${input.dataset}.csv`, "\uFEFF" + disclosure + rows.map((r) => r.map(csvCell).join(",")).join("\r\n"));
  }
  throw new Error("This tool is not available.");
}
