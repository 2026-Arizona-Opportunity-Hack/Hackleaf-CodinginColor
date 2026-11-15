import { mkdtemp,rm,readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { afterEach,beforeEach,expect,it,vi } from "vitest";
const mock=vi.hoisted(()=>({actor:{id:"",name:"Test staff",role:"staff" as "staff"|"admin"},revalidate:vi.fn()}));
vi.mock("server-only",()=>({}));
vi.mock("@/features/demo-auth/session",()=>({requireDemoUser:async()=>mock.actor}));
vi.mock("next/cache",()=>({revalidatePath:mock.revalidate}));
vi.mock("next/navigation",()=>({redirect:(url:string)=>{throw new Error(`REDIRECT:${url}`);}}));
import { readDemoData,mutateDemoData,verifyPassword } from "./store";
import { caseAction } from "./actions";
import { clientInput,validateDemographics,chronologicalVisits,DEMO_ACCOUNTS } from "./model";
let directory:string;
const form=(values:Record<string,string|number>)=>{const f=new FormData();for(const [key,value] of Object.entries(values))f.set(key,String(value));return f;};
const client=()=>form({op:"client.save",name:"P0 Test Client",dateOfBirth:"2000-01-01",email:"test@example.org",phone:"","demographic.gender":"Nonbinary","demographic.language":"English","demographic.household_size":"2","demographic.support_goal":"Resources"});
beforeEach(async()=>{directory=await mkdtemp(join(tmpdir(),"hackleaf-p0-"));vi.stubEnv("DEMO_DATA_DIR",directory);const data=await readDemoData();mock.actor={id:data.users[1].id,name:data.users[1].name,role:"staff"};});
afterEach(async()=>{vi.unstubAllEnvs();await rm(directory,{recursive:true,force:true});});
it("seeds 12 unique fictional clients, 36 linked visits and salted demo accounts",async()=>{
 const data=await readDemoData();expect(data.clients).toHaveLength(12);expect(data.visits).toHaveLength(36);expect(new Set(data.clients.map(c=>c.id)).size).toBe(12);
 expect(data.visits.every(v=>data.clients.some(c=>c.id===v.clientId))).toBe(true);expect(await verifyPassword(DEMO_ACCOUNTS.admin.password,data.users[0])).toBe(true);expect(await verifyPassword("wrong-password",data.users[0])).toBe(false);
 expect(await readFile(join(directory,"workspace.json"),"utf8")).not.toContain(DEMO_ACCOUNTS.admin.password);
});
it("lets Staff create clients and services with server-assigned author and persistent unique IDs",async()=>{
 await expect(caseAction({error:"",message:""},client())).rejects.toThrow(/REDIRECT:\/clients\//);
 let data=await readDemoData();const c=data.clients.find(c=>c.name==="P0 Test Client")!;expect(c.id).toMatch(/^[0-9a-f-]{36}$/);
 const result=await caseAction({error:"",message:""},form({op:"visit.save",clientId:c.id,date:"2026-01-01",serviceTypeId:"intake",notes:"New fictional visit",staffId:randomBytes(16).toString("hex"),staffName:"Forged admin"}));
 expect(result.error).toBe("");data=await readDemoData();const v=data.visits.find(v=>v.clientId===c.id)!;expect(v.staffId).toBe(mock.actor.id);expect(v.staffName).toBe(mock.actor.name);
});
it("rejects forged Staff edit/delete/settings requests on the server",async()=>{
 const data=await readDemoData(),c=data.clients[0],v=data.visits[0];
 for(const attempt of [form({op:"client.save",id:c.id,revision:1}),form({op:"client.delete",id:c.id}),form({op:"visit.save",id:v.id}),form({op:"visit.delete",id:v.id}),form({op:"field.delete",id:"gender",settingsRevision:1})])expect((await caseAction({error:"",message:""},attempt)).error).toMatch(/Only an Admin/);
 expect((await readDemoData()).clients).toHaveLength(12);expect((await readDemoData()).visits).toHaveLength(36);
});
it("supports Admin CRUD, rejects stale edits and removes a deleted client's service entries",async()=>{
 mock.actor.role="admin";const data=await readDemoData(),c=data.clients[0];const update=client();update.set("id",c.id);update.set("revision","1");
 await expect(caseAction({error:"",message:""},update)).rejects.toThrow(/REDIRECT/);
 expect((await readDemoData()).clients.find(r=>r.id===c.id)?.revision).toBe(2);
 expect((await caseAction({error:"",message:""},update)).error).toMatch(/changed/);
 const visit=(await readDemoData()).visits.find(v=>v.clientId===c.id)!;
 expect((await caseAction({error:"",message:""},form({op:"visit.save",id:visit.id,revision:visit.revision,clientId:c.id,date:visit.date,serviceTypeId:visit.serviceTypeId,notes:"Edited by admin"}))).error).toBe("");
 expect((await caseAction({error:"",message:""},form({op:"visit.delete",id:visit.id}))).error).toBe("");
 await expect(caseAction({error:"",message:""},form({op:"client.delete",id:c.id}))).rejects.toThrow(/REDIRECT:\/clients$/);
 expect((await readDemoData()).visits.some(v=>v.clientId===c.id)).toBe(false);
});
it("keeps configurable demographics within 3–5 fields and preserves historical service labels",async()=>{
 mock.actor.role="admin";
 expect((await caseAction({error:"",message:""},form({op:"field.save",settingsRevision:1,label:"Household language notes",type:"text",options:""}))).error).toBe("");
 expect((await caseAction({error:"",message:""},form({op:"field.save",settingsRevision:2,label:"Sixth field",type:"text"}))).error).toMatch(/3–5/);
 expect((await caseAction({error:"",message:""},form({op:"service.delete",id:"intake",settingsRevision:2}))).error).toBe("");
 const data=await readDemoData();expect(data.serviceTypes.find(t=>t.id==="intake")?.active).toBe(false);expect(data.visits.some(v=>v.serviceTypeLabel==="Intake assessment")).toBe(true);
});
it("validates dates, contacts and dynamic demographics and sorts history newest first",async()=>{
 expect(clientInput.safeParse({name:"Test",dateOfBirth:"2999-01-01",email:"",phone:"",demographics:{}}).success).toBe(false);
 const data=await readDemoData();expect(()=>validateDemographics({gender:"Unlisted"},data.fields)).toThrow();expect(()=>validateDemographics({household_size:"-2"},data.fields)).toThrow();expect(()=>validateDemographics({unexpected:"Bad"},data.fields)).toThrow();
 const visits=chronologicalVisits(data.visits,data.clients[0].id);expect(visits.map(v=>v.date)).toEqual(visits.map(v=>v.date).sort().reverse());
});
it("serializes concurrent writes without losing records",async()=>{
 await Promise.all(Array.from({length:10},(_,index)=>mutateDemoData(data=>{data.clients.push({...data.clients[0],id:`test-${index}`,name:`Concurrent ${index}`});})));
 expect((await readDemoData()).clients).toHaveLength(22);
});
