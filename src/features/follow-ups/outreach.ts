import { z } from "zod";
import type { Communication, Donor, OutreachDraft } from "@/lib/domain/types";
import { phoenixDate } from "./tasks";

export type ContactPolicy = "allowed" | "opted_out" | "unknown";
export interface DemoDraft extends OutreachDraft { recipient: string; purpose: "quarterly" | "thank_you" }
export interface ExternalLog { id: string; draftId: string; donorId: string; occurredOn: string; result: "manual_log" | "failed" }

export function quarterWindow(today: string) {
  z.iso.date().parse(today);
  const year = Number(today.slice(0, 4));
  const month = Math.floor((Number(today.slice(5, 7)) - 1) / 3) * 3 + 1;
  const end = new Date(Date.UTC(year, month + 2, 0)).toISOString().slice(0, 10);
  return { start: `${year}-${String(month).padStart(2, "0")}-01`, end };
}

export function hasQuarterlyTouch(donorId: string, today: string, communications: readonly Communication[], logs: readonly ExternalLog[]) {
  const { start } = quarterWindow(today);
  return communications.some((item) => {
    const date = phoenixDate(new Date(item.occurredAt));
    return item.donorId === donorId && date >= start && date <= today;
  }) || logs.some((item) => item.donorId === donorId && item.result === "manual_log" && item.occurredOn >= start && item.occurredOn <= today);
}

export function contactProblem(donor: Donor, policy: ContactPolicy) {
  if (policy === "opted_out") return "Opted out — do not contact.";
  if (policy !== "allowed") return "Contact permission unconfirmed.";
  if (!z.email().safeParse(donor.email).success) return "Missing valid email address.";
  return null;
}

export function newDraft(donor: Donor, policy: ContactPolicy, purpose: DemoDraft["purpose"], id: string): DemoDraft {
  const problem = contactProblem(donor, policy);
  if (problem) throw new Error(problem);
  return { id, donorId: donor.id, channel: "email", recipient: donor.email!, purpose,
    subject: purpose === "quarterly" ? "A quarterly update from Coding in Color" : "Thank you for supporting Coding in Color",
    body: `Hello ${donor.name},\n\n${purpose === "quarterly" ? "We would like to share a program update with you." : "Thank you for your support of Coding in Color."}\n\n[Add a verified update and source before sharing.]\n\nWarmly,\nCoding in Color`,
    state: "draft", approvedBy: null, approvedAt: null, sentAt: null };
}

export function editDraft(draft: DemoDraft, changes: Pick<DemoDraft, "subject" | "body">): DemoDraft {
  return { ...draft, ...changes, state: "draft", approvedBy: null, approvedAt: null, sentAt: null };
}

export function approveDraft(draft: DemoDraft, donor: Donor, policy: ContactPolicy, reviewed: boolean, actor: string, at: string): DemoDraft {
  if (draft.state !== "draft") throw new Error("This version was already approved.");
  const problem = contactProblem(donor, policy);
  if (problem || draft.donorId !== donor.id || draft.recipient !== donor.email || !reviewed || !actor || draft.channel !== "email") throw new Error(problem ?? "Review the recipient, channel and content.");
  if (!draft.subject?.trim() || !draft.body.trim() || draft.body.length > 10000 || /\[.*?\]/s.test(draft.body)) throw new Error("Replace template placeholders and review a complete message.");
  return { ...draft, state: "approved", approvedBy: actor, approvedAt: z.iso.datetime({ offset: true }).parse(at) };
}

export function logExternal(draft: DemoDraft, logs: readonly ExternalLog[], input: { occurredOn: string; result: ExternalLog["result"]; confirmed: boolean }, today: string, id: string): ExternalLog {
  z.iso.date().parse(input.occurredOn);
  if (!input.confirmed || draft.state !== "approved" || input.occurredOn > today || input.occurredOn < phoenixDate(new Date(draft.approvedAt!))) throw new Error("Confirm the external attempt after approval, on or before the demo day.");
  if (logs.some((log) => log.draftId === draft.id && log.result === "manual_log")) throw new Error("This version has already been logged.");
  if (!["manual_log", "failed"].includes(input.result)) throw new Error("Choose an attempt result.");
  return { id, draftId: draft.id, donorId: draft.donorId, occurredOn: input.occurredOn, result: input.result };
}
