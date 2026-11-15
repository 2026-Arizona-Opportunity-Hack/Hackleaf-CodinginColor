import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mock=vi.hoisted(()=>({demo:vi.fn(),exchange:vi.fn()}));
vi.mock("@/lib/workspace",()=>({isDemoWorkspace:mock.demo}));
vi.mock("@/lib/supabase/server",()=>({createSupabaseServerClient:async()=>({auth:{exchangeCodeForSession:mock.exchange}})}));
import { GET } from "./route";
beforeEach(()=>{vi.resetAllMocks();mock.demo.mockReturnValue(false);mock.exchange.mockResolvedValue({error:null});});
it("lands a confirmed session on the dashboard and ignores external redirects",async()=>{
  const response=await GET(new NextRequest("http://localhost/auth/callback?code=fictional-code&next=https://example.org"));
  expect(mock.exchange).toHaveBeenCalledWith("fictional-code");expect(response.headers.get("location")).toBe("http://localhost/dashboard");expect(response.headers.get("cache-control")).toContain("no-store");
});
it("returns invalid confirmations to the local sign-in page",async()=>{
  mock.exchange.mockResolvedValue({error:new Error("invalid code")});const response=await GET(new NextRequest("http://localhost/auth/callback?code=invalid"));expect(response.headers.get("location")).toBe("http://localhost/auth/sign-in?confirmation=failed");
});
