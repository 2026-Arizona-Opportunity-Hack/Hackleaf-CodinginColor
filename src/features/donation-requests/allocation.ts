import type { Gift } from "@/lib/domain/types";
import type { DonationRequest } from "./requests";

export interface Allocation { giftId: string; requestId: string; amountCents: number }
export const GENERAL_SUPPORT = "general"; // Demo equivalent of program.is_general.

function addCents(a: number, b: number) {
  const total = a + b;
  if (!Number.isSafeInteger(total)) throw new Error("Donation totals exceed safe currency precision.");
  return total;
}

// Pure planner for the fictional UI. Production must commit receipt + splits
// atomically, under a lock and a unique receipt key. Never recompute old splits.
export function allocateDonations(requests: readonly DonationRequest[], gifts: readonly Gift[], existing: readonly Allocation[] = []): Allocation[] {
  const requestMap = new Map(requests.map((request) => [request.id, request]));
  const giftMap = new Map(gifts.map((gift) => [gift.id, gift]));
  if (requestMap.size !== requests.length || giftMap.size !== gifts.length) throw new Error("Duplicate request or donation ID.");
  if (new Set(requests.map((request) => request.priority)).size !== requests.length) throw new Error("That priority is already assigned to another request. Choose an unused priority.");
  const used = new Map<string, number>(), funded = new Map<string, number>();
  for (const request of requests) {
    if (!Number.isSafeInteger(request.goalCents) || request.goalCents <= 0 || (!Number.isSafeInteger(request.priority) || request.priority < 1)) throw new Error("Invalid goal or priority.");
  }
  for (const gift of gifts) {
    if (!Number.isSafeInteger(gift.amountCents) || gift.amountCents <= 0 || gift.currency !== "USD") throw new Error("Invalid donation amount or currency.");
  }
  const allocations = existing.map((allocation) => ({ ...allocation }));
  for (const allocation of allocations) {
    const gift = giftMap.get(allocation.giftId), request = requestMap.get(allocation.requestId);
    if (!gift || !request || request.state === "draft" || !Number.isSafeInteger(allocation.amountCents) || allocation.amountCents <= 0 ||
      (gift.programId !== GENERAL_SUPPORT && gift.programId !== request.program_id)) throw new Error("Invalid donation allocation.");
    used.set(gift.id, addCents(used.get(gift.id) ?? 0, allocation.amountCents));
    funded.set(request.id, addCents(funded.get(request.id) ?? 0, allocation.amountCents));
    if (used.get(gift.id)! > gift.amountCents || funded.get(request.id)! > request.goalCents) throw new Error("Allocation exceeds donation or request goal.");
  }
  const queue = [...requests].filter((request) => request.state === "active")
    .sort((a, b) => a.priority - b.priority || (Date.parse(a.createdAt) - Date.parse(b.createdAt)) || a.id.localeCompare(b.id));
  const receipts = [...gifts].sort((a, b) => a.receivedOn.localeCompare(b.receivedOn));
  while (true) {
    const pending = queue.filter((request) => (funded.get(request.id) ?? 0) < request.goalCents);
    if (!pending.length) break;
    const tier = pending.filter((request) => request.priority === pending[0].priority);
    for (const gift of receipts) {
      let available = gift.amountCents - (used.get(gift.id) ?? 0);
      for (const request of tier) {
        if (!available) break;
        if (gift.programId !== GENERAL_SUPPORT && gift.programId !== request.program_id) continue;
        const amountCents = Math.min(available, request.goalCents - (funded.get(request.id) ?? 0));
        if (!amountCents) continue;
        allocations.push({ giftId: gift.id, requestId: request.id, amountCents });
        available -= amountCents;
        used.set(gift.id, addCents(used.get(gift.id) ?? 0, amountCents));
        funded.set(request.id, addCents(funded.get(request.id) ?? 0, amountCents));
      }
    }
    // An unfinished higher tier blocks all lower tiers, even across programs.
    if (tier.some((request) => (funded.get(request.id) ?? 0) < request.goalCents)) break;
  }
  return allocations;
}

export function unallocatedCents(gifts: readonly Gift[], allocations: readonly Allocation[]) {
  return gifts.reduce((sum, gift) => addCents(sum, gift.amountCents), 0) - allocations.reduce((sum, item) => addCents(sum, item.amountCents), 0);
}
