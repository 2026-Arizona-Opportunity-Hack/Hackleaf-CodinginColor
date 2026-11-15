import { expect, it } from "vitest";
import type { Gift } from "@/lib/domain/types";
import { allocateDonations, GENERAL_SUPPORT, unallocatedCents } from "./allocation";
import { demoRequests, funding, type DonationRequest } from "./requests";

const request = (id: string, priority: number, goalCents = 10000): DonationRequest => ({ ...demoRequests[0], id, priority, goalCents });
const gift = (id: string, amountCents: number, programId = GENERAL_SUPPORT): Gift => ({ id, amountCents, programId, donorId: `donor-${id}`, currency: "USD", receivedOn: "2026-11-14", source: "zeffy", sourceRecordId: id });

it("adds $20 and $10 from two donors to a $100 P1 request while P2 stays at zero", () => {
  const requests = [request("p1", 1), request("p2", 2)];
  const donations = [gift("alice", 2000), gift("bob", 1000)];
  const splits = allocateDonations(requests, donations);
  expect(splits).toEqual([{ giftId: "alice", requestId: "p1", amountCents: 2000 }, { giftId: "bob", requestId: "p1", amountCents: 1000 }]);
  expect(funding(requests[0], splits)).toMatchObject({ raisedCents: 3000, remainingCents: 7000, percent: 30 });
  expect(funding(requests[1], splits).raisedCents).toBe(0);
});

it("splits overflow into the next priority with donor-level amounts and conserves every cent", () => {
  const requests = [request("p1", 1), request("p2", 2, 20000)];
  const donations = [gift("alice", 9000), gift("bob", 25000)];
  const splits = allocateDonations(requests, donations);
  expect(splits).toEqual([{ giftId: "alice", requestId: "p1", amountCents: 9000 }, { giftId: "bob", requestId: "p1", amountCents: 1000 }, { giftId: "bob", requestId: "p2", amountCents: 20000 }]);
  expect(unallocatedCents(donations, splits)).toBe(4000);
  expect(splits.reduce((sum, item) => sum + item.amountCents, 0) + unallocatedCents(donations, splits)).toBe(34000);
});

it("funds unique priorities in order, skips drafts and ignores input order", () => {
  const first = { ...request("first", 1), createdAt: "2026-11-13T12:00:00Z" };
  const second = request("second", 2);
  const requests = [request("p3", 3), second, { ...request("draft", 4), state: "draft" as const }, first];
  const splits = allocateDonations(requests, [gift("donor", 15000)]);
  expect(splits.map((item) => [item.requestId, item.amountCents])).toEqual([["first", 10000], ["second", 5000]]);
  expect(requests[0].id).toBe("p3");
});

it("holds restricted gifts until every higher-priority request fills, then drains held funds", () => {
  const requests = [request("p1", 1), { ...request("p2", 2), program_id: "summer-camp" }];
  const restricted = gift("summer-only", 2000, "summer-camp");
  expect(allocateDonations(requests, [restricted])).toEqual([]);
  expect(allocateDonations(requests, [restricted, gift("general", 10000)])).toEqual([
    { giftId: "general", requestId: "p1", amountCents: 10000 }, { giftId: "summer-only", requestId: "p2", amountCents: 2000 },
  ]);
});

it("preserves existing splits when priorities or goals change and is replay-safe", () => {
  const p2 = request("p2", 2);
  const gifts = [gift("original", 5000)];
  const existing = allocateDonations([p2], gifts);
  const requests = [request("new-p1", 1), p2];
  const allGifts = [...gifts, gift("new", 3000)];
  const splits = allocateDonations(requests, allGifts, existing);
  expect(splits).toEqual([...existing, { giftId: "new", requestId: "new-p1", amountCents: 3000 }]);
  expect(allocateDonations(requests, allGifts, splits)).toEqual(splits);
  expect(() => allocateDonations([request("p2", 2, 4000)], gifts, existing)).toThrow();
  expect(() => allocateDonations(requests, [...allGifts, allGifts[0]], splits)).toThrow();
});

it("rejects forged splits, invalid money and unsafe totals", () => {
  const requests = [request("p1", 1)];
  expect(() => allocateDonations(requests, [gift("bad", -100)])).toThrow();
  expect(() => allocateDonations(requests, [gift("bad", 1.5)])).toThrow();
  expect(() => allocateDonations(requests, [gift("gift", 100)], [{ requestId: "p1", giftId: "gift", amountCents: 101 }])).toThrow();
  expect(() => allocateDonations(requests, [gift("gift", 100)], [{ requestId: "p1", giftId: "missing", amountCents: 1 }])).toThrow();
  expect(() => unallocatedCents([gift("a", Number.MAX_SAFE_INTEGER), gift("b", 1)], [])).toThrow();
});

it("rejects duplicate priorities even when one card is a draft or already funded", () => {
  const requests = [request("a", 1), request("b", 1)];
  expect(() => allocateDonations(requests, [])).toThrow(/priority is already assigned/);
  expect(() => allocateDonations([requests[0], { ...requests[1], state: "draft" }], [])).toThrow(/priority is already assigned/);
  const receipts = [gift("original", 10000)];
  const settled = allocateDonations([requests[0]], receipts);
  expect(() => allocateDonations(requests, receipts, settled)).toThrow(/priority is already assigned/);
});
