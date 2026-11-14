import { z } from "zod";
import type { Donor, Gift } from "@/lib/domain/types";
import { isStale, type EvidenceFeed } from "./evidence";

export function assemblePacket(donor: Donor, gifts: readonly Gift[], start: string, end: string, feed: EvidenceFeed, now: Date) {
  z.iso.date().parse(start); z.iso.date().parse(end);
  if (start > end) throw new Error("Reporting start must be on or before the end.");
  const selected = gifts.filter((gift) => gift.donorId === donor.id && gift.receivedOn >= start && gift.receivedOn <= end)
    .sort((a, b) => a.receivedOn.localeCompare(b.receivedOn) || a.id.localeCompare(b.id));
  if (selected.some((gift) => gift.currency !== "USD" || !Number.isSafeInteger(gift.amountCents) || gift.amountCents <= 0)) throw new Error("Gift amounts must be positive, safe USD cents.");
  const totalCents = selected.reduce((sum, gift) => sum + gift.amountCents, 0);
  if (!Number.isSafeInteger(totalCents)) throw new Error("Gift total exceeds safe currency precision.");
  const programIds = [...new Set(selected.map((gift) => gift.programId))].sort();
  const evidence = feed.status === "available" ? feed.evidence.filter((item) => programIds.includes(item.programId) && item.periodStart >= start && item.periodEnd <= end) : [];
  const missing = programIds.filter((programId) => !evidence.some((item) => item.programId === programId && !isStale(item, now)));
  return { donor, start, end, gifts: selected, totalCents, programIds, evidence, missing,
    staleIds: evidence.filter((item) => isStale(item, now)).map((item) => item.id),
    excludedEvidence: feed.evidence.length - evidence.length };
}
