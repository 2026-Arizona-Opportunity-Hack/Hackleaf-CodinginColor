import { z } from "zod";

export const donorInput = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.email().max(254).nullable(),
  kind: z.enum(["individual", "foundation", "company"]),
}).strict();

export const followUpInput = z.object({
  donorId: z.uuid(), title: z.string().trim().min(1).max(500), dueOn: z.iso.date(),
  kind: z.enum(["thank_you", "quarterly", "renewal", "check_in"]),
}).strict();

// Source adapters must produce this before dedupe preview, never raw rows in logs.
export const importedGift = z.object({
  donor: donorInput, source: z.enum(["spreadsheet", "zeffy", "benevity", "az_gives", "united_way"]),
  sourceRecordId: z.string().trim().min(1).max(200),
  amountCents: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  currency: z.literal("USD"), receivedOn: z.iso.date(), programId: z.string().min(1).max(100),
}).strict();
