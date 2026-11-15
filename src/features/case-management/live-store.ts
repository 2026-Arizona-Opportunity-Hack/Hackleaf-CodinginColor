import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLiveStaff } from "@/lib/supabase/member";
import { fieldSchema, type DemoData } from "./model";

export async function readLiveCaseWorkspace() {
  const access = await getLiveStaff();
  if (access.status !== "authorized") throw new Error("Active staff membership is required for client records.");
  const db = await createSupabaseServerClient();
  const [{ data: row, error }, { data: members, error: memberError }] = await Promise.all([
    db.from("case_workspaces").select("revision,data").eq("id", "coding-in-color").single(),
    db.from("members").select("id,display_name,role,active").eq("active", true),
  ]);
  if (error || !row) throw new Error("The live client database is not ready. Apply migration 202611150004_live_case_workspace.sql.");
  if (memberError) throw new Error("Could not verify the staff directory.");
  const data = row.data as DemoData;
  data.users = (members ?? []).map(member => ({ id: member.id, name: member.display_name, email: "", role: member.role === "admin" ? "admin" : "staff", active: member.active, salt: "", passwordHash: "" }));
  data.sessions = [];
  data.schemas = { clients: fieldSchema(data.fields), visits: fieldSchema(data.serviceFields) };
  return { data, revision: row.revision as number, db };
}

export async function mutateLiveCaseWorkspace<T>(operation: (data: DemoData) => T | Promise<T>) {
  const { data, revision, db } = await readLiveCaseWorkspace();
  const result = await operation(data);
  // Auth users and sessions are owned by Supabase Auth, never this JSON store.
  const { users: _users, sessions: _sessions, schemas: _schemas, ...payload } = data;
  void _users; void _sessions; void _schemas;
  const { error } = await db.rpc("case_workspace_save", { expected_revision: revision, next_data: payload });
  if (error?.code === "40001") throw new Error("Another staff member changed this workspace. Refresh and retry; nothing was overwritten.");
  if (error) throw new Error("The client change could not be saved. Check your permissions and refresh before retrying.");
  return result;
}
