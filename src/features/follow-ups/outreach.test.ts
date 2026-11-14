import { expect, it } from "vitest";
import { demoCommunications, demoDonors } from "@/lib/demo/data";
import { approveDraft, contactProblem, editDraft, hasQuarterlyTouch, logExternal, newDraft, quarterWindow } from "./outreach";

const donor = demoDonors[0];
const at = "2026-11-14T12:00:00-07:00";
const ready = () => editDraft(newDraft(donor, "allowed", "quarterly", "draft"), { subject: "Reviewed update", body: "A reviewed update with no invented outcome." });
const approved = () => approveDraft(ready(), donor, "allowed", true, donor.ownerId, at);

it("uses calendar quarters including year rollover and leap days", () => {
  expect(quarterWindow("2026-12-31")).toEqual({ start: "2026-10-01", end: "2026-12-31" });
  expect(quarterWindow("2027-01-01")).toEqual({ start: "2027-01-01", end: "2027-03-31" });
  expect(quarterWindow("2028-02-29").end).toBe("2028-03-31");
  expect(() => quarterWindow("2026-02-30")).toThrow();
});

it("blocks opt-outs, unknown permission and missing addresses even with a gift", () => {
  expect(contactProblem(donor, "opted_out")).toContain("Opted out");
  expect(contactProblem({ ...donor, email: null }, "allowed")).toContain("Missing");
  expect(() => newDraft(donor, "unknown", "thank_you", "id")).toThrow();
  expect(() => approveDraft(ready(), donor, "opted_out", true, donor.ownerId, at)).toThrow();
});

it("requires explicit complete-content review and invalidates approval on edit", () => {
  expect(() => approveDraft(newDraft(donor, "allowed", "quarterly", "id"), donor, "allowed", true, donor.ownerId, at)).toThrow();
  expect(() => approveDraft(ready(), donor, "allowed", false, donor.ownerId, at)).toThrow();
  expect(() => approveDraft({ ...ready(), recipient: "other@example.org" }, donor, "allowed", true, donor.ownerId, at)).toThrow();
  const draft = approved();
  expect(draft.sentAt).toBeNull();
  expect(() => approveDraft(draft, donor, "allowed", true, donor.ownerId, at)).toThrow();
  expect(editDraft(draft, { subject: "Changed", body: draft.body })).toMatchObject({ state: "draft", approvedBy: null, approvedAt: null });
});

it("separates failed/manual delivery, prevents double logging and rejects unapproved or future attempts", () => {
  const draft = approved();
  const input = { occurredOn: "2026-11-14", result: "manual_log" as const, confirmed: true };
  expect(() => logExternal(ready(), [], input, "2026-11-14", "id")).toThrow();
  expect(() => logExternal(draft, [], { ...input, confirmed: false }, "2026-11-14", "id")).toThrow();
  expect(() => logExternal(draft, [], { ...input, occurredOn: "2026-11-15" }, "2026-11-14", "id")).toThrow();
  expect(() => logExternal(draft, [], { ...input, occurredOn: "2026-11-13" }, "2026-11-14", "id")).toThrow();
  const failed = logExternal(draft, [], { ...input, result: "failed" }, "2026-11-14", "failed");
  expect(hasQuarterlyTouch(donor.id, "2026-11-14", [], [failed])).toBe(false);
  const logged = logExternal(draft, [failed], input, "2026-11-14", "logged");
  expect(hasQuarterlyTouch(donor.id, "2026-11-14", [], [failed, logged])).toBe(true);
  expect(() => logExternal(draft, [logged], input, "2026-11-14", "duplicate")).toThrow();
});

it("counts only elapsed quarterly communications using Phoenix dates", () => {
  const communication = { ...demoCommunications[0], donorId: donor.id, occurredAt: "2026-10-01T06:59:59Z" };
  expect(hasQuarterlyTouch(donor.id, "2026-11-14", [communication], [])).toBe(false);
  expect(hasQuarterlyTouch(donor.id, "2026-11-14", [{ ...communication, occurredAt: "2026-10-01T07:00:00Z" }], [])).toBe(true);
  expect(hasQuarterlyTouch(donor.id, "2026-11-14", [{ ...communication, occurredAt: "2026-11-15T07:00:00Z" }], [])).toBe(false);
  expect(hasQuarterlyTouch(donor.id, "2027-01-01", demoCommunications, [])).toBe(false);
});
