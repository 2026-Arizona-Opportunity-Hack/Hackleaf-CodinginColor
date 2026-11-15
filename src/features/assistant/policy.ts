import type { ActionName } from "./contracts";

export interface Actor {
  id: string; sessionId: string; mode: "demo" | "live";
  role: "admin" | "board_member" | "donor" | "visitor";
  audience: "staff" | "donor"; today: string;
}
const staffActions: ActionName[] = ["create_follow_up", "update_follow_up", "log_communication", "draft_outreach"];
const adminActions: ActionName[] = ["create_donor", "update_donor", "assign_owner", "create_request", "update_request"];

export function canUse(actor: Actor, name: string): boolean {
  if (actor.audience !== "staff") return false;
  if (!["admin", "board_member"].includes(actor.role)) return false;
  if (staffActions.includes(name as ActionName)) return true;
  if (adminActions.includes(name as ActionName)) return actor.role === "admin" && (actor.mode === "demo" || !["create_request", "update_request"].includes(name));
  if (name === "update_my_profile" || name === "my_donor_profile") return false;
  if (name === "board_workload" || name === "preview_import") return actor.role === "admin";
  return ["service_overview", "search_clients", "workspace_overview", "search_donors", "get_donor", "list_follow_ups", "list_requests", "prepare_funder_packet", "navigate", "platform_help", "export_data"].includes(name);
}

export function assertCanUse(actor: Actor, name: string) {
  if (!canUse(actor, name)) throw new Error("This action is unavailable for your current workspace or role.");
}
