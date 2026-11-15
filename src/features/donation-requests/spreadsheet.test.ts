import { expect, it } from "vitest";
import { requestsCsv } from "./spreadsheet";
import { demoRequests, demoRequestGifts } from "./requests";
import { allocateDonations } from "./allocation";

it("exports exact funding totals in priority order without mutating requests", () => {
  const allocations = allocateDonations(demoRequests, demoRequestGifts);
  const csv = requestsCsv([...demoRequests].reverse(), allocations);
  expect(csv).toContain('"3000.00","3000.00","0.00","100","Completed"');
  expect(csv.indexOf('"request-1"')).toBeLessThan(csv.indexOf('"request-4"'));
  expect(csv).toContain('"Fictional demo"');
  expect(csv.startsWith("\uFEFF")).toBe(true);
});

it("escapes spreadsheet formula injection, quotes, commas and multiline descriptions", () => {
  const request = { ...demoRequests[0], campaign: '=HYPERLINK("https://example.org")', note: 'First, "quoted"\nSecond line' };
  const csv = requestsCsv([request], []);
  expect(csv).toContain('"\'=HYPERLINK(""https://example.org"")"');
  expect(csv).toContain('"First, ""quoted""\nSecond line"');
  for (const campaign of ["+1", "-1", "@SUM(1)", " =1", "\t=1", "\r=1"]) expect(requestsCsv([{ ...request, campaign }], [])).toContain(`"'${campaign}"`);
  expect(requestsCsv([], []).split("\r\n")).toHaveLength(2);
});
