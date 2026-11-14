import { describe, expect, test } from "vitest";
import { parseCsv } from "./csv-parser";

describe("parseCsv", () => {
  test("parses simple CSV", () => {
    const result = parseCsv("name,amount\nJordan,100\n");
    expect(result).toMatchObject({ ok: true, headers: ["name", "amount"], rows: [{ name: "Jordan", amount: "100" }] });
  });

  test("strips UTF-8 BOM", () => {
    const result = parseCsv("﻿name,amount\nJordan,100");
    expect(result).toMatchObject({ ok: true, headers: ["name", "amount"] });
  });

  test("handles quoted field with embedded comma", () => {
    const result = parseCsv('name,note\n"Ellis, Jordan",hello\n');
    expect(result).toMatchObject({ ok: true, rows: [{ name: "Ellis, Jordan", note: "hello" }] });
  });

  test("handles quoted field with embedded newline", () => {
    const result = parseCsv('name,note\n"Jordan\nEllis",hello\n');
    expect(result).toMatchObject({ ok: true, rows: [{ name: "Jordan\nEllis", note: "hello" }] });
  });

  test("handles escaped double quotes", () => {
    const result = parseCsv('name,note\n"Say ""hi""",test\n');
    expect(result).toMatchObject({ ok: true, rows: [{ name: 'Say "hi"', note: "test" }] });
  });

  test("handles CRLF line endings", () => {
    const result = parseCsv("name,amount\r\nJordan,100\r\n");
    expect(result).toMatchObject({ ok: true, rows: [{ name: "Jordan", amount: "100" }] });
  });

  test("handles no trailing newline", () => {
    const result = parseCsv("name,amount\nJordan,100");
    expect(result).toMatchObject({ ok: true, rows: [{ name: "Jordan", amount: "100" }] });
  });

  test("truncates at maxRows and sets flag", () => {
    const lines = ["name", ...Array.from({ length: 5 }, (_, i) => `row${i}`)].join("\n");
    const result = parseCsv(lines, 3);
    expect(result).toMatchObject({ ok: true, truncated: true });
    if (result.ok) expect(result.rows).toHaveLength(3);
  });

  test("does not set truncated when rows equal maxRows", () => {
    const lines = ["name", "a", "b", "c"].join("\n");
    const result = parseCsv(lines, 3);
    expect(result).toMatchObject({ ok: true, truncated: false });
    if (result.ok) expect(result.rows).toHaveLength(3);
  });

  test("returns error for whitespace-only input", () => {
    expect(parseCsv("   ")).toMatchObject({ ok: false });
  });

  test("returns error for empty string", () => {
    expect(parseCsv("")).toMatchObject({ ok: false });
  });

  test("returns error for empty column header", () => {
    const result = parseCsv("name,,amount\nJordan,,100\n");
    expect(result).toMatchObject({ ok: false, message: expect.stringContaining("Column 2") });
  });

  test("handles headers-only CSV (no data rows)", () => {
    const result = parseCsv("name,amount\n");
    expect(result).toMatchObject({ ok: true, rows: [] });
  });

  test("ignores trailing empty lines", () => {
    const result = parseCsv("name,amount\nJordan,100\n\n\n");
    expect(result).toMatchObject({ ok: true, rows: [{ name: "Jordan", amount: "100" }] });
  });
});
