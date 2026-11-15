import { expect, it } from "vitest";
import { demoRequests, funding, nextAvailablePriority, parseRequest } from "./requests";

const fields = { campaign: " Learning kits ", program_id: "summer-camp", amount: "2500.01", priority: "1", currency: "USD", source: "zeffy", frequency: "one_time", note: " Supplies for coding activities. " };

it("uses exact integer cents and validates priority without producing a received gift", () => {
  expect(parseRequest(fields)).toMatchObject({ campaign: "Learning kits", goalCents: 250001, priority: 1 });
  expect(parseRequest({ ...fields, amount: "0.01" }).goalCents).toBe(1);
  for (const amount of ["0", "-1", "1.001", "1e3", "Infinity", "", "1000000000"]) expect(() => parseRequest({ ...fields, amount })).toThrow();
  for (const priority of ["0", "9007199254740992", "1.5", ""]) expect(() => parseRequest({ ...fields, priority })).toThrow();
  expect(() => parseRequest({ ...fields, raised: "100" })).toThrow();
  expect(() => parseRequest({ ...fields, program_id: "invented-program" })).toThrow();
  expect(() => parseRequest({ ...fields, campaign: " " })).toThrow();
});

it("derives funding only from the request's allocation amounts", () => {
  const request = demoRequests[0];
  const allocations = [{ requestId: request.id, giftId: "gift", amountCents: 225000 }, { requestId: "other", giftId: "gift", amountCents: 75000 }];
  expect(funding(request, allocations)).toMatchObject({ raisedCents: 225000, remainingCents: 75000, percent: 75, status: "Active" });
  expect(funding({ ...request, goalCents: 225001 }, allocations)).toMatchObject({ remainingCents: 1, percent: 99, status: "Active" });
  expect(funding({ ...request, goalCents: 225000 }, allocations).status).toBe("Completed");
  expect(funding({ ...request, state: "draft" }, []).status).toBe("Draft");
});

it("seeds unique priorities and defaults new cards to an unused priority", () => {
  expect(demoRequests.map((request) => request.priority)).toEqual([1, 2, 3, 4]);
  expect(nextAvailablePriority(demoRequests)).toBe(5);
  expect(nextAvailablePriority([demoRequests[1]])).toBe(1);
  expect(parseRequest({ ...fields, priority: "5" }).priority).toBe(5);
});
