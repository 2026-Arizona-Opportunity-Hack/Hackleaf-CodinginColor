export type Role = "admin" | "board_member";
export type GivingSource = "spreadsheet" | "zeffy" | "benevity" | "az_gives" | "united_way";
export type Retention = "new" | "increased" | "decreased" | "unchanged" | "lapsed" | "inactive";
export interface BoardMember { id: string; name: string; active: boolean; assignedCount: number; lastAssignedAt: string | null }
export interface Donor {
  id: string; name: string; kind: "individual" | "foundation" | "company";
  email: string | null; ownerId: string; sources: GivingSource[];
}
export interface Gift {
  id: string; donorId: string; amountCents: number; currency: "USD";
  receivedOn: string; programId: string; source: GivingSource; sourceRecordId: string;
}
export interface Communication {
  id: string; donorId: string; channel: "email" | "sms" | "meeting" | "phone";
  summary: string; occurredAt: string; actorId: string;
  origin: "manual_log" | "provider_receipt";
}
export interface FollowUp {
  id: string; donorId: string; ownerId: string; title: string;
  dueOn: string; status: "open" | "completed"; kind: "thank_you" | "quarterly" | "renewal" | "check_in";
}
export interface OutreachDraft {
  id: string; donorId: string; channel: "email" | "sms"; subject: string | null;
  body: string; state: "draft" | "approved" | "sent" | "failed";
  approvedBy: string | null; approvedAt: string | null; sentAt: string | null;
}
export interface OutcomeEvidence {
  id: string; programId: string; periodStart: string; periodEnd: string;
  metric: string; value: number; unit: string; sourceUrl: string;
  verifiedAt: string; attributionNote: string;
}

// Proposed integration contract, not yet agreed with CIC's dashboard owner.
// It deliberately excludes donor identifiers and free-text notes.
export interface ReportingSnapshot {
  schemaVersion: "1"; generatedAt: string;
  period: { start: string; end: string; timezone: "America/Phoenix" };
  totals: { giftCents: number; currency: "USD"; donors: number; communications: number };
  byProgram: { programId: string; giftCents: number; donors: number }[];
  byBoardMember: { memberId: string; giftCents: number; donors: number }[];
  recentActivity: { date: string; gifts: number; communications: number }[];
}
