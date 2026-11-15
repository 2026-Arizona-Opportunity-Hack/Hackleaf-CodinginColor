import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";

const db = new PGlite();
const admin = "a0000000-0000-4000-8000-000000000001", board = "a0000000-0000-4000-8000-000000000002", other = "a0000000-0000-4000-8000-000000000003", outsider = "a0000000-0000-4000-8000-000000000004";
const donorA = "b0000000-0000-4000-8000-000000000001", donorB = "b0000000-0000-4000-8000-000000000002";
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
    insert into auth.users values('${admin}'),('${board}'),('${other}'),('${outsider}');`);
  for (const filename of ["202611140001_foundation.sql", "202611140003_assistant.sql", "202611150008_assistant_owner_compat.sql"]) await db.exec(readFileSync(new URL(`../../../supabase/migrations/${filename}`, import.meta.url), "utf8"));
  await db.exec(`insert into public.members(id,display_name,role) values('${admin}','Admin','admin'),('${board}','Board','board_member'),('${other}','Other','board_member');
    insert into public.programs values('ai-academy','AI Academy');
    insert into public.donors(id,name,kind,owner_id) values('${donorA}','Fictional A','individual','${board}'),('${donorB}','Fictional B','individual','${other}');`);
}, 60000);
afterAll(async () => { await db.close(); });
async function as<T>(id: string, fn: () => Promise<T>) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${id}',false);`);
  try { return await fn(); } finally { await db.exec("reset role"); }
}
async function baseline(donorId: string) { return (await db.query<{ value: Record<string, unknown> }>("select to_jsonb(d) as value from public.donors d where id=$1", [donorId])).rows[0].value; }
async function apply(actor: string, id: string, operation: string, input: unknown, before: unknown) {
  return as(actor, () => db.query<{ result: { id: string; state: string; replayed?: boolean } }>("select public.assistant_apply_action($1,$2,$3::jsonb,$4::jsonb) as result", [id, operation, JSON.stringify(input), JSON.stringify(before)]));
}

it("denies cross-owner actions, admin escalation and unsupported operations", async () => {
  const before = await baseline(donorB);
  await expect(apply(board, crypto.randomUUID(), "create_follow_up", { donorId: donorB, title: "Forbidden", dueOn: "2026-11-16", kind: "check_in" }, before)).rejects.toThrow();
  await expect(apply(board, crypto.randomUUID(), "create_donor", { name: "Forbidden", kind: "individual", email: null }, {})).rejects.toThrow();
  await expect(apply(outsider, crypto.randomUUID(), "create_follow_up", { donorId: donorA, title: "Forbidden", dueOn: "2026-11-16", kind: "check_in" }, await baseline(donorA))).rejects.toThrow();
  await expect(apply(admin, crypto.randomUUID(), "execute_sql", { query: "drop table donors" }, {})).rejects.toThrow();
});

it("applies an owned next step exactly once and rejects stale review", async () => {
  const id = crypto.randomUUID(), before = await baseline(donorA);
  const input = { donorId: donorA, title: "Confirmed next step", dueOn: "2026-11-16", kind: "check_in" };
  expect((await apply(board, id, "create_follow_up", input, before)).rows[0].result.id).toBe(id);
  expect((await apply(board, id, "create_follow_up", input, before)).rows[0].result.replayed).toBe(true);
  expect((await db.query("select id from public.follow_ups where id=$1", [id])).rows).toHaveLength(1);
  const task = (await db.query<{ value: unknown }>("select to_jsonb(t) as value from public.follow_ups t where id=$1", [id])).rows[0].value;
  await db.query("update public.follow_ups set title='Changed after review' where id=$1", [id]);
  await expect(apply(board, crypto.randomUUID(), "update_follow_up", { taskId: id, title: "Stale", dueOn: "2026-11-16", status: "completed" }, task)).rejects.toThrow();
  expect((await db.query<{ status: string }>("select status from public.follow_ups where id=$1", [id])).rows[0].status).toBe("open");
});

it("saves an unapproved draft and logs only manual contact by the real actor", async () => {
  const before = await baseline(donorA), draftId = crypto.randomUUID();
  await apply(board, draftId, "draft_outreach", { donorId: donorA, channel: "email", subject: "Thanks", body: "Thank you for your recorded support." }, before);
  expect((await db.query("select state,approved_by,sent_at from public.outreach_drafts where id=$1", [draftId])).rows[0]).toEqual({ state: "draft", approved_by: null, sent_at: null });
  const communicationId = crypto.randomUUID();
  await apply(board, communicationId, "log_communication", { donorId: donorA, channel: "phone", summary: "Human confirmed call", occurredOn: "2026-01-01", actorId: admin, origin: "provider_receipt" }, before);
  expect((await db.query("select actor_id,origin from public.communications where id=$1", [communicationId])).rows[0]).toEqual({ actor_id: board, origin: "manual_log" });
  await expect(apply(board, crypto.randomUUID(), "log_communication", { donorId: donorA, channel: "phone", summary: "Future", occurredOn: "2099-01-01" }, before)).rejects.toThrow();
});

it("balances new ownership atomically and rejects ambiguous duplicate emails", async () => {
  const first = crypto.randomUUID(), second = crypto.randomUUID();
  await apply(admin, first, "create_donor", { name: "Fictional New 1", kind: "individual", email: "new@example.org" }, {});
  await apply(admin, second, "create_donor", { name: "Fictional New 2", kind: "individual", email: null }, {});
  const owners = (await db.query<{ owner_id: string }>("select owner_id from public.donors where id=any($1::uuid[])", [[first, second]])).rows.map((r) => r.owner_id);
  expect(new Set(owners).size).toBe(2);
  await expect(apply(admin, crypto.randomUUID(), "create_donor", { name: "Duplicate", kind: "individual", email: "NEW@example.org" }, {})).rejects.toThrow();
});

it("persists usage caps, denies inactive users and protects receipts from forgery", async () => {
  await as(board, async () => {
    for (let i = 0; i < 60; i++) expect((await db.query<{ ok: boolean }>("select public.assistant_reserve_turn() as ok")).rows[0].ok).toBe(true);
    expect((await db.query<{ ok: boolean }>("select public.assistant_reserve_turn() as ok")).rows[0].ok).toBe(false);
    await expect(db.exec(`insert into public.assistant_action_receipts(id,actor_id,operation,request_hash,result) values(gen_random_uuid(),'${board}','fake','fake','{}')`)).rejects.toThrow();
  });
  await db.query("update public.members set active=false where id=$1", [other]);
  await expect(as(other, () => db.query("select public.assistant_reserve_turn()"))).rejects.toThrow();
  await db.exec("set role anon");
  try { await expect(db.query("select public.assistant_reserve_turn()")).rejects.toThrow(); }
  finally { await db.exec("reset role"); }
});

it("supports the live admin-owned roster without weakening action authorization", async()=>{
 await db.query("update public.members set active=false where role='board_member'");
 try { const donor=crypto.randomUUID();await apply(admin,donor,"create_donor",{name:"Sample admin-owned donor",kind:"individual",email:null},{});
 expect((await db.query<{owner_id:string}>("select owner_id from public.donors where id=$1",[donor])).rows[0].owner_id).toBe(admin);
 await apply(admin,crypto.randomUUID(),"create_follow_up",{donorId:donor,title:"Reviewed next step",dueOn:"2026-11-16",kind:"check_in"},await baseline(donor));
 }finally{await db.query("update public.members set active=true where id=$1",[board]);}
});
