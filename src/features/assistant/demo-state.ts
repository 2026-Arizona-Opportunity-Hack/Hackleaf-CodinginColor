import { demoCommunications, demoDonors, demoFollowUps, demoGifts, demoMembers } from "@/lib/demo/data";
import { chooseOwner } from "@/lib/domain/rules";
import { allocateDonations } from "@/features/donation-requests/allocation";
import { funding, nextAvailablePriority } from "@/features/donation-requests/requests";
import type { Action, DemoSnapshot, Relationships } from "./contracts";

export function initialRelationships(): Relationships {
  return structuredClone({ donors: demoDonors, gifts: demoGifts, tasks: demoFollowUps, communications: demoCommunications, drafts: [] });
}

export function actionBefore(snapshot: DemoSnapshot, action: Action): Record<string, unknown> {
  const input = action.input;
  if ("taskId" in input) return snapshot.relationships.tasks.find((t) => t.id === input.taskId) ?? {};
  if ("requestId" in input) return snapshot.giving.requests.find((r) => r.id === input.requestId) ?? {};
  if (action.name === "update_my_profile") return snapshot.profile ?? {};
  if ("donorId" in input) return snapshot.relationships.donors.find((d) => d.id === input.donorId) ?? {};
  return {};
}

// Pure, shared reducer. Server previews use exactly the same validation as UI applies.
export function applyDemoAction(current: DemoSnapshot, action: Action, id: string, today: string): DemoSnapshot {
  const next = structuredClone(current);
  const r = next.relationships;
  if (["create_donor", "create_follow_up", "log_communication", "draft_outreach", "create_request"].includes(action.name)
    && [...r.donors, ...r.tasks, ...r.communications, ...r.drafts, ...next.giving.requests].some((row) => row.id === id)) return next;
  const input = action.input;
  const donor = "donorId" in input ? r.donors.find((d) => d.id === input.donorId) : undefined;
  if ("donorId" in input && !donor) throw new Error("That donor is unavailable. Search for the donor again.");
  switch (action.name) {
    case "create_donor": {
      if (action.input.email && r.donors.some((d) => d.email?.toLowerCase() === action.input.email?.toLowerCase())) throw new Error("A matching email exists. Review it before creating another donor.");
      const owner = chooseOwner(demoMembers.map((m) => ({ ...m, assignedCount: r.donors.filter((d) => d.ownerId === m.id).length })));
      if (!owner) throw new Error("No eligible board owner.");
      r.donors.push({ ...action.input, id, ownerId: owner.id, sources: [] }); break;
    }
    case "update_donor": Object.assign(donor!, { name: action.input.name, email: action.input.email, kind: action.input.kind }); break;
    case "assign_owner": {
      if (!demoMembers.some((m) => m.id === action.input.memberId && m.active)) throw new Error("Choose an active board member.");
      donor!.ownerId = action.input.memberId;
      r.tasks.filter((task) => task.donorId === donor!.id && task.status === "open").forEach((task) => { task.ownerId = action.input.memberId; });
      break;
    }
    case "create_follow_up": r.tasks.push({ ...action.input, id, ownerId: donor!.ownerId, status: "open" }); break;
    case "update_follow_up": {
      const task = r.tasks.find((t) => t.id === action.input.taskId);
      if (!task) throw new Error("That next step is unavailable.");
      Object.assign(task, { title: action.input.title, dueOn: action.input.dueOn, status: action.input.status }); break;
    }
    case "log_communication": {
      if (action.input.occurredOn > today) throw new Error("Completed outreach cannot have a future date.");
      r.communications.push({ id, donorId: donor!.id, actorId: donor!.ownerId, channel: action.input.channel, summary: action.input.summary, occurredAt: `${action.input.occurredOn}T12:00:00-07:00`, origin: "manual_log" }); break;
    }
    case "draft_outreach": r.drafts.push({ id, ...action.input, state: "draft", approvedBy: null, approvedAt: null, sentAt: null }); break;
    case "create_request": {
      const a = action.input;
      next.giving.requests.push({ id, campaign: a.campaign, program_id: a.programId, goalCents: a.goalCents, frequency: a.frequency, note: a.note, state: a.state, priority: nextAvailablePriority(next.giving.requests), currency: "USD", source: "zeffy", createdAt: `${today}T12:00:00-07:00` });
      next.giving.allocations = allocateDonations(next.giving.requests, next.giving.gifts, next.giving.allocations); break;
    }
    case "update_request": {
      const request = next.giving.requests.find((q) => q.id === action.input.requestId);
      if (!request) throw new Error("That donation request is unavailable.");
      const raised = funding(request, next.giving.allocations).raisedCents;
      if (action.input.goalCents < raised || (raised > 0 && action.input.state === "draft")) throw new Error("A funded request cannot be downgraded or have a goal below its allocated gifts.");
      Object.assign(request, { campaign: action.input.campaign, goalCents: action.input.goalCents, note: action.input.note, state: action.input.state });
      next.giving.allocations = allocateDonations(next.giving.requests, next.giving.gifts, next.giving.allocations); break;
    }
    case "update_my_profile": {
      if (!next.profile) throw new Error("Enter your donor demo first.");
      Object.assign(next.profile, action.input); break;
    }
  }
  return next;
}
