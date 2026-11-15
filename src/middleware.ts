import { TENANT_COOKIE } from "@/features/client-p2/tenants";
import { DEMO_COOKIE, userForToken } from "@/features/demo-auth/session";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refresh cookies here; each data page/action still verifies identity and access.
export async function middleware(request: NextRequest) {
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
  const path=request.nextUrl.pathname;
  const publicPage=["/login","/auth/sign-in","/auth/register","/auth/callback","/auth/session","/manifest.webmanifest","/sw.js","/offline.html"].includes(path);
  const protectedPage=!path.startsWith("/api/")&&!publicPage;
  const redirectToLogin=()=>{const target=new URL("/login",request.url);target.searchParams.set("next",path);const denied=NextResponse.redirect(target);response.cookies.getAll().forEach(cookie=>denied.cookies.set(cookie));denied.headers.set("Cache-Control","private, no-store");return denied;};
  response.headers.set("Cache-Control", "private, no-store");
  if (!url || !key) return response;
  if(!request.cookies.getAll().some(cookie=>cookie.name.startsWith("sb-")))return protectedPage?redirectToLogin():response;
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
  try { const result=await supabase.auth.getUser();if(!result.error&&!result.data.user&&protectedPage)return redirectToLogin(); } catch { /* Protected pages fail closed independently on transient errors. */ }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.svg|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)"] };
