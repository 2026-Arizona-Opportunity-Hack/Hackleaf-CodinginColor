import { beforeEach, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({ demo:vi.fn(),staff:vi.fn(),rpc:vi.fn(),revalidate:vi.fn() }));
vi.mock("@/lib/workspace",()=>({isDemoWorkspace:mocks.demo}));
vi.mock("./live-access",()=>({getRequestAccess:mocks.staff}));
vi.mock("@/lib/supabase/server",()=>({createSupabaseServerClient:async()=>({rpc:mocks.rpc})}));
vi.mock("next/cache",()=>({revalidatePath:mocks.revalidate}));
import { saveLiveRequest } from "./live-actions";
const input={id:"30000000-0000-4000-8000-000000000001",revision:null,campaign:"Classroom",program_id:"general",goal_cents:10000,source:"zeffy",frequency:"one_time",note:"Classroom supplies",state:"active"};
beforeEach(()=>{vi.resetAllMocks();mocks.demo.mockReturnValue(false);mocks.staff.mockResolvedValue({status:"signed_in"});mocks.rpc.mockResolvedValue({error:null});});
it("does not call storage for demo, invalid amounts or caller-controlled priority",async()=>{
  mocks.demo.mockReturnValue(true);expect((await saveLiveRequest(input)).error).toBeTruthy();
  mocks.demo.mockReturnValue(false);
  expect((await saveLiveRequest({...input,goal_cents:1.5})).error).toBeTruthy();
  expect((await saveLiveRequest({...input,priority:1})).error).toBeTruthy();
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("independently rejects missing or unverifiable sessions",async()=>{
  for(const status of ["signed_out","unavailable"]){mocks.staff.mockResolvedValue({status});expect((await saveLiveRequest(input)).error).toBeTruthy();}
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("saves through the transaction RPC and invalidates the live page",async()=>{
  expect(await saveLiveRequest(input)).toEqual({error:""});
  expect(mocks.rpc).toHaveBeenCalledWith("save_donation_request",expect.objectContaining({p_id:input.id,p_revision:null,p_goal_cents:10000}));
  expect(mocks.revalidate).toHaveBeenCalledWith("/donation-requests");
});
it("surfaces missing migration and stale edits without reporting a successful save",async()=>{
  mocks.rpc.mockResolvedValue({error:{code:"PGRST202",message:"missing"}});
  expect((await saveLiveRequest(input)).error).toMatch(/migration/);
  mocks.rpc.mockResolvedValue({error:{code:"P0001",message:"Request changed; reload before editing"}});
  expect((await saveLiveRequest(input)).error).toMatch(/changed/);
  expect(mocks.revalidate).not.toHaveBeenCalled();
});
