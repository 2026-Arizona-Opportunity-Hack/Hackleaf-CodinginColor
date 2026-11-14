export type CsvParseResult =
  | { ok: true; headers: string[]; rows: Record<string, string>[]; truncated: boolean }
  | { ok: false; message: string };

export function parseCsv(raw: string, maxRows = 1_000): CsvParseResult {
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  if (!text.trim()) return { ok: false, message: "File is empty." };

  const cells: string[][] = [];
  let field = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field); field = "";
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = "";
      cells.push(row); row = [];
    } else {
      field += ch;
    }
  }

  if (field || row.length > 0) { row.push(field); cells.push(row); }
  while (cells.length > 0 && cells[cells.length - 1].every((c) => c === "")) cells.pop();

  if (cells.length === 0) return { ok: false, message: "File is empty." };

  const headers = cells[0];
  const emptyIdx = headers.findIndex((h) => h === "");
  if (emptyIdx >= 0) return { ok: false, message: `Column ${emptyIdx + 1} has no header name.` };

  const dataRows = cells.slice(1);
  const truncated = dataRows.length > maxRows;
  const rows = dataRows.slice(0, maxRows).map((r) => {
    const record: Record<string, string> = {};
    headers.forEach((h, i) => { record[h] = r[i] ?? ""; });
    return record;
  });

  return { ok: true, headers, rows, truncated };
}
