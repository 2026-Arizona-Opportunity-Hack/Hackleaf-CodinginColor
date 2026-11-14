import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PGlite();
const adminId = "10000000-0000-4000-8000-000000000011";
const boardId = "10000000-0000-4000-8000-000000000012";
const donorId = "20000000-0000-4000-8000-000000000011";

beforeAll(async () => {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    insert into auth.users values ('${adminId}'),('${boardId}');
  `);
  await db.exec(readFileSync(
    new URL("../../../supabase/migrations/202611140001_foundation.sql", import.meta.url), "utf8",
  ));
  await db.exec(`
    insert into public.members(id, display_name, role) values
      ('${adminId}', 'Admin', 'admin'), ('${boardId}', 'Board', 'board_member');
    insert into public.programs values ('ai-academy', 'AI Academy');
    insert into public.donors(id, name, kind, owner_id) values
      ('${donorId}', 'Fictional Replay Donor', 'individual', '${boardId}');
  `);
}, 30000);
afterAll(async () => { await db.close(); });

async function asAdmin<T>(fn: () => Promise<T>) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${adminId}',false);`);
  try { return await fn(); } finally { await db.exec("reset role"); }
}

function insertGift(sourceRecordId: string, source = "zeffy") {
  return db.exec(`
    insert into public.gifts(donor_id, amount_cents, received_on, program_id, source, source_record_id)
    values ('${donorId}', 10000, '2026-01-01', 'ai-academy', '${source}', '${sourceRecordId}')
  `);
}

describe("same-file replay safety", () => {
  it("inserts a gift the first time", async () => {
    await asAdmin(async () => {
      await insertGift("replay-001");
      const { rows } = await db.query<{ n: string }>(
        "select count(*)::text as n from public.gifts where source_record_id='replay-001'",
      );
      expect(rows[0].n).toBe("1");
    });
  });

  it("rejects a plain INSERT for the same (source, source_record_id)", async () => {
    await asAdmin(async () => {
      await expect(insertGift("replay-001")).rejects.toThrow();
    });
  });

  it("ON CONFLICT DO NOTHING silently skips the duplicate on reimport", async () => {
    await asAdmin(async () => {
      await db.exec(`
        insert into public.gifts(donor_id, amount_cents, received_on, program_id, source, source_record_id)
        values
          ('${donorId}', 10000, '2026-01-01', 'ai-academy', 'zeffy', 'replay-001'),
          ('${donorId}', 20000, '2026-02-01', 'ai-academy', 'zeffy', 'replay-002')
        on conflict (source, source_record_id) do nothing
      `);
      const { rows } = await db.query<{ n: string }>(
        "select count(*)::text as n from public.gifts where source='zeffy' and source_record_id like 'replay-%'",
      );
      // replay-001 already existed; only replay-002 is new → total 2, not 3
      expect(rows[0].n).toBe("2");
    });
  });

  it("allows the same source_record_id from a different source", async () => {
    await asAdmin(async () => {
      await insertGift("replay-001", "benevity");
      const { rows } = await db.query<{ n: string }>(
        "select count(*)::text as n from public.gifts where source_record_id='replay-001'",
      );
      expect(rows[0].n).toBe("2");
    });
  });

  it("full reimport of a 3-row file inserts new rows and skips all duplicates", async () => {
    await asAdmin(async () => {
      // Initial import
      await db.exec(`
        insert into public.gifts(donor_id, amount_cents, received_on, program_id, source, source_record_id)
        values
          ('${donorId}', 5000, '2026-03-01', 'ai-academy', 'spreadsheet', 'batch-A-001'),
          ('${donorId}', 6000, '2026-03-02', 'ai-academy', 'spreadsheet', 'batch-A-002'),
          ('${donorId}', 7000, '2026-03-03', 'ai-academy', 'spreadsheet', 'batch-A-003')
        on conflict (source, source_record_id) do nothing
      `);
      const afterFirst = await db.query<{ n: string }>(
        "select count(*)::text as n from public.gifts where source='spreadsheet' and source_record_id like 'batch-A-%'",
      );
      expect(afterFirst.rows[0].n).toBe("3");

      // Re-import the same file — should produce 0 new rows
      await db.exec(`
        insert into public.gifts(donor_id, amount_cents, received_on, program_id, source, source_record_id)
        values
          ('${donorId}', 5000, '2026-03-01', 'ai-academy', 'spreadsheet', 'batch-A-001'),
          ('${donorId}', 6000, '2026-03-02', 'ai-academy', 'spreadsheet', 'batch-A-002'),
          ('${donorId}', 7000, '2026-03-03', 'ai-academy', 'spreadsheet', 'batch-A-003')
        on conflict (source, source_record_id) do nothing
      `);
      const afterReplay = await db.query<{ n: string }>(
        "select count(*)::text as n from public.gifts where source='spreadsheet' and source_record_id like 'batch-A-%'",
      );
      expect(afterReplay.rows[0].n).toBe("3");
    });
  });
});
