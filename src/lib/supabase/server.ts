import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Request-scoped and user-scoped. Never substitute a service-role client here.
export async function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured. Keep APP_DATA_MODE=demo until setup is complete.");
  const store = await cookies();
  return createServerClient(url, key, { cookies: {
    getAll: () => store.getAll(),
    setAll: (updates) => {
      // Cookie refresh belongs in a Route Handler/Server Action or proxy.
      // Server Component callers cannot persist cookie updates.
      try { updates.forEach(({ name, value, options }) => store.set(name, value, options)); }
      catch { /* Read-only Server Components rely on proxy.ts to persist refreshes. */ }
    },
  } });
}
