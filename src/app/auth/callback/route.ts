import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isDemoWorkspace } from "@/lib/workspace";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!isDemoWorkspace() && code) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL("/dashboard", request.url), { headers: { "Cache-Control": "private, no-store" } });
    } catch { /* Fall through to a fixed local sign-in URL, never an untrusted next URL. */ }
  }
  return NextResponse.redirect(new URL("/auth/sign-in?confirmation=failed", request.url), { headers: { "Cache-Control": "private, no-store" } });
}
