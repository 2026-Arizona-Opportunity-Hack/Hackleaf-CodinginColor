import "server-only";
import { getLiveStaff } from "@/lib/supabase/member";
import type { SessionView } from "./session-view";

export async function getSessionView(): Promise<SessionView> {
  const access = await getLiveStaff();
  const user = "user" in access ? access.user : undefined;
  const candidate = access.status === "authorized" ? access.member.display_name : user?.user_metadata?.display_name;
  return {
    status: access.status,
    accountId: user?.id ?? null,
    name: typeof candidate === "string" && candidate.trim() ? candidate.slice(0,200) : "Staff member",
    role: access.status === "authorized" ? access.member.role : null,
  };
}
