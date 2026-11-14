import { z } from "zod";
import type { OutcomeEvidence } from "@/lib/domain/types";

const httpsSource = z.url().max(2048).refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password;
}, "Evidence sources must use HTTPS without embedded credentials.");
const evidenceSchema = z.object({
  id: z.string().trim().min(1).max(200), programId: z.string().trim().min(1).max(100),
  periodStart: z.iso.date(), periodEnd: z.iso.date(), metric: z.string().trim().min(1).max(500),
  value: z.number().finite(), unit: z.string().trim().min(1).max(100), sourceUrl: httpsSource,
  verifiedAt: z.iso.datetime({ offset: true }), attributionNote: z.string().trim().min(1).max(2000),
}).strict().refine((item) => item.periodEnd >= item.periodStart, "Evidence period must be ordered.");

export interface EvidenceFeed {
  status: "unavailable" | "invalid" | "available";
  evidence: OutcomeEvidence[];
  note: string;
}

// Pure boundary adapter: does not fetch URLs or accept upstream credentials.
// The server workstream must supply authenticated, size-bounded aggregate data.
export function adaptEvidence(input: unknown, now: Date): EvidenceFeed {
  if (input == null) return { status: "unavailable", evidence: [], note: "No verified outcomes integration supplied." };
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Phoenix", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const result = z.array(evidenceSchema).max(1000).safeParse(input);
  if (!result.success || new Set(result.data.map((item) => item.id)).size !== result.data.length || result.data.some((item) => new Date(item.verifiedAt) > now || item.periodEnd > today)) {
    return { status: "invalid", evidence: [], note: "Outcome evidence failed validation; no outcome values are included." };
  }
  return { status: "available", evidence: result.data, note: result.data.length ? "Evidence source and verification timestamps are listed for human review." : "The connected source returned no evidence." };
}

export function isStale(evidence: OutcomeEvidence, now: Date) {
  // Provisional freshness threshold; CIC must confirm it before live reporting.
  return now.getTime() - new Date(evidence.verifiedAt).getTime() > 90 * 24 * 60 * 60 * 1000;
}
