import { z } from "zod";
import { donorInput } from "@/lib/domain/validation";

const id = z.string().min(1).max(100);
const date = z.iso.date();
const text = (max: number) => z.string().trim().min(1).max(max);
const kind = z.enum(["thank_you", "quarterly", "renewal", "check_in"]);
const source = z.enum(["spreadsheet", "zeffy", "benevity", "az_gives", "united_way"]);
export const donorSchema = donorInput.extend({ id, ownerId: id, sources: z.array(source).max(5) });
export const giftSchema = z.object({ id, donorId: id, amountCents: z.number().int().positive().max(1e12), currency: z.literal("USD"), receivedOn: date, programId: id, source, sourceRecordId: id }).strict();
export const taskSchema = z.object({ id, donorId: id, ownerId: id, title: text(500), dueOn: date, status: z.enum(["open", "completed"]), kind }).strict();
export const communicationSchema = z.object({ id, donorId: id, actorId: id, channel: z.enum(["email", "sms", "meeting", "phone"]), summary: text(2000), occurredAt: z.iso.datetime({ offset: true }), origin: z.enum(["manual_log", "provider_receipt"]) }).strict();
export const draftSchema = z.object({ id, donorId: id, channel: z.enum(["email", "sms"]), subject: z.string().max(200).nullable(), body: text(10000), state: z.enum(["draft", "approved", "sent", "failed"]), approvedBy: id.nullable(), approvedAt: z.string().nullable(), sentAt: z.string().nullable() }).strict();
export const requestSchema = z.object({ id, campaign: text(120), program_id: id, goalCents: z.number().int().positive().max(99999999999), currency: z.literal("USD"), source, frequency: z.enum(["one_time", "monthly", "annually"]), note: text(500), state: z.enum(["draft", "active"]), priority: z.number().int().positive(), createdAt: z.iso.datetime({ offset: true }) }).strict();
export const relationshipsSchema = z.object({ donors: z.array(donorSchema).max(200), gifts: z.array(giftSchema).max(400), tasks: z.array(taskSchema).max(200), communications: z.array(communicationSchema).max(200), drafts: z.array(draftSchema).max(100) }).strict();
export const demoSnapshotSchema = z.object({
  relationships: relationshipsSchema,
  giving: z.object({ requests: z.array(requestSchema).max(100), gifts: z.array(giftSchema).max(400), allocations: z.array(z.object({ giftId: id, requestId: id, amountCents: z.number().int().positive() }).strict()).max(600) }).strict(),
  profile: z.null(),
}).strict();
export type Relationships = z.infer<typeof relationshipsSchema>;
export type DemoSnapshot = z.infer<typeof demoSnapshotSchema>;

export const actionSchemas = {
  create_donor: donorInput,
  update_donor: donorInput.extend({ donorId: id }),
  assign_owner: z.object({ donorId: id, memberId: id }).strict(),
  create_follow_up: z.object({ donorId: id, title: text(500), dueOn: date, kind }).strict(),
  update_follow_up: z.object({ taskId: id, title: text(500), dueOn: date, status: z.enum(["open", "completed"]) }).strict(),
  log_communication: z.object({ donorId: id, channel: z.enum(["email", "sms", "meeting", "phone"]), summary: text(2000), occurredOn: date }).strict(),
  draft_outreach: z.object({ donorId: id, channel: z.enum(["email", "sms"]), subject: z.string().trim().max(200).nullable(), body: text(10000) }).strict(),
  create_request: z.object({ campaign: text(120), programId: z.enum(["ai-academy", "summer-camp"]), goalCents: z.number().int().positive().max(99999999999), frequency: z.enum(["one_time", "monthly", "annually"]), note: text(500), state: z.enum(["draft", "active"]) }).strict(),
  update_request: z.object({ requestId: id, campaign: text(120), goalCents: z.number().int().positive().max(99999999999), note: text(500), state: z.enum(["draft", "active"]) }).strict(),
} as const;
export type ActionName = keyof typeof actionSchemas;
export type Action = { [K in ActionName]: { name: K; input: z.infer<(typeof actionSchemas)[K]> } }[ActionName];
export function parseAction(name: string, input: unknown): Action {
  if (!Object.hasOwn(actionSchemas, name)) throw new Error("This action is not supported.");
  return { name, input: actionSchemas[name as ActionName].parse(input) } as Action;
}

export const readSchemas = {
  workspace_overview: z.object({ start: date.nullable(), end: date.nullable() }).strict(),
  search_donors: z.object({ query: z.string().max(100), retention: z.enum(["all", "new", "increased", "decreased", "unchanged", "lapsed", "inactive"]), limit: z.number().int().min(1).max(25) }).strict(),
  get_donor: z.object({ donorId: id }).strict(),
  list_follow_ups: z.object({ status: z.enum(["all", "open", "completed"]), donorId: id.nullable(), through: date.nullable() }).strict(),
  board_workload: z.object({}).strict(),
  list_requests: z.object({}).strict(),
  prepare_funder_packet: z.object({ donorId: id, start: date, end: date }).strict(),
  preview_import: z.object({ source }).strict(),
  export_data: z.object({ dataset: z.enum(["donors", "follow_ups", "retention", "requests"]) }).strict(),
  navigate: z.object({ path: text(200) }).strict(),
  platform_help: z.object({ topic: z.enum(["overview", "imports", "giving", "privacy", "outreach", "reporting"]) }).strict(),
} as const;
export type ReadName = keyof typeof readSchemas;
export const chatRequestSchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: text(6000) }).strict()).min(1).max(20),
  path: text(200), demo: demoSnapshotSchema.nullable(),
  attachment: z.object({ name: text(200), csv: z.string().min(1).max(50000) }).strict().nullable(),
}).strict().refine((body) => body.messages.at(-1)?.role === "user", "The last message must be from the user.")
  .refine((body) => body.messages.reduce((sum, message) => sum + message.content.length, 0) <= 24000, "The conversation context is too large.");
export const confirmRequestSchema = z.object({ token: text(80000), path: text(200), demo: demoSnapshotSchema.nullable() }).strict();

export interface Proposal { id: string; token: string; title: string; fields: Record<string, string>; expiresAt: number; action: Action; before: Record<string, unknown>; }
export interface Artifact { id: string; title: string; content: string; filename: string; }
export type AssistantEvent =
  | { type: "text"; delta: string }
  | { type: "tool"; name: string; label: string; state: "running" | "done" }
  | { type: "proposal"; proposal: Omit<Proposal, "before"> }
  | { type: "artifact"; artifact: Artifact }
  | { type: "navigate"; path: string }
  | { type: "error"; message: string }
  | { type: "done"; inputTokens: number; outputTokens: number };

const staffRoutes = ["/", "/donors", "/imports", "/follow-ups", "/retention", "/reports", "/donation-requests"];
export function safePath(path: string, audience: "staff" | "donor"): string | null {
  if(audience!=="staff")return null;
  const routes = staffRoutes;
  if (routes.includes(path)) return path;
  return audience === "staff" && /^\/donors\/[a-zA-Z0-9-]{1,100}$/.test(path) ? path : null;
}
