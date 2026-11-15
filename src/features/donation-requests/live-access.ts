import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Request metadata requires a verified login, not an approved staff membership.
export const getRequestAccess = cache(async () => {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error && (error.status && error.status >= 500 || error.name === "AuthRetryableFetchError")) return { status: "unavailable" as const };
    if (error || !user) return { status: "signed_out" as const };
    return { status: "signed_in" as const, user };
  } catch { return { status: "unavailable" as const }; }
});
