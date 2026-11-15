import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { CookieOptions } from "@supabase/ssr";
type Cookie = { name: string; value: string; options: CookieOptions };
const mock=vi.hoisted(()=>({create:vi.fn(),getUser:vi.fn()}));
vi.mock("@/features/demo-auth/session",()=>({DEMO_COOKIE:"hackleaf-demo-session",userForToken:async()=>null}));
vi.mock("@supabase/ssr",()=>({createServerClient:mock.create}));
import { proxy } from "./proxy";
let adapter: { getAll: ()=>{name:string;value:string}[]; setAll:(cookies:Cookie[],headers:Record<string,string>)=>void };
beforeEach(()=>{
  vi.resetAllMocks();vi.stubEnv("APP_DATA_MODE","live");vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL","http://supabase.local");vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY","fictional-test-key");
  mock.create.mockImplementation((_url,_key,options)=>{adapter=options.cookies;return {auth:{getUser:mock.getUser}};});
});
afterEach(()=>vi.unstubAllEnvs());
it("persists all cookie chunks and cache headers across multiple SDK writes",async()=>{
  const request=new NextRequest("http://localhost/dashboard",{headers:{cookie:"sb-test-auth-token.0=old0; sb-test-auth-token.1=old1; sb-test-auth-token.2=old2"}});
  mock.getUser.mockImplementation(async()=>{
    adapter.setAll([{name:"sb-test-auth-token.0",value:"new0",options:{path:"/",sameSite:"lax"}},{name:"sb-test-auth-token.2",value:"",options:{path:"/",maxAge:0}}],{"Cache-Control":"private, no-store","Expires":"0","Pragma":"no-cache"});
    adapter.setAll([{name:"sb-test-auth-token.1",value:"new1",options:{path:"/"}}],{});
    expect(adapter.getAll().find(c=>c.name.endsWith(".0"))?.value).toBe("new0");
    return {data:{user:{id:"fictional"}},error:null};
  });
  const response=await proxy(request);
  expect(response.cookies.get("sb-test-auth-token.0")?.value).toBe("new0");
  expect(response.cookies.get("sb-test-auth-token.1")?.value).toBe("new1");
  expect(response.cookies.get("sb-test-auth-token.2")?.maxAge).toBe(0);
  expect(response.headers.get("cache-control")).toContain("no-store");expect(response.headers.get("expires")).toBe("0");expect(response.headers.get("pragma")).toBe("no-cache");
});
it("does not cache signed-out live responses or create unnecessary clients",async()=>{
  const response=await proxy(new NextRequest("http://localhost/dashboard"));expect(response.headers.get("cache-control")).toContain("no-store");expect(mock.create).not.toHaveBeenCalled();
});
it("preserves cookies on transient refresh failures and leaves page authorization independent",async()=>{
  mock.getUser.mockRejectedValue(new Error("offline"));const response=await proxy(new NextRequest("http://localhost/dashboard",{headers:{cookie:"sb-test-auth-token=fictional"}}));expect(response.cookies.getAll()).toEqual([]);expect(response.headers.get("cache-control")).toContain("no-store");
});

it("returns 404 for removed donor self-service URLs in both modes",async()=>{for(const mode of ["demo","live"]){vi.stubEnv("APP_DATA_MODE",mode);for(const path of ["/donor-portal","/donor-portal/register","/donor-portal/login","/donor-portal/donate","/donor-portal/history","/donor-portal/profile"]){expect((await proxy(new NextRequest(`http://localhost${path}`))).status).toBe(404);}}});
it("keeps main's live login gate without accepting a browser mode override",async()=>{
 const response=await proxy(new NextRequest("http://localhost/donors",{headers:{cookie:"APP_DATA_MODE=demo"}}));expect(response.status).toBe(307);expect(response.headers.get("location")).toBe("http://localhost/login?next=%2Fdonors");expect(mock.create).not.toHaveBeenCalled();
 const api=await proxy(new NextRequest("http://localhost/api/v1/overview"));expect(api.status).toBe(200);expect(api.headers.get("cache-control")).toContain("no-store");
});
it("redirects an expired live page session while retaining refreshed cookies",async()=>{
 mock.getUser.mockImplementation(async()=>{adapter.setAll([{name:"sb-test-auth-token",value:"",options:{path:"/",maxAge:0}}],{});return {data:{user:null},error:null};});const response=await proxy(new NextRequest("http://localhost/donors",{headers:{cookie:"sb-test-auth-token=expired"}}));expect(response.status).toBe(307);expect(response.cookies.get("sb-test-auth-token")?.maxAge).toBe(0);
});
