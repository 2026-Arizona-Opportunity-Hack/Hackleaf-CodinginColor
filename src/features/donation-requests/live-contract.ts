import { z } from "zod";

export const liveRequestInput = z.object({
  id: z.uuid(), revision: z.number().int().positive().nullable(),
  campaign: z.string().trim().min(1).max(120), program_id: z.string().min(1).max(100),
  goal_cents: z.number().int().min(1).max(99999999999),
  source: z.enum(["spreadsheet", "zeffy", "benevity", "az_gives", "united_way"]),
  frequency: z.enum(["one_time", "monthly", "annually"]),
  note: z.string().trim().min(1).max(500), state: z.enum(["active", "draft"]),
}).strict();
const cents = z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const fundingSnapshot = z.object({
  programs: z.array(z.object({ id: z.string(), name: z.string() })),
  requests: z.array(liveRequestInput.omit({ revision: true }).extend({
    revision: z.number().int().positive(), priority: z.number().int().positive(),
    currency: z.literal("USD"), created_at: z.string(),
  })),
  allocations: z.array(z.object({ request_id: z.uuid(), amount_cents: cents,
    donor_name: z.string(), received_on: z.string().nullable() })),
  unallocated_cents: cents,
});
export type LiveRequest = z.infer<typeof fundingSnapshot>["requests"][number];
export type FundingSnapshot = z.infer<typeof fundingSnapshot>;
export function liveFunding(request: LiveRequest, allocations: FundingSnapshot["allocations"]) {
  const raised = allocations.filter(a => a.request_id === request.id).reduce((total,a) => total+a.amount_cents,0);
  return { raised, remaining: Math.max(0,request.goal_cents-raised), percent: Math.min(100,Math.floor(raised/request.goal_cents*100)),
    status: request.state === "draft" ? "Draft" : raised >= request.goal_cents ? "Completed" : "Active" };
}
