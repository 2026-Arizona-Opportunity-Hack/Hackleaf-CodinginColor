import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";

const db = new PGlite();
const admin = "10000000-0000-4000-8000-000000000001", board = "10000000-0000-4000-8000-000000000002";
const other = "10000000-0000-4000-8000-000000000003", outsider = "10000000-0000-4000-8000-000000000004";
const donorA = "20000000-0000-4000-8000-000000000001", donorB = "20000000-0000-4000-8000-000000000002";
let receipt = 0;
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    insert into auth.users values ('${admin}'),('${board}'),('${other}'),('${outsider}');`);
  await db.exec(readFileSync(new URL("../../../supabase/migrations/202611140001_foundation.sql", import.meta.url), "utf8"));
  await db.exec(`insert into public.members(id,display_name,role) values
    ('${admin}','Test admin','admin'),('${board}','Test board','board_member'),('${other}','Other board','board_member');
    insert into public.programs values ('ai-academy','AI Academy'),('summer-camp','Summer Camp');
    insert into public.donors(id,name,kind,owner_id) values
    ('${donorA}','Fictional A','individual','${board}'),('${donorB}','Fictional B','individual','${other}');
    insert into public.gifts(donor_id,amount_cents,received_on,program_id,source,source_record_id)
      values ('${donorA}',100000,'2025-01-01','ai-academy','zeffy','historic');`);
  await db.exec(readFileSync(new URL("../../../supabase/migrations/202611140003_request_funding.sql", import.meta.url), "utf8"));
  await db.exec(readFileSync(new URL("../../../supabase/migrations/202611140004_request_access.sql", import.meta.url), "utf8"));
}, 30000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.exec("reset role; truncate public.donation_allocations, private.request_receipts, public.donation_requests; delete from public.gifts where source_record_id <> 'historic';");
});
async function asUser<T>(id: string, fn: () => Promise<T>) {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
  try { return await fn(); } finally { await db.exec("reset role"); }
}
async function save(id: string, goal = 10000, program = "ai-academy", revision: number | null = null, state = "active") {
  return asUser(admin, () => db.query("select public.save_donation_request($1,$2,'Learning materials',$3,$4,'zeffy','one_time','Classroom supplies',$5)", [id,revision,program,goal,state]));
}
const r1 = "30000000-0000-4000-8000-000000000001", r2 = "30000000-0000-4000-8000-000000000002";
async function gift(amount: number, program = "general", donor = donorA, key = `receipt-${++receipt}`) {
  return asUser(admin, () => db.query("insert into public.gifts(donor_id,amount_cents,received_on,program_id,source,source_record_id) values ($1,$2,'2026-11-14',$3,'zeffy',$4) returning id", [donor,amount,program,key]));
}
async function snapshot(user = admin) {
  return asUser(user, async () => (await db.query<{ data: { requests: { priority: number }[]; allocations: { request_id: string; amount_cents: number; donor_name: string; received_on: string | null }[]; unallocated_cents: number } }>("select public.request_funding_snapshot() data")).rows[0].data);
}
it("adds two donors' receipts and fills the first unique priority before the next", async () => {
  await save(r1); await save(r2);
  await gift(2000); await gift(1000,"general",donorB);
  let data = await snapshot();
  expect(data.requests.map(r => r.priority)).toEqual([1,2]);
  expect(data.allocations.reduce((s,a) => s+a.amount_cents,0)).toBe(3000);
  expect(data.allocations.every(a => a.request_id === r1)).toBe(true);
  await gift(10000);
  data = await snapshot();
  expect(data.allocations.filter(a => a.request_id===r1).reduce((s,a) => s+a.amount_cents,0)).toBe(10000);
  expect(data.allocations.filter(a => a.request_id===r2).reduce((s,a) => s+a.amount_cents,0)).toBe(3000);
  expect(data.unallocated_cents).toBe(0);
});
it("preserves restricted gifts and blocks lower programs until priority one is funded", async () => {
  await save(r1); await save(r2,10000,"summer-camp");
  await gift(5000,"summer-camp");
  expect((await snapshot()).allocations).toEqual([]);
  await gift(10000,"general");
  const data=await snapshot();
  expect(data.allocations.map(a=>[a.request_id,a.amount_cents]).sort()).toEqual([[r1,10000],[r2,5000]]);
});
it("does not silently backfill historic gifts; preserves overflow until a new request activates", async () => {
  await save(r1,1000); expect((await snapshot()).allocations).toEqual([]);
  await gift(1500); expect((await snapshot()).unallocated_cents).toBe(500);
  await save(r2,2000,"ai-academy",null,"draft");
  expect((await snapshot()).unallocated_cents).toBe(500);
  await save(r2,2000,"ai-academy",1);
  expect((await snapshot()).unallocated_cents).toBe(0);
});
it("makes request and source-receipt retries idempotent", async () => {
  await save(r1); await save(r1); await save(r2);
  await gift(2000,"general",donorA,"stable-source");
  await expect(gift(2000,"general",donorA,"stable-source")).rejects.toThrow();
  const data=await snapshot();
  expect(data.requests.map(r=>r.priority)).toEqual([1,2]);
  expect(data.allocations).toHaveLength(1);
});
it("prevents stale edits, reducing funded goals, redrafting and redesignating receipts", async () => {
  await save(r1); await gift(3000);
  await expect(save(r1,2000,"ai-academy",1)).rejects.toThrow(/preserved/);
  await expect(save(r1,10000,"summer-camp",1)).rejects.toThrow(/preserved/);
  await expect(save(r1,10000,"ai-academy",1,"draft")).rejects.toThrow(/preserved/);
  await save(r1,12000,"ai-academy",1);
  await expect(save(r1,15000,"ai-academy",1)).rejects.toThrow(/changed/);
  await asUser(admin, async()=>{
    await expect(db.exec("update public.gifts set amount_cents=1 where source_record_id <> 'historic'")).rejects.toThrow(/immutable/);
    await expect(db.exec("delete from public.gifts where source_record_id <> 'historic'")).rejects.toThrow(/immutable/);
    await expect(db.exec("update public.programs set is_general=false where id='general'")).rejects.toThrow(/fixed/);
  });
});
it("hides other board members' donor identities while keeping accurate request totals", async () => {
  await save(r1); await gift(2000); await gift(1000,"general",donorB);
  const data=await snapshot(board);
  expect(data.allocations.map(a=>a.donor_name).sort()).toEqual(["Fictional A","Restricted donor"]);
  expect(data.allocations.find(a=>a.donor_name === "Restricted donor")!.received_on).toBeNull();
  expect(JSON.stringify(data)).not.toContain(donorB);
  await asUser(board,async()=>expect((await db.query("select * from public.donation_allocations")).rows).toHaveLength(1));
});
it("rejects anonymous RPCs and direct ledger or priority writes", async () => {
  await db.exec("set role anon");
  try { await expect(db.query("select public.request_funding_snapshot()")).rejects.toThrow(); } finally { await db.exec("reset role"); }
  await save(r1);
  await asUser(admin,async()=>{
    await expect(db.exec("update public.donation_requests set priority=9")).rejects.toThrow();
    await expect(db.exec("insert into public.donation_allocations values(gen_random_uuid(),gen_random_uuid(),100,now())")).rejects.toThrow();
    await expect(db.exec("select private.allocate_request_funds()")).rejects.toThrow();
  });
});
it("rolls back receipt and every split together if allocation fails", async()=>{
  await save(r1,1000); await save(r2,1000);
  await db.exec(`create function private.test_allocation_failure() returns trigger language plpgsql as $$
    begin if new.request_id='${r2}' then raise exception 'test allocation failure'; end if; return new; end $$;
    create trigger test_allocation_failure before insert on public.donation_allocations for each row execute function private.test_allocation_failure();`);
  try {
    await expect(gift(2000,"general",donorA,"rollback-test")).rejects.toThrow(/test allocation failure/);
    expect((await snapshot()).allocations).toEqual([]);
    expect((await db.query("select id from public.gifts where source_record_id='rollback-test'")).rows).toHaveLength(0);
  } finally { await db.exec("drop trigger test_allocation_failure on public.donation_allocations; drop function private.test_allocation_failure();"); }
});

it("allows an unapproved signed-in account to create/edit requests without exposing donors", async()=>{
  await gift(3000);
  await asUser(outsider,async()=>{
    await db.query("select public.save_donation_request($1,null,'Unapproved account request','general',10000,'zeffy','one_time','Supplies','active')",[r1]);
    await db.query("select public.save_donation_request($1,1,'Updated request','general',12000,'zeffy','one_time','Supplies','active')",[r1]);
    expect((await db.query("select * from public.donation_requests")).rows).toHaveLength(1);
    expect((await db.query("select * from public.donors")).rows).toHaveLength(0);
    expect((await db.query("select * from public.gifts")).rows).toHaveLength(0);
    expect((await db.query("select * from public.members")).rows).toHaveLength(0);
  });
  const data=await snapshot(outsider);
  expect(data.allocations).toHaveLength(1);
  expect(data.allocations[0]).toMatchObject({amount_cents:3000,donor_name:"Restricted donor",received_on:null});
});
