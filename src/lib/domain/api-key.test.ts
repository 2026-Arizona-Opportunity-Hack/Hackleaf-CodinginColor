import { expect, it } from "vitest";
import { validReportingKey } from "./api-key";

it("fails closed for missing, weak, malformed and wrong integration keys", () => {
  const key = "fictional-test-value-32-characters-long";
  expect(validReportingKey(null, key)).toBe(false);
  expect(validReportingKey(`Bearer ${key}`, undefined)).toBe(false);
  expect(validReportingKey("Bearer short", "short")).toBe(false);
  expect(validReportingKey(`Basic ${key}`, key)).toBe(false);
  expect(validReportingKey(`Bearer ${key}x`, key)).toBe(false);
  expect(validReportingKey(`Bearer ${key}`, key)).toBe(true);
});
