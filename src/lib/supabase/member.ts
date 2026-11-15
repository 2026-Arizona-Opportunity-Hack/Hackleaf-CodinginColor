import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "./server";

export function isActiveStaff(member: { active?: unknown; role?: unknown } | null) {
  return member?.active === true && (member.role === "admin" || member.role === "board_member");
}

export const getLiveStaff = cache(async () => {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError && (authError.status && authError.status >= 500 || authError.name === "AuthRetryableFetchError")) return { status: "unavailable" as const };
    if (authError || !user) return { status: "signed_out" as const };
    const { data: member, error } = await supabase.from("members").select("id, display_name, role, active").eq("id", user.id).maybeSingle();
    if (error) return { status: "unavailable" as const, user };
    if (!isActiveStaff(member)) return { status: "forbidden" as const, user,
      restriction: !member ? "missing_membership" as const : member.active !== true ? "inactive_membership" as const : "unsupported_role" as const };
    return { status: "authorized" as const, user, member: member! };
  } catch { return { status: "unavailable" as const }; }
});
