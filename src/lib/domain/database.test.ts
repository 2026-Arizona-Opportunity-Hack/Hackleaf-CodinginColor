import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";

const db = new PGlite();
const admin = "10000000-0000-4000-8000-000000000001";
const boardA = "10000000-0000-4000-8000-000000000002";
const boardB = "10000000-0000-4000-8000-000000000003";
const outsider = "10000000-0000-4000-8000-000000000004";
const donorA = "20000000-0000-4000-8000-000000000001";
const donorB = "20000000-0000-4000-8000-000000000002";

beforeAll(async () => {
  // Emulate only Supabase's auth identity boundary; production auth is still unverified.
  await db.exec(`create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    insert into auth.users values ('${admin}'),('${boardA}'),('${boardB}'),('${outsider}');`);
  await db.exec(readFileSync(new URL("../../../supabase/migrations/202611140001_foundation.sql", import.meta.url), "utf8"));
  await db.exec(`insert into public.members(id,display_name,role) values
    ('${admin}','Admin','admin'),('${boardA}','Board A','board_member'),('${boardB}','Board B','board_member');
    insert into public.programs values ('ai-academy','AI Academy');
    insert into public.donors(id,name,kind,owner_id) values
    ('${donorA}','Fictional A','individual','${boardA}'),('${donorB}','Fictional B','individual','${boardB}');
    insert into public.gifts(donor_id,amount_cents,received_on,program_id,source,source_record_id) values
    ('${donorA}',10000,'2026-11-01','ai-academy','zeffy','source-a'),
    ('${donorB}',20000,'2026-11-01','ai-academy','benevity','source-b');`);
}, 30000);
afterAll(async () => { await db.close(); });

async function asUser<T>(id: string, action: () => Promise<T>) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${id}',false);`);
  try { return await action(); } finally { await db.exec("reset role"); }
}

it("enforces owner isolation for donor and related gift reads", async () => {
  await asUser(boardA, async () => {
    expect((await db.query<{ id: string }>("select id from public.donors")).rows.map((r) => r.id)).toEqual([donorA]);
    expect((await db.query<{ donor_id: string }>("select donor_id from public.gifts")).rows.map((r) => r.donor_id)).toEqual([donorA]);
    expect((await db.query("select * from public.donors where id = $1", [donorB])).rows).toHaveLength(0);
  });
  await asUser(admin, async () => expect((await db.query("select * from public.donors")).rows).toHaveLength(2));
});

it("denies nonmembers, anonymous reads and client role promotion", async () => {
  await asUser(outsider, async () => expect((await db.query("select * from public.donors")).rows).toHaveLength(0));
  await asUser(boardA, async () => {
    await expect(db.exec("update public.members set role='admin'")).rejects.toThrow();
    await expect(db.exec(`insert into public.gifts(donor_id,amount_cents,received_on,program_id,source,source_record_id) values ('${donorA}',1,'2026-11-01','ai-academy','zeffy','forbidden')`)).rejects.toThrow();
  });
  await db.exec("set role anon");
  try { await expect(db.query("select * from public.donors")).rejects.toThrow(); }
  finally { await db.exec("reset role"); }
});

it("allows an owned manual communication and blocks cross-owner or forged delivery", async () => {
  await asUser(boardA, async () => {
    const insert = (donor: string, origin: string, receipt: string) => db.exec(`insert into public.communications(donor_id,actor_id,channel,summary,occurred_at,origin,provider_receipt_id) values ('${donor}','${boardA}','email','Fictional test',now(),'${origin}',${receipt})`);
    await insert(donorA, "manual_log", "null");
    await expect(insert(donorB, "manual_log", "null")).rejects.toThrow();
    await expect(insert(donorA, "provider_receipt", "'fake-receipt'")).rejects.toThrow();
  });
});

it("prevents duplicate source gifts and invalidates approval after draft edits", async () => {
  await expect(db.exec(`insert into public.gifts(donor_id,amount_cents,received_on,program_id,source,source_record_id) values ('${donorA}',10000,'2026-11-01','ai-academy','zeffy','source-a')`)).rejects.toThrow();
  const draftId = "30000000-0000-4000-8000-000000000001";
  await db.exec(`insert into public.outreach_drafts(id,donor_id,channel,body,state,approved_by,approved_at) values ('${draftId}','${donorA}','email','Original','approved','${admin}',now());
    update public.outreach_drafts set body='Changed' where id='${draftId}';`);
  const result = await db.query<{ state: string; approved_by: string | null }>("select state,approved_by from public.outreach_drafts where id=$1", [draftId]);
  expect(result.rows[0]).toEqual({ state: "draft", approved_by: null });
  await db.exec(`update public.outreach_drafts set state='sent',approved_by='${admin}',approved_at=now(),sent_at=now(),provider_receipt_id='verified-test-receipt' where id='${draftId}'`);
  await expect(db.exec(`update public.outreach_drafts set body='Cannot edit sent copy' where id='${draftId}'`)).rejects.toThrow();
});

it("revokes owned donor access when a member is disabled", async () => {
  await db.exec(`update public.members set active=false where id='${boardB}'`);
  await asUser(boardB, async () => expect((await db.query("select * from public.gifts")).rows).toHaveLength(0));
});
