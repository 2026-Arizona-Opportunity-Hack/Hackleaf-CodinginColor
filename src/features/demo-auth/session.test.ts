import { mkdtemp,rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { afterEach,beforeEach,expect,it,vi } from "vitest";
vi.mock("server-only",()=>({}));
import { userForToken,sessionHash } from "./session";
import { readDemoData,mutateDemoData } from "@/features/case-management/store";
let directory:string;
beforeEach(async()=>{directory=await mkdtemp(join(tmpdir(),"hackleaf-session-"));vi.stubEnv("DEMO_DATA_DIR",directory);vi.stubEnv("APP_DATA_MODE","demo");});
afterEach(async()=>{vi.unstubAllEnvs();await rm(directory,{recursive:true,force:true});});
it("rejects absent/forged/expired sessions and returns only public account fields",async()=>{
 expect(await userForToken(undefined)).toBeNull();expect(await userForToken("forged")).toBeNull();expect(await userForToken(randomBytes(32).toString("hex"))).toBeNull();
 const data=await readDemoData(),token=randomBytes(32).toString("hex");await mutateDemoData(d=>{d.sessions.push({hash:sessionHash(token),userId:data.users[0].id,expiresAt:Date.now()+60000});});
 expect(await userForToken(token)).toEqual({id:data.users[0].id,name:"Demo Administrator",email:data.users[0].email,role:"admin"});
 await mutateDemoData(d=>{d.sessions[0].expiresAt=0;});expect(await userForToken(token)).toBeNull();
});
it("does not accept demo sessions in live mode",async()=>{vi.stubEnv("APP_DATA_MODE","live");expect(await userForToken(randomBytes(32).toString("hex"))).toBeNull();});
