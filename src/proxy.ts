import { TENANT_COOKIE } from "@/features/client-p2/tenants";
import { DEMO_COOKIE, userForToken } from "@/features/demo-auth/session";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refresh cookies here; each data page/action still verifies identity and access.
export async function proxy(request: NextRequest) {
  if(request.nextUrl.pathname==="/donor-portal"||request.nextUrl.pathname.startsWith("/donor-portal/"))return new NextResponse(null,{status:404});
  let response = NextResponse.next({ request });
  const written = new Map<string, { name: string; value: string; options: import("@supabase/ssr").CookieOptions }>();
  const cacheHeaders = new Map<string, string>();
  if ((process.env.APP_DATA_MODE ?? "demo") !== "live") {
    const path=request.nextUrl.pathname;
    const publicPath=["/auth/sign-in","/auth/register","/auth/session","/api/health","/organizations","/auth/organization","/manifest.webmanifest","/sw.js","/offline.html","/api/client-integrations"].includes(path);
    const user=await userForToken(request.cookies.get(DEMO_COOKIE)?.value,request.cookies.get(TENANT_COOKIE)?.value);
    if(!user && !publicPath) {
      const denied=path.startsWith("/api/") ? NextResponse.json({error:"unauthorized"},{status:401}) : NextResponse.redirect(new URL("/auth/sign-in",request.url));
      denied.headers.set("Cache-Control","private, no-store");return denied;
    }
    response.headers.set("Cache-Control","private, no-store");return response;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  response.headers.set("Cache-Control", "private, no-store");
  if (!url || !key || !request.cookies.getAll().some((cookie) => cookie.name.startsWith("sb-"))) return response;
  const supabase = createServerClient(url, key, { cookies: {
    getAll: () => request.cookies.getAll(),
    setAll: (cookies, headers) => {
      cookies.forEach(({ name, value }) => request.cookies.set(name, value));
      cookies.forEach(cookie => written.set(cookie.name, cookie));
      Object.entries(headers).forEach(([name, value]) => cacheHeaders.set(name, value));
      response = NextResponse.next({ request });
      written.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      cacheHeaders.forEach((value, name) => response.headers.set(name, value));
    },
  } });
  try { await supabase.auth.getUser(); } catch { /* Protected pages fail closed independently. */ }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.svg|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)"] };
