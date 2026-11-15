# Enable live request funding in the existing Supabase project

The UI and database migration are implemented. The project owner must apply the
migration to the existing configured project; the public/anon key cannot do this.
No new project, private key in chat or RLS bypass is needed.

1. Verify the project has the schema from `202611140001_foundation.sql` and
   `202611140002_imports_settings.sql`. Do not rerun already-applied migrations.
2. In that project's SQL editor, run the entire
   [`202611140003_request_funding.sql`](../../supabase/migrations/202611140003_request_funding.sql)
   file once, followed by
   [`202611140004_request_access.sql`](../../supabase/migrations/202611140004_request_access.sql).
   Each migration wraps its changes in one transaction and refreshes PostgREST's
   schema cache. If it fails, resolve the reported schema mismatch before retrying;
   do not remove permissions or validation to force it through.
3. Sign in with a confirmed Supabase account. Request management no longer needs
   a `members` row or staff approval. Staff membership is still required for
   donor personal details, as described in [staff access setup](staff-access-setup.md).
4. Rebuild/restart the app with `APP_DATA_MODE=live` and the existing Supabase
   public connection settings. Open `/auth/sign-in`, then `/donation-requests`.
   Missing migration, failed data loading and signed-out states remain explicit.
5. Create a monetary request, then a second. Reload and check separate automatic
   priorities. Opening a card shows received amounts allocated to that request;
   the CSV exports persisted request funding. No priority input is accepted.

## Allocation behavior

- Each new request gets the next unique priority under a database row lock.
  Staff can create/edit goals and draft/active status. Revision checks prevent
  one browser from silently overwriting another user's edit.
- `public.gifts` remains the single source of received donations. An AFTER INSERT
  trigger enrolls each newly recorded receipt and allocates it within that same
  transaction. Existing source/record uniqueness prevents replay duplicates.
  Request creation/activation/edits also allocate eligible waiting funds.
- A request for $100 receiving $20 and $10 shows $30 raised. Further receipts fill
  its remaining $70 before the next priority receives anything. Excess beyond all
  active goals stays unallocated and can fund later requests.
- General support (`programs.is_general = true`, seeded metadata ID `general`)
  can fund any program. Existing designated gifts only fund their recorded
  program. An unfinished earlier priority blocks later priorities even if it has
  no matching restricted receipt. Draft requests are skipped.
- Historic gifts present when this migration is applied are excluded, so past
  donations are not silently treated as available funds again. No historical
  allocation/backfill or demo records are seeded.
- Previously allocated splits remain in place. Goals cannot drop below allocated
  amounts, and funded requests cannot switch programs or return to draft.
  Eligible receipts cannot be changed/deleted. Refunds and corrections need a
  separately reviewed reversal workflow; do not edit these ledger rows manually.
- An actual verified intake/import must write the received gift to `public.gifts`
  under the existing authorized workflow. This feature does not charge cards,
  verify payments, or turn a donor's checkout intention into a received gift.

## Access boundaries

Any signed-in account can manage organization-wide request metadata and see
aggregate funding. Request creators reference `auth.users`, not `members`. Only admins or a donor's assigned active board member see that donor's
name in card details; other contributions are labeled `Restricted donor` without
identity IDs or receipt dates. The snapshot RPC requires a verified Auth identity. Donor identity visibility still
checks active trusted membership. Clients cannot write priorities, allocations or the private
receipt-eligibility ledger directly. Request writes use the authorized RPC.

## Verification performed locally

`npm run check` and `npm run build` are required. The feature's PGlite tests run
the actual migration with PostgreSQL roles/RLS and cover queue order, multiple
donors, spillover, restrictions, overflow, draft activation, historic exclusion,
replays, stale edits, financial invariants, access isolation and atomic rollback.
PGlite uses one connection; this is not a hosted multi-session concurrency test.
The shared database lock is the production concurrency mechanism.

Run `node src/features/donation-requests/live.browser.mjs` with Node 22 for an
isolated UI/database test on port 3104. It uses a local fictional Auth/PostgREST
stub with the actual SQL migrations, not the hosted project. It checks create,
reload, priorities, donor detail, spillover, edits, CSV and mobile. No real users,
payments or emails are created. A project-owner review and authenticated hosted
smoke test remain necessary after applying the migration.
