import type { BoardMember, Donor, FollowUp } from "@/lib/domain/types";
import { followUpInput } from "@/lib/domain/validation";

export function phoenixDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Phoenix", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function taskGroup(task: FollowUp, today: string) {
  if (task.status === "completed") return "Completed";
  return task.dueOn < today ? "Overdue" : task.dueOn === today ? "Today" : "Upcoming";
}

export function orderedTasks(tasks: readonly FollowUp[]) {
  return [...tasks].sort((a, b) => a.dueOn.localeCompare(b.dueOn) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
}

export function makeTask(input: unknown, donors: readonly Donor[], members: readonly BoardMember[], id: string): FollowUp {
  const value = followUpInput.parse(input);
  const donor = donors.find((item) => item.id === value.donorId);
  if (!donor || !members.some((member) => member.id === donor.ownerId && member.active)) {
    throw new Error("Choose a donor with an active owner.");
  }
  return { ...value, id, ownerId: donor.ownerId, status: "open" };
}
