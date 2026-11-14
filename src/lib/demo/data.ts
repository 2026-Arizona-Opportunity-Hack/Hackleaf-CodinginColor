import type { BoardMember, Communication, Donor, FollowUp, Gift } from "@/lib/domain/types";

// Every person, funder, gift and communication in this file is fictional.
export const demoDate = "2026-11-14";
export const demoMembers: BoardMember[] = [
  { id: "member-1", name: "Morgan Chen", active: true, assignedCount: 4, lastAssignedAt: "2026-11-10" },
  { id: "member-2", name: "Taylor Brooks", active: true, assignedCount: 4, lastAssignedAt: "2026-11-11" },
  { id: "member-3", name: "Casey Reed", active: true, assignedCount: 4, lastAssignedAt: "2026-11-12" },
];
const names = ["Jordan Ellis", "Mesa Learning Fund", "Alex Rivera", "Sam Patel", "Desert Futures Foundation", "Avery Lewis", "Sonoran Technology Group", "Riley Santos", "Canyon Education Fund", "Jamie Park", "Drew Williams", "Quinn Morgan"];
export const demoDonors: Donor[] = names.map((name, i) => ({
  id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
  name, kind: [1, 4, 8].includes(i) ? "foundation" : i === 6 ? "company" : "individual",
  email: `donor${i + 1}@example.org`, ownerId: demoMembers[i % 3].id,
  sources: i % 2 === 0 ? ["spreadsheet", "zeffy"] : ["benevity"],
}));
const previous = [0, 4000, 500, 100, 2500, 1000, 2000, 900, 0, 700, 600, 0];
const current = [250, 5000, 0, 100, 2000, 1500, 2000, 800, 2500, 0, 0, 0];
export const demoGifts: Gift[] = demoDonors.flatMap((donor, i) => [2025, 2026].flatMap((year) => {
  const amount = year === 2025 ? previous[i] : current[i];
  return amount ? [{ id: `gift-${year}-${i}`, donorId: donor.id, amountCents: amount * 100,
    currency: "USD" as const, receivedOn: `${year}-11-${i === 0 ? "12" : "01"}`,
    programId: i % 2 === 0 ? "ai-academy" : "summer-camp",
    source: donor.sources[donor.sources.length - 1], sourceRecordId: `fictional-${year}-${i}` }] : [];
}));
export const demoFollowUps: FollowUp[] = [
  { title: "Thank them for supporting AI Academy", dueOn: demoDate, kind: "thank_you" },
  { title: "Prepare renewal packet", dueOn: "2026-11-16", kind: "renewal" },
  { title: "Check in after last year’s gift", dueOn: "2026-11-18", kind: "check_in" },
  { title: "Share the quarterly program update", dueOn: "2026-11-20", kind: "quarterly" },
].map((task, i) => ({ ...task, kind: task.kind as FollowUp["kind"], id: `task-${i}`, donorId: demoDonors[i].id, ownerId: demoDonors[i].ownerId, status: "open" }));
export const demoCommunications: Communication[] = [{
  id: "communication-1", donorId: demoDonors[1].id, channel: "email",
  summary: "Morgan Chen logged a thank-you to Mesa Learning Fund",
  occurredAt: "2026-11-11T10:00:00-07:00", actorId: "member-1", origin: "manual_log",
}];

export function donorGiving(donorId: string, year: number) {
  return demoGifts.filter((g) => g.donorId === donorId && g.receivedOn.startsWith(String(year)))
    .reduce((total, gift) => total + gift.amountCents, 0);
}
