import { describe, expect, it } from "vitest";
import { chooseOwner, classifyRetention, findEmailCandidates, formatDate, formatMoney } from "./rules";
import { donorInput, importedGift } from "./validation";

describe("retention for comparable periods", () => {
  it.each([
    [0, 100, "new"], [100, 200, "increased"], [200, 100, "decreased"],
    [100, 100, "unchanged"], [100, 0, "lapsed"], [0, 0, "inactive"],
  ])("classifies %i → %i as %s", (previous, current, result) => {
    expect(classifyRetention(previous as number, current as number)).toBe(result);
  });
  it("rejects floats and unhandled negative refund totals", () => {
    expect(() => classifyRetention(-1, 100)).toThrow();
    expect(() => classifyRetention(1.2, 100)).toThrow();
  });
});

describe("balanced ownership", () => {
  const base = { active: true, assignedCount: 2, lastAssignedAt: null, name: "Fictional member" };
  it("uses lowest load, then least-recently assigned, without mutating input", () => {
    const members = [
      { ...base, id: "a", assignedCount: 3 },
      { ...base, id: "b", lastAssignedAt: "2026-11-01" },
      { ...base, id: "c", lastAssignedAt: "2026-10-01" },
      { ...base, id: "d", assignedCount: 0, active: false },
    ];
    expect(chooseOwner(members)?.id).toBe("c");
    expect(members[0].id).toBe("a");
  });
  it("returns null when nobody is eligible and rotates after a caller updates load", () => {
    expect(chooseOwner([])).toBeNull();
    const members = [{ ...base, id: "a" }, { ...base, id: "b" }];
    expect(chooseOwner(members)?.id).toBe("a");
    members[0].assignedCount++;
    expect(chooseOwner(members)?.id).toBe("b");
  });
});

it("finds email candidates without collapsing plus tags, dots or shared addresses", () => {
  const donors = [{ email: "a.b+camp@example.org" }, { email: "ab@example.org" }, { email: null }];
  expect(findEmailCandidates(" A.B+camp@EXAMPLE.ORG ", donors)).toEqual([donors[0]]);
  expect(findEmailCandidates("", donors)).toEqual([]);
  expect(findEmailCandidates("shared@example.org", [{ email: "shared@example.org" }, { email: "shared@example.org" }])).toHaveLength(2);
});

it("formats cents and dates without Phoenix date rollover", () => {
  expect(formatMoney(25050)).toBe("$250.50");
  expect(formatDate("2026-11-14")).toBe("Nov 14");
});

it("rejects unexpected privilege fields and invalid import money", () => {
  expect(donorInput.safeParse({ name: "Example", email: null, kind: "individual", role: "admin" }).success).toBe(false);
  expect(importedGift.safeParse({ donor: { name: "Example", email: null, kind: "individual" }, source: "zeffy", sourceRecordId: "1", amountCents: 1.5, currency: "USD", receivedOn: "2026-11-14", programId: "ai" }).success).toBe(false);
});
