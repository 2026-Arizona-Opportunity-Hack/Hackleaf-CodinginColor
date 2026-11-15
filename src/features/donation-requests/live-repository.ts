import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fundingSnapshot } from "./live-contract";

export async function loadRequestFunding() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("request_funding_snapshot");
  if (error) throw new Error(["PGRST202", "PGRST205", "42883"].includes(error.code) ? "migration_required" : "funding_unavailable");
  return fundingSnapshot.parse(data);
}
