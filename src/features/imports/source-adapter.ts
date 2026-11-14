import type { GivingSource } from "@/lib/domain/types";
import { importedGift } from "@/lib/domain/validation";

// Column names in the normalized sample format.
// Real Zeffy and Benevity export headers are unconfirmed; this adapter must be
// updated with actual vendor column names once CIC provides actual export samples.
const REQUIRED_COLUMNS = [
  "source_record_id", "name", "email", "kind",
  "amount_cents", "currency", "received_on", "program_id",
] as const;

export interface ImportedGift {
  donor: { name: string; email: string | null; kind: "individual" | "foundation" | "company" };
  source: GivingSource;
  sourceRecordId: string;
  amountCents: number;
  currency: "USD";
  receivedOn: string;
  programId: string;
}

export interface RowResult {
  rowIndex: number;
  data?: ImportedGift;
  error?: string;
}

export function validateHeaders(headers: string[]): string | null {
  const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  if (missing.length === 0) return null;
  return `Missing required columns: ${missing.join(", ")}. The sample files use a normalized layout. Real vendor exports (Zeffy, Benevity) will need a header mapping once CIC provides actual export samples.`;
}

export function adaptRow(row: Record<string, string>, source: GivingSource, rowIndex: number): RowResult {
  const amountRaw = row.amount_cents?.trim() ?? "";
  const amountCents = /^\d+$/.test(amountRaw) ? Number.parseInt(amountRaw, 10) : NaN;

  const raw = {
    donor: {
      name: row.name ?? "",
      email: row.email?.trim() || null,
      kind: row.kind ?? "",
    },
    source,
    sourceRecordId: row.source_record_id ?? "",
    amountCents: Number.isNaN(amountCents) ? amountRaw : amountCents,
    currency: row.currency ?? "",
    receivedOn: row.received_on ?? "",
    programId: row.program_id ?? "",
  };

  const result = importedGift.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return { rowIndex, error: `${path}${issue.message}` };
  }
  return { rowIndex, data: result.data };
}
