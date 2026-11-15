"use server";

import { revalidatePath } from "next/cache";
import { isDemoWorkspace } from "@/lib/workspace";
import { getRequestAccess } from "./live-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { liveRequestInput } from "./live-contract";

export async function saveLiveRequest(input: unknown): Promise<{ error: string }> {
  if (isDemoWorkspace()) return { error: "Live request writes are disabled in demo mode." };
  const parsed = liveRequestInput.safeParse(input);
  if (!parsed.success) return { error: "Check the request fields and enter a positive goal with at most two decimal places." };
  const access = await getRequestAccess();
  if (access.status !== "signed_in") return { error: access.status === "unavailable" ? "Your session could not be verified. Please try again." : "Sign in before saving a donation request." };
  try {
    const supabase = await createSupabaseServerClient();
    const p = parsed.data;
    const { error } = await supabase.rpc("save_donation_request", { p_id: p.id, p_revision: p.revision,
      p_campaign: p.campaign, p_program_id: p.program_id, p_goal_cents: p.goal_cents,
      p_source: p.source, p_frequency: p.frequency, p_note: p.note, p_state: p.state });
    if (error) {
      if (["PGRST202", "42883"].includes(error.code)) return { error: "The request-funding database migration must be applied first." };
      if (error.code === "42501") return { error: "The project owner must apply 202611140004_request_access.sql to enable request management without staff approval." };
      if (error.message.includes("reload before editing")) return { error: "This request changed. Close the form and refresh before editing again." };
      if (error.message.includes("Allocated funds must be preserved")) return { error: "Keep the funded program active and the goal at least as high as its allocated donations." };
      return { error: "The request could not be saved. Check your access and connection, then refresh before retrying." };
    }
    revalidatePath("/donation-requests");
    return { error: "" };
  } catch { return { error: "Request storage is unavailable. Refresh before retrying." }; }
}
