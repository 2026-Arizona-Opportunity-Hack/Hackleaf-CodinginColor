import { expect,it,vi } from "vitest";
vi.mock("server-only",()=>({}));
vi.mock("@/features/case-management/store",()=>({readDemoData:async()=>({clients:[{id:"client-1",name:"Sample Alex",active:true,createdAt:"2026-11-15T12:00:00Z"}],visits:[],appointments:[]})}));
import { runTool } from "./tools";
import type { ToolContext } from "./server-context";
const context={actor:{id:"staff",sessionId:"test",mode:"live",role:"admin",audience:"staff",today:"2026-11-15"},snapshot:null,attachment:null,data:async()=>{throw new Error("Not needed");},db:{rpc:vi.fn()}} as unknown as ToolContext;
it("reads actual live funding snapshots instead of returning disconnected",async()=>{
 vi.mocked(context.db!.rpc).mockResolvedValue({data:{programs:[],requests:[],allocations:[],unallocated_cents:123},error:null} as never);
 expect(await runTool(context,"list_requests",{},()=>{})).toMatchObject({unallocatedCents:123,source:"Saved Supabase funding records"});
 expect(context.db!.rpc).toHaveBeenCalledWith("request_funding_snapshot");
});
it("reads saved client counts and returns only bounded safe search fields",async()=>{
 expect(await runTool(context,"service_overview",{period:"all"},()=>{})).toMatchObject({counts:{clients:1,services:0}});
 const result=await runTool(context,"search_clients",{query:"alex",limit:1},()=>{});
 expect(result).toMatchObject({clients:[{id:"client-1",name:"Sample Alex",serviceEntries:0}],totalMatches:1});
 expect(JSON.stringify(result)).not.toContain("email");
});
