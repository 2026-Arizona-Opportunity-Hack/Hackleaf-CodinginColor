import { expect, it } from "vitest";
import { demoDonors, demoGifts } from "@/lib/demo/data";
import { adaptEvidence, isStale } from "./evidence";
import { assemblePacket } from "./packet";

const now = new Date("2026-11-14T19:00:00Z");
const donor = demoDonors[1];
const evidence = { id: "outcome-1", programId: "summer-camp", periodStart: "2026-01-01", periodEnd: "2026-10-31", metric: "Fictional test participation", value: 12, unit: "participants", sourceUrl: "https://example.org/evidence", verifiedAt: "2026-11-01T00:00:00Z", attributionNote: "Aggregate test evidence; no causal attribution." };
const packet = (feed = adaptEvidence(null, now)) => assemblePacket(donor, demoGifts, "2026-01-01", "2026-11-14", feed, now);

it("selects only the funder's gifts within inclusive dates, preserving provenance", () => {
  const result = packet();
  expect(result.gifts.map((gift) => gift.sourceRecordId)).toEqual(["fictional-2026-1"]);
  expect(result.totalCents).toBe(500000);
  expect(result.programIds).toEqual(["summer-camp"]);
  expect(result.missing).toEqual(["summer-camp"]);
  expect(result.evidence).toEqual([]);
  const boundary = assemblePacket(donor, demoGifts, "2026-11-01", "2026-11-01", adaptEvidence(null, now), now);
  expect(boundary.totalCents).toBe(result.totalCents);
});

it("validates evidence atomically and distinguishes an unavailable source from valid empty data", () => {
  expect(adaptEvidence(null, now).status).toBe("unavailable");
  expect(adaptEvidence([], now).status).toBe("available");
  for (const changed of [{ sourceUrl: "http://example.org" }, { sourceUrl: "https://user:password@example.org" }, { value: Infinity }, { periodEnd: "2025-01-01" }, { verifiedAt: "2027-01-01T00:00:00Z" }, { periodEnd: "2026-12-01" }, { studentName: "Unwanted field" }]) {
    const feed = adaptEvidence([evidence, { ...evidence, id: "outcome-2", ...changed }], now);
    expect(feed.status).toBe("invalid");
    expect(feed.evidence).toEqual([]);
  }
  expect(adaptEvidence([evidence, evidence], now).status).toBe("invalid");
  expect(adaptEvidence([{ ...evidence, periodEnd: "2026-11-15" }], new Date("2026-11-15T06:59:59Z")).status).toBe("invalid");
});

it("matches program and contained period without prorating or inventing attribution", () => {
  const result = packet(adaptEvidence([evidence, { ...evidence, id: "wrong-program", programId: "other" }, { ...evidence, id: "overlap", periodStart: "2025-12-31" }], now));
  expect(result.evidence.map((item) => item.id)).toEqual(["outcome-1"]);
  expect(result.evidence[0].attributionNote).toBe(evidence.attributionNote);
  expect(result.excludedEvidence).toBe(2);
  expect(result.missing).toEqual([]);
});

it("keeps stale verification visible and marks its program as missing current evidence", () => {
  const old = { ...evidence, verifiedAt: "2026-01-01T00:00:00Z" };
  expect(isStale(old, now)).toBe(true);
  const result = packet(adaptEvidence([old], now));
  expect(result.evidence).toHaveLength(1);
  expect(result.staleIds).toEqual([old.id]);
  expect(result.missing).toEqual(["summer-camp"]);
});

it("handles empty giving windows and rejects bad dates or currency arithmetic", () => {
  const empty = assemblePacket(donor, demoGifts, "2024-01-01", "2024-12-31", adaptEvidence([evidence], now), now);
  expect(empty.totalCents).toBe(0);
  expect(empty.evidence).toEqual([]);
  expect(() => assemblePacket(donor, demoGifts, "2026-02-30", "2026-11-14", adaptEvidence(null, now), now)).toThrow();
  expect(() => assemblePacket(donor, demoGifts, "2026-11-14", "2026-01-01", adaptEvidence(null, now), now)).toThrow();
  const gift = { ...demoGifts.find((item) => item.donorId === donor.id)!, receivedOn: "2026-11-14", amountCents: Number.MAX_SAFE_INTEGER };
  expect(() => assemblePacket(donor, [gift, { ...gift, id: "extra" }], "2026-01-01", "2026-11-14", adaptEvidence(null, now), now)).toThrow();
});
