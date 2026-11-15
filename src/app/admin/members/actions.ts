"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLiveStaff } from "@/lib/supabase/member";
import { isDemoWorkspace } from "@/lib/workspace";

const ROLES = ["admin", "board_member"] as const;

async function requireAdmin() {
  const access = await getLiveStaff();
  if (access.status !== "authorized" || access.member.role !== "admin") {
    throw new Error("Admin access required.");
  }
  return access;
}

export async function approveMember(_prev: { error: string; message: string }, form: FormData) {
  if (isDemoWorkspace()) return { error: "Live mode only.", message: "" };
  try {
    await requireAdmin();
    const result = z.object({
      userId: z.string().uuid("Must be a valid UUID from the user's dashboard."),
      displayName: z.string().trim().min(1).max(200),
      role: z.enum(ROLES),
    }).safeParse({ userId: form.get("userId"), displayName: form.get("displayName"), role: form.get("role") });
    if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid input.", message: "" };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("members").upsert({
      id: result.data.userId,
      display_name: result.data.displayName,
      role: result.data.role,
      active: true,
    }, { onConflict: "id" });
    if (error) return { error: error.message, message: "" };
    revalidatePath("/admin/members");
    return { error: "", message: `${result.data.displayName} approved as ${result.data.role}.` };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unexpected error.", message: "" };
  }
}

export async function setMemberActive(memberId: string, active: boolean) {
  if (isDemoWorkspace()) return;
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  await supabase.from("members").update({ active }).eq("id", memberId);
  revalidatePath("/admin/members");
}

export async function setMemberRole(memberId: string, role: "admin" | "board_member") {
  if (isDemoWorkspace()) return;
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  await supabase.from("members").update({ role }).eq("id", memberId);
  revalidatePath("/admin/members");
}
