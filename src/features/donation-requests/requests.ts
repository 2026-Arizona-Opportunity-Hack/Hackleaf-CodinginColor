import { z } from "zod";
import { demoGifts } from "@/lib/demo/data";
import type { GivingSource } from "@/lib/domain/types";

export const programs = [
  { id: "ai-academy", name: "AI Academy" },
  { id: "summer-camp", name: "Summer Camp" },
] as const;
export const sources: { value: GivingSource; label: string }[] = [
  { value: "zeffy", label: "Zeffy" }, { value: "benevity", label: "Benevity" },
  { value: "az_gives", label: "Arizona Gives" }, { value: "united_way", label: "United Way" },
  { value: "spreadsheet", label: "Spreadsheet / offline record" },
];
import type { Allocation } from "./allocation";

export const frequencies = { one_time: "One-time", monthly: "Monthly", annually: "Annual" } as const;

// Form names mirror fields in the supplied gift/program design. A requested
// amount is a UI goal, NOT a received gift. Never insert this object into gifts.
const fields = z.object({
  priority: z.coerce.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  campaign: z.string().trim().min(1, "Enter a donation title.").max(120),
  program_id: z.enum(["ai-academy", "summer-camp"]),
  amount: z.string().regex(/^\d{1,9}(\.\d{1,2})?$/, "Enter an amount with at most two decimal places.")
    .refine((value) => Number(value) > 0, "The amount required must be greater than zero."),
  currency: z.literal("USD"), source: z.enum(["zeffy", "benevity", "az_gives", "united_way", "spreadsheet"]),
  frequency: z.enum(["one_time", "monthly", "annually"]),
  note: z.string().trim().min(1, "Describe what this donation will support.").max(500),
}).strict();

// Feature-local demo view model; request goals, priority and allocation storage
// still require a shared database contract.
export interface DonationRequest {
  id: string; campaign: string; program_id: string; goalCents: number;
  currency: "USD"; source: GivingSource; frequency: keyof typeof frequencies; note: string;
  state: "draft" | "active"; priority: number; createdAt: string;
}

export function parseAmount(input: string) {
  const [whole, fraction = ""] = fields.shape.amount.parse(input).split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function parseRequest(input: unknown) {
  const { amount, ...value } = fields.parse(input);
  return { ...value, goalCents: parseAmount(amount) };
}

export function funding(request: DonationRequest, allocations: readonly Allocation[]) {
  const raisedCents = allocations.filter((item) => item.requestId === request.id).reduce((sum, item) => sum + item.amountCents, 0);
  const status: "Draft" | "Completed" | "Active" = request.state === "draft" ? "Draft" : raisedCents >= request.goalCents ? "Completed" : "Active";
  return { raisedCents, remainingCents: Math.max(0, request.goalCents - raisedCents),
    percent: request.goalCents > 0 ? Math.min(100, Math.floor(raisedCents / request.goalCents * 100)) : 0, status };
}

export const demoRequests: DonationRequest[] = [
  { id: "request-1", campaign: "AI Academy classroom essentials", program_id: "ai-academy", goalCents: 300000, priority: 1,
    frequency: "one_time", note: "Help provide the classroom materials and everyday resources needed for upcoming AI Academy sessions." },
  { id: "request-2", campaign: "Summer camp learning kits", program_id: "summer-camp", goalCents: 250000, priority: 2,
    frequency: "one_time", note: "Support hands-on learning with notebooks, activity materials and take-home kits for our summer program." },
  { id: "request-3", campaign: "Laptops for hands-on learning", program_id: "ai-academy", goalCents: 500000, priority: 3,
    frequency: "one_time", note: "Help equip our learning space with laptops and accessories for guided coding activities." },
  { id: "request-4", campaign: "Open doors to summer camp", program_id: "summer-camp", goalCents: 800000, priority: 4,
    frequency: "monthly", note: "Contribute to program resources and operating costs that help us offer a welcoming summer learning experience." },
].map((request) => ({ ...request, currency: "USD", source: "zeffy", state: "active", createdAt: "2026-11-14T12:00:00-07:00" })) as DonationRequest[];

// Only these fictional receipts participate in this demo allocation queue.
const demoReceiptIds = new Set(["gift-2026-0", "gift-2026-6", "gift-2026-5", "gift-2026-4", "gift-2026-1"]);
export const demoRequestGifts = demoGifts.filter((gift) => demoReceiptIds.has(gift.id));

export function nextAvailablePriority(requests: readonly DonationRequest[]) {
  const used = new Set(requests.map((request) => request.priority));
  let priority = 1;
  while (used.has(priority)) priority++;
  return priority;
}
