import type { BoardMember, Retention } from "./types";

export function classifyRetention(previousCents: number, currentCents: number): Retention {
  if (![previousCents, currentCents].every((n) => Number.isSafeInteger(n) && n >= 0)) {
    throw new Error("Retention requires nonnegative net gift cents for comparable periods.");
  }
  if (previousCents === 0) return currentCents > 0 ? "new" : "inactive";
  if (currentCents === 0) return "lapsed";
  if (currentCents === previousCents) return "unchanged";
  return currentCents > previousCents ? "increased" : "decreased";
}

// Planner only: callers must lock and update within a database transaction.
export function chooseOwner(members: readonly BoardMember[]): BoardMember | null {
  return members.filter((m) => m.active).sort((a, b) =>
    a.assignedCount - b.assignedCount ||
    (a.lastAssignedAt ?? "").localeCompare(b.lastAssignedAt ?? "") ||
    a.id.localeCompare(b.id),
  )[0] ?? null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Candidates require preview/review. A shared email must never auto-merge people.
export function findEmailCandidates<T extends { email: string | null }>(email: string, donors: readonly T[]): T[] {
  const normalized = normalizeEmail(email);
  return normalized ? donors.filter((d) => d.email && normalizeEmail(d.email) === normalized) : [];
}

export const formatMoney = (cents: number) => new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
}).format(cents / 100);

export const formatDate = (isoDate: string) => new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", timeZone: "America/Phoenix",
}).format(new Date(`${isoDate.slice(0, 10)}T12:00:00-07:00`));
