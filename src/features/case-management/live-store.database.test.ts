import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";
const db = new PGlite();
const admin="a0000000-0000-4000-8000-000000000001", staff="a0000000-0000-4000-8000-000000000002", outsider="a0000000-0000-4000-8000-000000000003";
beforeAll(async()=>{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;insert into auth.users values('${admin}'),('${staff}'),('${outsider}');`);
  for(const name of ["202611140001_foundation.sql","202611140003_request_funding.sql","202611140004_request_access.sql","202611150004_live_case_workspace.sql"]) await db.exec(readFileSync(new URL(`../../../supabase/migrations/${name}`,import.meta.url),"utf8"));
  await db.exec(`insert into public.members(id,display_name,role) values('${admin}','Admin','admin'),('${staff}','Staff','board_member');`);
},60000);
afterAll(()=>db.close());
async function as<T>(id:string,work:()=>Promise<T>){await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`);try{return await work();}finally{await db.exec("reset role");}}
async function state(){return (await db.query<{data:Record<string,Record<string,unknown>[]>;revision:number}>("select data,revision from public.case_workspaces")).rows[0];}
async function save(id:string,data:unknown,revision:number){return as(id,()=>db.query("select public.case_workspace_save($1,$2::jsonb)",[revision,JSON.stringify(data)]));}
it("starts empty without demo people, passwords or sessions",async()=>{const {data}=await state();expect(data.clients).toEqual([]);expect(data.visits).toEqual([]);expect(data.users).toBeUndefined();expect(data.sessions).toBeUndefined();});
it("denies outsiders and direct writes even to an authenticated admin",async()=>{expect((await as(outsider,()=>db.query("select * from public.case_workspaces"))).rows).toEqual([]);const {data,revision}=await state();await expect(save(outsider,data,revision)).rejects.toThrow();await expect(as(admin,()=>db.exec("delete from public.case_workspaces"))).rejects.toThrow();});
it("persists staff-created records, rejects stale writes and protects configuration",async()=>{
 const before=await state();const next=structuredClone(before.data);next.clients.push({id:crypto.randomUUID(),name:"Real workflow test",active:true});await save(staff,next,before.revision);expect((await state()).data.clients).toHaveLength(1);await expect(save(staff,next,before.revision)).rejects.toThrow(/changed/);
 const current=await state();const tampered=structuredClone(current.data);tampered.fields=[];await expect(save(staff,tampered,current.revision)).rejects.toThrow(/Admin/);
});
it("protects existing client records from staff changes and allows admin changes",async()=>{const {data,revision}=await state();const next=structuredClone(data);next.clients[0]={...next.clients[0],name:"Edited"};await expect(save(staff,next,revision)).rejects.toThrow(/admin/);await save(admin,next,revision);expect((await state()).data.clients[0]).toMatchObject({name:"Edited"});});
it("normalizes audit attribution and rejects document impersonation",async()=>{const {data,revision}=await state();const next=structuredClone(data);next.audit.push({id:crypto.randomUUID(),actorId:admin,actorName:"Forged",at:"2000-01-01",action:"client.create"});await save(staff,next,revision);expect((await state()).data.audit[0]).toMatchObject({actorId:staff,actorName:"Staff"});const current=await state();current.data.documents.push({id:crypto.randomUUID(),clientId:(current.data.clients[0] as {id:string}).id,createdBy:admin});await expect(save(staff,current.data,current.revision)).rejects.toThrow(/author/);});
it("adds labeled samples once without replacing existing client records",async()=>{
 const sql=readFileSync(new URL("../../../supabase/seeds/labeled_samples.sql",import.meta.url),"utf8");
 await db.exec(sql);const seeded=await state();expect(seeded.data.clients).toHaveLength(13);expect(seeded.data.visits).toHaveLength(36);expect(seeded.data.appointments).toHaveLength(8);expect(seeded.data.clients[0]).toMatchObject({name:"Edited"});expect((await db.query("select * from public.donors where name like 'Sample %'")).rows).toHaveLength(6);
 await db.exec(sql);expect((await state()).data.clients).toHaveLength(13);expect((await state()).data.visits).toHaveLength(36);
});
