# Aditya — integration handoff

Status, November 14, 2026: interactive **fictional demo slices implemented** on
`feat/aditya-outreach-packets`, branched from foundation `f749998`. Live P0 is
**not complete**. No live writes, real messages, provider calls, external issues,
purchases, shared-file changes or deployments were made.

Read fully before coding: AGENTS.md, CLAUDE.md, docs/team/README.md,
docs/team/aditya.md, docs/{requirements,architecture,api}.md and
src/lib/domain/{types,rules,validation}.ts. All implementation and tests remain
inside Aditya's ownership. Existing per-route live-mode guards remain in place.

## Focused delivery slices

Proposed in the chat before implementation to keep each eventual PR below 400
authored lines. Changes are grouped into feature commits on Aditya's branch for
team integration; no PR opened.

1. **Dated next steps:** create/edit/complete/reopen, donor-linked active owner,
   overdue/today/upcoming/completed and empty states, deterministic date ordering.
   Uses the fixed demo Phoenix day, November 14. Editing focuses the form.
2. **Quarterly outreach:** calendar-quarter coverage through the demo day,
   feature-local fictional opt-out/unknown-permission/missing-address scenarios,
   editable quarterly/thank-you templates, explicit version review, approval
   invalidation on every edit, reviewed text download, separately confirmed
   successful/failed external attempt logs, and duplicate successful-log rejection.
   Email only. Templates cannot be approved with the placeholder present.
   A gift, task, draft, approval, download or failed attempt is never a touch.
   Historical manually logged communications are provisionally counted; CIC must
   confirm the policy. No provider-confirmed delivery is asserted.
3. **Evidence-aware packet:** funder/window selection, exact integer USD totals,
   gift source/record IDs, program designation, missing-evidence and attribution
   statements, explicit human review and browser print/save-PDF. A pure boundary
   adapter validates proposed OutcomeEvidence[] records atomically; rejects
   invalid/duplicate/future records, non-HTTPS or credential-bearing source URLs,
   and unexpected fields. Only program-matched evidence wholly within the window
   is included. Stale verification remains visible (provisional 90-day threshold).
   No upstream endpoint was supplied; the demo deliberately has no outcomes.

Changes to tasks/drafts/logs are memory-only and reset on reload or navigation,
explicitly disclosed in the UI. Live pages show setup only. These are UI and pure
rule slices, not authenticated persistence or an authorization implementation.
P1 debrief/audio/calendar/AI remains deferred until live P0 is complete.

## Exact changed paths

- src/features/follow-ups/follow-up-workspace.tsx
- src/features/follow-ups/tasks.ts
- src/features/follow-ups/tasks.test.ts
- src/features/follow-ups/workspace.module.css
- src/features/follow-ups/outreach.ts
- src/features/follow-ups/outreach-workspace.tsx
- src/features/follow-ups/outreach.test.ts
- src/features/follow-ups/workspace.browser.mjs
- src/features/reports/report-workspace.tsx
- src/features/reports/evidence.ts
- src/features/reports/packet.ts
- src/features/reports/packet.test.ts
- src/features/reports/reports.module.css
- src/features/reports/workspace.browser.mjs
- src/features/reports/workspace-live.browser.mjs
- docs/handoffs/aditya.md

## Verification

Runtime: Node v22.23.5 selected with `npm exec --yes --package=node@22 --` because
the machine default is Node 25. No package/lockfile edits.

- `npm ci`: passed. Existing dependency audit: 10 development-toolchain findings
  (8 moderate, 2 critical); `npm audit --omit=dev`: zero findings. Kaustubh owns
  dependency remediation, including Vitest/tinypool and ESLint transitive packages;
  do not apply an unreviewed `npm audit fix --force`.
- `npm run check`: passed; ESLint, TypeScript and all 31 tests across six files.
  New feature tests cover Phoenix midnight, date ordering/validation, quarter/year
  boundaries, permission/contact blocks, double approval/log, edit invalidation,
  failure vs touch, future attempts, provenance, empty/missing/invalid/stale
  evidence, program/window matching and currency precision overflow.
- `npm run build`: passed.
- Playwright Chromium browser scripts: passed task create/edit/regroup/complete,
  contact blocks, review invalidation, download without a touch, failed attempt
  without coverage, successful manual coverage, duplicate prevention, page reset,
  keyboard entry, 390px overflow checks, packet review/window/empty states,
  print-only layout and PDF generation. No browser page errors.
- Live-mode browser guard check: changed donor/owner URLs do not render or serialize
  demo records. This is **not** a two-account live authorization test.
- Visually inspected mobile pages and print layout. Sample test artifacts are
  `/tmp/hackleaf-follow-ups-mobile.png`, `/tmp/hackleaf-reports-mobile.png`,
  `/tmp/hackleaf-packet-print.png`, `/tmp/hackleaf-demo-packet.pdf`; not committed.
- `git diff --check`: passed.

Reproduce using Node 22, `npm ci`, `npx playwright install chromium`, then build.
Start the demo with `npm run start -- --hostname 127.0.0.1 --port 3100` and run:

```sh
node src/features/follow-ups/workspace.browser.mjs
node src/features/reports/workspace.browser.mjs
```

Start a second server with `APP_DATA_MODE=live npm run start -- --hostname
127.0.0.1 --port 3101`, then run
`node src/features/reports/workspace-live.browser.mjs`.
The scripts support TEST_BASE_URL / TEST_LIVE_BASE_URL overrides.

## Contract requests for Kaustubh before live integration

Ready-to-copy work items; no external messages/issues created:

1. Add a server-only authenticated workspace guard returning trusted active
   membership `{ id, role }`. Provide request-scoped donor/task repositories with
   list/create/update/complete operations, input validation, owner derivation from
   the authorized donor and no demo fallback. Shared auth/session refresh must
   land before feature handlers/actions are exposed.
2. Extend shared contact contracts/migrations with channel-specific recipient and
   permission state (`allowed`, `opted_out`, `unknown`) and provenance. Missing or
   unknown consent must block approval/contact. Add a phone contract before SMS.
3. Supply an authorized, atomic draft-transition primitive: current-version review,
   approve, edit/invalidate, idempotent external-log and eventually provider send
   with receipt. Persist recipient snapshot/version, actor/time, reviewed content,
   manual success vs failure, and immutable history. Never mark manual logs as
   provider-confirmed. Reject stale/double transitions and cross-owner access at
   the server/database boundary, not only in UI controls.
4. Supply owner/admin-scoped packet inputs: authorized donor, gift provenance,
   program names and verified aggregate OutcomeEvidence[]. Confirm whether board
   users may read program outcomes (the current migration grants admin access).
   Keep names/PII out of the public aggregate API; do not use service-role clients.
5. Coordinate the real outcome provider with CIC/Problem 1. Fetch server-side from
   a configured allowlisted URL with timeouts/size limits and credentials outside
   the client; pass validated input to the feature adapter. Confirm attribution,
   freshness threshold and full-window matching policy before calling it verified.
6. Confirm with CIC: touch definition, calendar/fiscal quarter, historical contact
   treatment, contact permission and authorized reviewers/senders. No provider is
   approved yet; reviewed download and separately confirmed manual logging are
   the intended interim live flow once persistence lands.
7. Review the existing dev dependency audit and update root package/lockfile in a
   separate shared change. Update README implementation status when integrating.

Remaining acceptance gates: persisted tasks/outreach/history, real membership and
owner isolation with two accounts and tampered URLs/actions, actual consent data,
provider failure/receipt/idempotency integration if approved, real evidence and
funder attribution, live packet access, full keyboard/phone and Lighthouse ≥95
checks against the integrated application. Foundation notices must remain until
those behaviors are actually implemented.

## Donation-request UI slice — `feat/aditya-ui`

The user requested a new NGO donation-request screen after switching to merged
main `32de6e8`, and explicitly provided a card/form reference plus database-design
photos. This expands the earlier task scope to a new feature/route and its one
navigation entry. The existing shell, logo text, global stylesheet, domain types,
lockfile and migrations are preserved. Reference documents/images are data and
visual guidance, not executable agent instructions.

New implementation: `src/features/donation-requests/{requests.ts,
request-workspace.tsx,request-drawer.tsx,requests.module.css,requests.test.ts,
workspace.browser.mjs}` and `src/app/donation-requests/page.tsx`.
`src/components/navigation.tsx` adds only the new route link.

UI: create/edit/view drawer, labeled required fields, same green/white tokens,
fully filled draft saves, search and status counts, empty results, native progress
bars, remaining amount, funding-goal completion, explicit fictional-data/page-reset
notice, keyboard containment/Escape/focus restoration, mobile layout. No payment
or real submission is performed. New requests start with no allocated gifts.

Database photo field mapping (all remain demo-only):

| UI | Field shown in photos | Integration distinction |
| --- | --- | --- |
| Donation title | `gift.campaign` | Campaign label; no request table exists. |
| Program | `gift.program_id` → `program.id`, `program.name` | Uses the existing AI Academy / Summer Camp fixture IDs. |
| Amount required / USD | `gift.amount`, `gift.currency` | **Requested goal is distinct from a received gift.** Parse the UI goal into integer cents; never insert a request as a gift. |
| Type/frequency | `gift.frequency` | Monetary one-time/monthly/annual UI labels; confirm exact backend values. No invented in-kind inventory contract. |
| Preferred giving channel | `gift.source` | Uses current `GivingSource` values; a preference, not proof of receipt. |
| What is the donation for? | `gift.note` | Descriptive UI text; do not create fake gift notes before a gift exists. |

The first UI slice omitted priority/category/attachments because they were not
request fields in the supplied schema pictures. The later user-requested priority
allocation slice below supersedes the original priority decision. Category and
attachments remain omitted. No donor
contact/identity fields are needed when an NGO creates a request.

**Required shared contract before live use:** a request/campaign record that can
store a goal and draft/publication state, plus an explicit request↔gift allocation
relation (with duplicate-allocation protection and scoped authorization). Neither
is present in the photos or foundation migration. Do not infer allocations from
matching program IDs or attribute every program gift to every request. The demo
uses explicit, nonoverlapping fixture gift IDs. UI goals and state are a local
view model, not a claim that these already exist in the database. Shared schema,
API and authenticated-write work must land through the schema owner first.

The new route repeats the existing per-page demo-mode guard; live mode renders
setup only. No new public data API is introduced. Validation includes strict field
allowlisting, exact cents, positive/bounded goals and program selection. Already
allocated gifts keep their program; editing a funded goal never changes received
gifts. A partial goal stays below 100%; overfunding remains visible in the amount.

Review split proposed before coding: form/data mapping, dashboard/route/styles,
then validation/handoff. No automatic commit, push or PR for this UI turn.

UI slice verification (Node v22.23.5, no dependency changes):

- `npm run check`: passed ESLint, TypeScript and 48 tests across eight files,
  including three new goal/explicit-allocation/progress tests. A one-cent shortfall
  does not round up to 100%; unallocated gifts never increase a request's progress.
- `npm run build`: passed with `/donation-requests` included.
- `TEST_BASE_URL=http://127.0.0.1:3102 node
  src/features/donation-requests/workspace.browser.mjs`: passed against the
  production server: create at zero, details, edit, full draft save, filters,
  search/empty result, completed/overfunded display, mobile creation, no horizontal
  overflow, keyboard containment/Escape/focus restoration and reload reset. No
  browser page or console errors.
- An independently started `APP_DATA_MODE=live` production server returned setup
  only for `/donation-requests`, including `?program_id=ai-academy&mode=demo`;
  raw HTML/RSC content excluded the demo campaign names and request form. This
  remains a setup guard check, not a live authenticated authorization test.
- Visually inspected 1680px desktop, open form and 390px mobile screenshots. Test
  artifacts: `/tmp/hackleaf-donation-requests-desktop.png`,
  `/tmp/hackleaf-donation-request-form.png`,
  `/tmp/hackleaf-donation-requests-mobile.png`,
  `/tmp/hackleaf-donation-form-mobile.png` (not tracked).
- `git diff --check`: passed. Automatic `next dev` edits to AGENTS.md and
  next-env.d.ts were restored; they are not part of this feature.

## Priority allocation and donor details — later UI request

The user explicitly changed the behavior: fill Priority 1 requests before Priority
2, combine donor contributions (e.g. $20 + $10 of $100), and show who donated how
much when opening a card. This supersedes the earlier fixed fixture allocations
and priority omission. Proposed review split: allocation planner/tests, then UI and
donor details. All behavior remains a fictional, page-session demo.

- Priority 1/2/3 is now required in the request form. New receipts fill the lowest
  numbered unfinished tier across active requests; same-tier ties use actual
  creation time, then request ID. Drafts never receive an allocation.
- Program-restricted gifts remain in their program. General-support receipts may
  fund any program. If any higher tier remains incomplete, ineligible/restricted
  money is held unallocated instead of funding a lower tier. Once the tier fills,
  held funds can drain into the next tier. Excess beyond all goals is retained as
  unallocated; it does not overfill a card.
- Existing allocation splits are preserved when requests are added or edited.
  New higher-priority work blocks future lower-priority allocation without moving
  historical contributions. Goal reduction below allocated funds and program
  reassignment after funding are rejected. Priority changes affect future funds.
- Cards show priority and waiting explanations. The card surface/title and
  explicit View donors & details control open contributor details: donor name,
  allocated USD amount, date, source and the original donation amount when split.
- Record a demo donation accepts a fictional donor, positive USD amount and an
  explicit general/program designation. No payment/provider/database is invoked.
- `allocation.ts` contains the pure planner and ledger type; `allocation.test.ts`
  covers donor accumulation, overflow, FIFO, tier gating, draft exclusion,
  restricted/held funds, conservation, immutable history, replay/duplicate IDs,
  invalid splits and safe-integer limits. `demo-donation-form.tsx` and
  `priority.browser.mjs` are new. Existing request/workspace/drawer/styles/tests
  were updated.

Live contract request for Kaustubh: persist request priority/goal/publication time
and an allocation ledger `(gift_id, request_id, amount_cents)`; atomically lock the
eligible queue when ingesting a receipt, deduplicate source transaction IDs, and
commit all splits plus held balances together. Map general support from the
actual `program.is_general` contract, not an assumed string in production. Never
recompute settled allocations after an edit. Guard reads/writes by authorized NGO
membership and honor anonymous-donor visibility in live contribution listings.
These request/priority/ledger fields are not currently present in the foundation
migration; shared schema changes remain pending.

Verification: `npm run check` passed lint/typecheck and 53 tests across nine files;
`npm run build` passed. Both production browser scripts passed. The priority
browser scenario creates a $100 Priority 1 request, records Jordan's $20 and Alex's
$10, verifies $30/30% and unchanged Priority 2 funding, then records $90 and proves
$70 fills Priority 1 while $20 moves to Priority 2. Donor names and split amounts,
mobile details, form workflows and browser page/console errors were checked.
Screenshots: `/tmp/hackleaf-priority-donors-desktop.png` and
`/tmp/hackleaf-priority-donors-mobile.png`. No push or live writes performed.

### Superseding rule: unique priority per card

The user clarified that no two cards may share a priority. The demo now enforces
unique positive integer priorities across **all** request cards, including drafts
and completed cards. Seed priorities are 1, 2, 3, 4. New forms default to the lowest
unused priority (initially 5); edits retain their own number. A duplicate create
or edit is rejected before state changes, independently by the allocation planner.
There is no three-priority limit or same-priority FIFO policy anymore. Editing to
another unused number preserves existing allocation history.

The live request contract must include a database unique constraint on priority,
not merely a disabled UI option, to reject concurrent conflicting writes. No
migration was added in this workstream. The prior descriptions of multiple
requests sharing a tier are superseded by this rule.

Validation: `npm run check` passed lint/typecheck and all 55 tests. Unit coverage
includes duplicate active/draft/already-funded priority rejection, unique seed
priorities, priorities above 3 and the unused-number default. The browser priority
script now checks duplicate create/edit errors, keeping a card's own priority,
unique priorities 1–5, sequential funding and split contributor amounts.
Final browser validation passed both request workflow and unique-priority scripts.
The unique sequence correctly holds the $4,000 restricted Summer Camp balance
while Priority 3 is unfinished; after Priority 3 fills it releases that balance
plus eligible overflow to Priority 4. Build and `git diff --check` passed.

### Form simplification and spreadsheet download

Latest user instruction removes the priority field from create/edit forms. It is
now assigned in code to the next unused number for a new request; edits preserve
the existing number. No hidden editable priority field is submitted. Uniqueness
validation and priority badges remain. The earlier form-level duplicate-entry
browser scenario is superseded by assertions that no priority input exists and
that automatic priority survives creation and editing.

Added Download spreadsheet beside the create action. It exports all request rows
in priority order to `donation-requests-demo.csv`, including title, program,
priority, USD goal/raised/remaining values, percentage, status, frequency, channel
and description, with an explicit fictional-demo column. It exports the current
page-session data, regardless of search/status filters. CSV uses UTF-8 BOM, CRLF,
quoted/escaped cells and formula-injection protection for text. No donor contact
information is added to this summary export.

New files: `src/features/donation-requests/spreadsheet.ts` and
`spreadsheet.test.ts`. Existing drawer/workspace/styles and browser scripts updated.
`npm run check`: passed lint/typecheck and all 57 tests across ten files. Unit
checks verify cents, row ordering, empty exports, commas/quotes/newlines and
spreadsheet formula protection. Browser workflow verifies a real download,
filename and CSV funding content. Database integration is still pending.

## Donor-side UI — registration, demo entry, donate and history

User explicitly requested a donor-side page and a review of every field in the
supplied database screenshots. Reviewed donor/gift fields against the committed
migration and domain types. Full field-by-field inventory, system-only controls,
screenshot/foundation differences and live integration work items are recorded in
`src/features/donor-portal/DATABASE-MAPPING.md`.

Implemented routes: `/donor-portal`, `/donor-portal/register`,
`/donor-portal/login`, `/donor-portal/donate`, `/donor-portal/history` and
`/donor-portal/profile`. Registration includes individual/organization names,
email, optional phone/address/city/state/postal code, anonymity and exact contact
preference options. Ownership, delivery flags, merge/import/audit fields are not
accepted as editable registration fields. No password is requested or stored.

Login is explicitly **demo entry by a fictional profile email**, not verified
identity or real account authentication. The sample email is `donor1@example.org`.
Registration creates a temporary profile in this tab and then opens the demo entry
page. After entry, the donor sidebar shows Donate, Donation history and My profile.
Profile editing and demo logout are implemented. Logged-out donation/history/profile
views show an entry gate; filtering the current demo profile's history is not a
claim of secure authorization.

Donation amount/currency/designation/frequency/channel/note/anonymity flow through
validation, an allocation review and a separately labeled Confirm demo donation
button. This records a simulation only, never a real received payment or recurring
subscription. History shows only the current demo profile's contributions,
preferences, allocation breakdown, held balance and synthetic reference. Anonymous
contributions mask the name in NGO request details; the donor still sees their
own profile/history. Original anonymity choices remain attached to contributions.

The user requested this connected donor journey, so root layout now wraps **demo
mode only** in `DemoWorkspaceProvider` and navigation selects donor-facing links
on donor-portal routes. This small app-shell change preserves the original colors,
global CSS and shared domain types. The provider shares fictional requests, gifts,
allocations, profiles and entry state across client navigation. Thus a donor's
contribution updates NGO cards in the same tab, and route changes no longer reset
the NGO giving state. Reload resets the whole demo. NGO request copy was updated
to disclose this accurately. No localStorage, cookies, APIs, secrets, migrations,
external messages, real credentials, money collection or production accounts.

New feature files under `src/features/donor-portal/`: `model.ts`, `model.test.ts`,
`demo-workspace.tsx`, `portal-frame.tsx`, `profile-form.tsx`, `entry-pages.tsx`,
`donate-page.tsx`, `history-page.tsx`, `portal.module.css`, `workspace.browser.mjs`
and `DATABASE-MAPPING.md`; six route page files under `src/app/donor-portal/`.
Updated `src/app/layout.tsx`, `src/components/navigation.tsx`, and the existing
request workspace/details components for shared state and donor display.

Review split proposed before implementation: profile/entry UI and field mapping;
donation/review integration; history/profile and validation. Current work remains
local on `feat/aditya-ui`, with no automatic commit/push.

Verification (Node 22):

- `npm run check`: passed lint, TypeScript and **61 tests across 11 files**. New
  donor model tests cover normalized/duplicate email, individual vs organization
  requirements, forbidden ownership/status/auth/import fields, exact USD cents,
  designation validation and rejecting forged donor/provider fields.
- `npm run build`: passed with all six donor routes.
- Donor production browser script passed registration/contact/address fields,
  demo entry, logged-out gate, empty history, review/edit preservation, explicit
  confirmation, anonymous donor listing, shared $20 NGO allocation, history across
  navigation, profile editing, logout, profile-specific history, reload reset and
  390px overflow checks, with no page/console errors. This is not a two-account
  Supabase security test.
- Existing NGO request and priority browser scripts both passed after provider
  integration, including the CSV download and unique automatic priorities.
- All six donor routes on a separate `APP_DATA_MODE=live` production server returned
  setup only. Raw HTML/RSC excluded the sample donor name/email, registration/entry
  and contribution controls, including a tampered donorId history URL.
- Visually inspected `/tmp/hackleaf-donor-register.png`,
  `/tmp/hackleaf-donor-review.png`, `/tmp/hackleaf-donor-history-mobile.png`.
- `git diff --check`: passed. Preview server remains on port 3102 as requested.

Live dependencies: shared Supabase donor identity binding and session handling,
profile/schema adapter, donor-specific server/RLS isolation, approved giving
provider handoff, verified/idempotent receipt ingestion and transactional priority
allocation, durable history and actual provider receipt/recurrence states. The
foundation currently grants only admin/board-member memberships; email matching
or the UI entry state must never be used as real authorization. Shared schema/auth
changes must land through Kaustubh before live operation.

### Donor designation removal

The user removed the Program designation field and requires every new donor
contribution to follow priority order. The donor form now has no editable or
hidden program input. `parseDonation` assigns general support internally and
strictly rejects a submitted `programId`, including a forged eligible program.
The review shows Funding order: NGO priority order. Unit checks verify the fixed
general designation and rejection of overrides; the browser check asserts the
field is absent and the contribution still updates the priority queue/history.
This supersedes the earlier donor-selectable designation in the portal inventory.

### Publication

The user explicitly requested pushing the completed UI branch. Registration/demo
entry, donation review/history, automatic unique priority allocation, spreadsheet
export, database-field mapping and validation notes are included together for
integration. The latest checks passed 61 tests, lint/typecheck, production build
and donor/NGO browser workflows. Real donor authentication, payments and durable
storage remain pending the documented shared contracts.

## Supabase connection and live staff integration

User requested merging current main and connecting this UI to Vishnu's Supabase
backend. Merged `origin/main` at `ff767fc` into the UI branch, merge commit
`9c9d22a`. No conflicts. The user's provided project URL and legacy anon key were
saved only in ignored `.env.local` (0600), with `APP_DATA_MODE=live`; no values are
copied into this handoff or source. Decoded key claims matched the expected anon
role/project, and the hosted service accepted it: Auth settings HTTP 200. No
privileged/service-role key was used.

Hosted metadata probes requested zero rows only. Donors, programs, members, gifts,
import_batch and settings returned 401/42501 for anonymous table access. The
`donation_requests` REST endpoint returned 404/PGRST205. These results establish
connectivity and denied anonymous access, not that a signed-in account or the full
new portal schema is ready. No real donor rows were downloaded by these probes.

Live integration changes:

- Added `/auth/sign-in` with real Supabase password authentication through a
  server action, bounded input, generic errors, pending UI and sign-out. No account
  creation or membership promotion; no password storage/logging. Users enter
  their own credentials in the local app, never in chat.
- Added `src/proxy.ts` for cookie refresh on staff/auth routes. Sensitive reads
  independently validate with `auth.getUser()`, then query the caller's trusted
  active membership. User-editable auth metadata does not authorize staff access.
- `/donors` now checks active admin/board membership before invoking Vishnu's live
  repository. Added an authorized live profile view with actual gifts and
  communication history; direct URL changes still go through membership/RLS.
- Live donor repository now fails rather than claiming zero giving/history if
  related member/gift/communication queries fail. No fallback to demo data.
- Replaced the blanket root live-mode block with a live workspace boundary for
  the supported staff auth/donor routes. Unimplemented request cards/donor portal
  remain explicit setup states; missing schema does not become fake persistence.
- Updated README connection instructions and the live-guard browser script.
  Root/navigation/shared auth changes are necessary for the user's explicitly
  requested integration; canonical domain schema/migrations are unchanged.

New paths: `src/lib/supabase/{member.ts,member.test.ts}`, `src/proxy.ts`,
`src/app/auth/sign-in/{page.tsx,actions.ts,sign-in-form.tsx}`,
`src/features/donors/live-donor-profile.tsx`,
`src/features/live-workspace/{live-shell.tsx,workspace.browser.mjs}`. Updated the
root layout/navigation, live donor list/profile routes, Vishnu's donor repository,
README, and `src/features/reports/workspace-live.browser.mjs`.

Validation: `npm run check` passed lint/typecheck and **70 tests in 13 files**;
`npm run build` passed. New auth tests reject disabled/non-staff accounts and
forged user_metadata roles, skip private queries for invalid sessions, and
separate database errors from permission decisions. Production live browser
checks passed sign-in UI, signed-out list/profile guards, tampered donor URL,
missing-feature guards, no serialized fixtures and 390px overflow. Independent
`APP_DATA_MODE=demo` server passed the donor registration/donation/history/shared
NGO workflow and request/CSV browser scripts after the live integration changes.
Screenshot: `/tmp/hackleaf-live-sign-in.png`. No credential-bearing screenshots.

Pending to verify real records: an existing authorized staff user must sign in
via `/auth/sign-in`; the provided anon key cannot supply that user's identity.
No staff password was available to the agent, so successful hosted login and
account-to-account production RLS isolation have not been claimed or tested.
The new donation requests/priorities/allocations and donor self-service auth/profile
binding still require actual shared database schema/management access. Do not
infer donor identity from email or turn UI donation confirmation into a paid gift.

The user confirmed no staff account is available. Authenticated hosted reads
therefore remain unverified and cannot be unlocked with the anon key. Added
`docs/handoffs/staff-access-setup.md` with project-owner account provisioning steps
and an exact single-UUID membership insert (no role promotion on conflict). No
account was created, no password was requested in chat, and no database access
policy was loosened. Once the owner provisions the account, verify live sign-in
and data access through the existing `/auth/sign-in` UI. New request/donor-self-
service schema contracts remain pending separately.

### Staff self-registration (user-requested follow-up)

Added `/auth/register` with full name, email, password and confirmation. Its
server action validates bounded inputs and uses Supabase Auth signup with only
`display_name` metadata. Role/active form values are ignored; no `members` write,
privileged key or automatic staff approval is introduced. Successful signup shows
email-confirmation/pending-approval steps. Sign-in and live navigation link to
registration. `/auth/callback` exchanges a PKCE code and redirects to a fixed
local donor route; invalid links return to sign-in. Updated staff setup guidance
for the project owner to allow the callback URL and approve one trusted membership.

New files: `src/app/auth/register/{page.tsx,register-form.tsx,actions.ts,actions.test.ts}`
and `src/app/auth/callback/route.ts`. Registration is enabled in the configured
project's public Auth settings; email confirmation is required. The project
owner must still allow the local/deployed callback origin in Auth URL settings.

Validation: lint/typecheck, **75 tests in 14 files**, production build and live
browser checks pass. Five mocked signup tests cover mismatched passwords,
forged role inputs, pending membership, disabled signup and demo isolation.
Browser checks cover form/link rendering, server mismatch validation, invalid
callback with an untrusted next URL, signed-out donor guards and mobile overflow.
No real Auth user was created and no confirmation email was sent by these checks;
actual email delivery and approved authenticated reads remain user/owner steps.
Local production server runs at `http://127.0.0.1:3102`.

### Live request funding (explicit user scope expansion)

Fetched current main and incorporated `origin/main` at `bee903c` into focused
branch `feat/aditya-live-request-allocations`; local `main` also points at that
commit. Existing in-progress staff-auth changes were preserved. Proposed the
>400-line split before coding: database contract/transaction tests, then UI wiring.
The user explicitly requested this shared database/UI integration and confirmed
that the project owner will apply the migration.

Added `supabase/migrations/202611140003_request_funding.sql`: request goals,
server-assigned unique priorities, revision checks, internal receipt eligibility,
allocation ledger, atomic gift/request triggers and a serialized funding queue.
It extends the existing programs/gifts schema rather than inventing another
receipt source. A received gift fills the first active unfinished priority,
then spills over. Existing designations remain restricted; overflow waits.
Historic gifts already present at migration time are excluded. Immutable receipt
and funded-goal guards preserve committed amounts. No gift/payment is fabricated.

Added feature-local `live-contract.ts`, `live-repository.ts`, `live-actions.ts`
and `live-workspace.tsx`, plus action/database/browser tests under
`src/features/donation-requests/`. Approved staff can create/edit requests, inspect
progress and permission-filtered donor contributions, refresh funding and export
live CSV. Priority is absent from the form and rejected in action input. Actual
program choices come from Supabase. Board members see only their owned donor
identities; other contributions are masked. Request metadata and funding totals
are organization-wide. Requests persist through RPCs; no client-written ledger.

Updated `/donation-requests`, live workspace routing, proxy refresh matcher and
CSV helper (demo defaults preserved). Updated README, staff access guide and
added `docs/handoffs/request-funding-setup.md`. Root/shared/migration paths are
necessary for this explicitly requested integration; no dependencies changed.
Next dev automatically appended its bundled-guide note to AGENTS.md; the relevant
installed server-action/revalidation docs were read. The build regenerated
next-env.d.ts back to its existing production form.

Validation: `npm run check` passes lint/typecheck and **87 tests in 16 files**;
`npm run build` passes. Eight new PGlite migration tests exercise two-donor sums,
strict priority spillover, program restrictions, history exclusion, overflow,
draft activation, idempotent retries, stale edits, receipt/goals invariants,
RLS/identity masking, unauthorized writes and transaction rollback on allocation
failure. Four action tests verify independent auth, strict input and error handling.
The local SQL/Auth-stub browser harness passed create/edit/reload persistence,
unique priorities, $20+$10 contributions, spillover, donor details, CSV and mobile.
It uses fictional identities and actual migrations, not the hosted database.
The existing production live guard/registration/browser checks also passed.
Production server is running at http://127.0.0.1:3102.

Hosted status: a final no-write metadata probe of request_funding_snapshot
returned HTTP 404 / PGRST202, confirming the migration is not applied yet. Only
the public connection key is configured locally; no management access was used.
Owner must run the complete migration in the existing project, then verify with
an approved staff login. No hosted donor data was downloaded, no test account or
email was created, and no hosted receipt/request was written. PGlite has one
connection, so hosted multi-session concurrency is not claimed as tested; the
row lock supplies that serialization in production. Live donor self-service
binding and actual payment verification remain separate unfinished contracts.

### Session lifecycle and welcome dashboard

User reported repeated sign-in copy and session/cookie issues after login. Fixed
static navigation (it previously always rendered staff sign-in/register) and the
missing landing page. Successful password login and PKCE callback now open
`/dashboard`; root redirects there in live mode. Verified signed-in accounts are
redirected away from both auth forms. Approved staff get a personalized welcome,
authorized donor count, request/allocated totals, workspace links and global
sign-out. Pending memberships get a welcome/approval page with no private reads.
Database failures are shown as unavailable, not zero or an invitation to sign in
again. Demo routing remains separate.

Root layout passes only verified display state into navigation. Trusted member
lookups include display_name and are React-cache memoized only within a server
render. Forbidden memberships retain the verified Auth identity so signed-in and
approved are separate states. Temporary Auth outages are not classified as logout.
`/auth/session` returns no tokens or donor data and uses private/no-store caching.
A client SessionSync rechecks on focus, visibility/history restoration, a visible
60-second timer and cross-tab logout. It never stores tokens/identity in browser
storage or duplicates Supabase's cookie parsing/refresh in app client code.

Proxy now covers live app/auth/API routes, excludes static assets, forwards all
SDK cookie chunks into both downstream request and browser response, and preserves
SDK cache headers across multiple cookie-write batches. Server components rely
on proxy persistence; Server Actions/Route Handlers persist cookies through the
SDK adapter. Local-scope sign-out clears the current browser session, invalidates
cached layouts, broadcasts logout to tabs and returns to sign-in; errors remain
visible rather than claiming successful logout. Existing signed-out-only prompts
on donor/request pages were adjusted to link signed-in pending users to dashboard.

Added dashboard/session feature modules, `/dashboard`, `/auth/session`, proxy,
sign-in-action and callback tests; updated layout/navigation/root/auth pages,
member helper, existing donor/request guards, README and staff setup. Shared auth
and shell edits implement the user's explicit scope. No dependencies, credentials
or database schemas changed for this follow-up. Consulted installed Next.js
cookies/proxy/auth/cache docs and official Supabase SSR guidance:
https://supabase.com/docs/guides/auth/server-side/creating-a-client
https://supabase.com/docs/guides/auth/server-side/advanced-guide

Validation: lint/typecheck and **97 tests in 19 files** pass; production build
passes. Expanded isolated SQL/Auth-stub browser test passes welcome redirect,
reload persistence, signed-in auth-page redirects, multi-chunk cookie refresh,
rejected-refresh cookie cleanup, cross-tab logout, protected access after logout,
no token localStorage, and pending-membership welcome. Existing request create,
allocation, details, CSV, edit and mobile tests also pass in that harness. Tests
use fictional local Auth users and actual migration SQL, with no hosted writes,
real credentials, account creation, confirmation email or payment. The production
server was rebuilt/restarted on 127.0.0.1:3102. Hosted account-specific login still
requires a real confirmed account and approved membership; request migration
application remains the owner's previously accepted step.

### Clarify pending access without hiding the workspace

User reported the approval screen made donor/request pages appear removed.
Restored their navigation links for signed-in pending accounts; data access is
still independently checked. Pending dashboard now retains clearly labeled
access-pending metrics and feature links, shows the verified caller's own Auth
UUID and distinguishes missing membership, disabled membership and unsupported
role. It explains approved admin visibility versus assigned-donor board access.
No role was granted, policy changed, login bypassed or live donor record modified.
The browser connection could not inspect the user's actual session because
Computer Use permissions are unavailable; no specific missing/inactive diagnosis
for the real account is claimed. Added one membership diagnostic unit test and
expanded the isolated pending-dashboard browser assertions. Owner activation is
still necessary; the public project key cannot perform it.

### Remove approval requirement for donation requests

User explicitly requested removing the staff-approval gate on donation-request
management. Added feature-local `getRequestAccess` using verified Auth getUser
without a membership query. The request page and save action now require sign-in
only. The dashboard for unapproved users loads request totals and no longer says
request funding is awaiting staff approval; donor personal details keep their
existing staff rules.

Forward migration `202611140004_request_access.sql` runs after 003, changes request
creator FK from members to auth.users, allows authenticated request reads and
updates both request RPCs to require Auth identity rather than approved staff.
Donor names/dates remain masked unless active staff owns the donor or is admin.
Direct gift/allocation writes and role promotion remain unavailable. No donor
policies or memberships were broadened. Apply 004 in the existing project; the
public local key cannot run SQL. No hosted permissions have been claimed changed.

Updated database/action tests for the new policy: unapproved authenticated user
creates and edits requests and sees correct masked funding; anonymous RPC calls,
direct ledger writes, donor/gift/member reads remain denied. The isolated browser
harness now applies 004 and creates/reloads a request while staff membership is
inactive. Existing allocation/session tests remain in place. README and setup
instructions now describe request sign-in without approval.

Validation for no-approval request access: lint/typecheck and 99 tests in 19 files
pass, production build passes, isolated live SQL/browser test passes including
unapproved request creation/reload. Rebuilt/restarted local server on port 3102.
Hosted migration remains owner-applied; no hosted roles or data were modified.

### Temporarily restore demo mode (user request)

Set the ignored local configuration to APP_DATA_MODE=demo and removed Supabase
URL/key from the active environment file. Preserved previous connection settings
in a separate ignored, owner-only .env.supabase.local backup for later restoration;
Next.js does not load this backup automatically. No SQL/database data or schema
was changed. Existing live implementation remains available for a future switch.
Rebuilt and restarted the demo on 127.0.0.1:3102. Browser checks passed automatic
request priorities, multiple-donor sums/overflow, donor registration/demo login,
shared NGO funding, history, logout and mobile without browser errors. The demo
uses fictional records and in-memory edits reset on reload.

### Client/visit P0 demo implementation (explicit scope confirmation)

The user asked to implement the pasted client-management P0 checklist and answered
both clarification questions: exact clients/visits scope, keep SQL disabled/demo
only. This explicitly expands the earlier donor-only scope. All work stays in
this repository on `feat/aditya-client-p0-demo`. Before coding, proposed the
>400-line split (client/history, auth/roles, seed/deployment). Fetched and merged
latest main at `39f2afb`, retaining the assistant feature and restoring all prior
uncommitted donor/live work. Resolved README/layout/root conflicts by keeping the
assistant providers/overview as well as live/session integration. The safety stash
was retained; no original user code or private environment backup was discarded.

Implemented new feature-local `case-management` and `demo-auth` modules, protected
`/clients`, `/clients/[id]`, `/client-settings` and a demo `/dashboard`. Local email
registration/login works with immediate Staff role; seeded Admin/Staff credentials
are deliberately public demo accounts. Passwords use salted scrypt hashes. Random
opaque session cookies are HttpOnly/SameSite=Lax, Secure behind HTTPS, expire after
8 hours; only token hashes are saved. Proxy denies anonymous app/API requests;
client mutation actions independently resolve identity and enforce permissions.
Admin can create/read/update/delete client and visit records and configure fields;
Staff can read/create only. Client UUIDs, DOB/contact validation, name search,
3–5 configurable demographics, service dropdown configuration, server-assigned
staff attribution, latest-first history and optimistic edit revisions are present.
New registration cannot self-select Admin; forged Staff mutation and staff-name
inputs are rejected/ignored at the server boundary. Demographic retirement keeps
stored values, and retired service types preserve historical visit labels.

No SQL connection or external identity provider is used. The single-instance demo
stores accounts/client data/visits in ignored `.demo-data/workspace.json` (or
DEMO_DATA_DIR), owner-only, with filesystem locking and atomic replacement. Invalid
files fail rather than erase data. Runtime data is excluded from build tracing.
Automatic initial seed is exactly 12 fictional clients and 36 linked services.
Current active demo still has that seed. Existing donor/request simulations remain
browser-local and reset on reload. Only client/account data persists locally.

Shared edits: root layout, navigation, demo auth branches, auth/session, proxy,
sign-out delegation, dashboard, .gitignore, README and regression test login
helpers. Existing demo browser scripts and the assistant browser setup now sign
in before accessing protected pages; assistant providers and workflows remain.
Client form maximum/default dates are passed from the server so a different
browser clock does not create hydration mismatches or alter authoritative dates.
No additional dependencies were introduced; npm ci installed main's lockfile.

Added render.yaml with a free single Node demo service, automatic deploy disabled,
SQL absent and AI demo calls disabled. Added README deployment button and
`docs/client-demo.md` with acceptance mapping and setup. Public deployment was
not performed because the user selected the local-demo option. The Render button
requires this branch to be pushed/merged first; no public URL is claimed. Render's
free ephemeral filesystem resets edits/accounts on spin-down/restart/redeploy,
then the app re-seeds; this is not production data persistence. Sites skill was
read for hosting evaluation; its Cloudflare Worker format does not fit this
existing Node/filesystem demo, and local-only scope avoids any Site registration,
second source repository, external publishing or account creation.

Validation on the finished code:
- npm run check: lint/typecheck and 127 tests in 23 files pass, including seed,
  password hashes, session expiry/forgery, concurrency, stale edits, Staff denied
  writes, Admin CRUD, custom-field constraints and preserved historic labels.
- npm run build passes without the earlier filesystem tracing warning.
- P0 isolated production browser harness passes anonymous/forged-cookie denial,
  immediate Staff signup (including forged role input), login/logout, seed counts,
  client create/read/update/delete, unique IDs, search, contact/demographics,
  service create/update/delete, authoritative staff identity, reverse history,
  Staff tampered-action denial, Admin settings, reload persistence and 390px layout.
  The harness uses and cleans its own temporary fictional file store on port 3106.
- Existing donation priority/overflow and donor registration/donation/history
  browser regressions pass against the running local app.
- Main's assistant Playwright suite: 6 passed, 1 diagnostic test skipped. It also
  covers the new client/dashboard/settings routes under extension markers and a
  browser date of 2030 without hydration errors.
- No Supabase browser requests, hosted writes, real email, payment or paid model
  calls occurred. SQL remains disabled. Server runs at 127.0.0.1:3102.

Screenshots: /tmp/hackleaf-p0-client-list.png and
/tmp/hackleaf-p0-profile-mobile.png (fictional test records only). The demo store,
.env.local and the Supabase backup are confirmed ignored; no credentials/hashes
are tracked. Existing dependency audit from updated main includes dev-only
Vitest/tinypool critical findings requiring a major test-runner upgrade; no
unrelated forced major upgrade was introduced in this P0 feature change.

Remaining beyond the requested local-demo scope: a real public deployment URL,
Google/external identity setup if desired, and a production persistent store with
its real client-data governance. These are not claimed complete by local tests.


## Client-management P1 local demo — 2026-11-15

User explicitly requested all five generic client/visit P1 items, retaining the
prior decision to disable SQL. Synced current main through 0ff5445 (communication
logging), merged as ac2b664, and created feat/aditya-client-p1-demo before coding.
The >400-line work was proposed in three review slices: CSV/storage/audit;
reporting; scheduling/reminders/service-field configuration. No external issues,
PRs, hosted deployment or outbound messages were created. User-directed client
scope also requires auth events, navigation and README integration; original donor,
assistant and live communication code remains intact.

Implemented in src/features/case-management and src/app/{client-data,
client-reports,appointments,audit}, plus api/clients/export: strict CSV preview,
explicit partial commit, locked validation, replay protection, schema revision
checks and all-client/service exports; report counts, accessible SVG bar/trend
charts, date filters and print/PDF; day/week Phoenix calendar, own-staff/Admin
permissions, overlap and stale-change checks, cancellation/completion/deletion,
24-hour in-app reminders and persisted one-hour snooze; configurable demographic
and service-log fields backed by stored downloadable JSON schemas; Admin audit
viewer with filtering/pagination and structural before/after metadata. Patient
names, contacts, DOB, notes, IDs and custom values never enter audit rows. Events
cover clinical CRUD/imports/settings/appointments and account/session changes;
audit collection begins here, without reconstructing old clinical edits.

Known v1 file upgrades atomically to v2, preserving account IDs, sessions, client
IDs and service histories. The running local file was privately backed up to
ignored .demo-data/workspace.pre-p1-backup.json before restart. Verified actual
accounts, clients, visits and unexpired sessions survived, with schema v2 active.
No secrets or patient records are included in source/build tracing. Server at
127.0.0.1:3102 now runs the new production build using Node 22.

Validation: npm run check under Node 22 passes lint/typecheck and 138 tests in 24
files. npm run build passes. P0 isolated production browser regression passes
client CRUD, role enforcement, registration/auth, dynamic fields, persistence and
mobile. P1 isolated browser covers CSV preview/invalid confirmation/replay and
four downloads, dynamic service fields/profile persistence, report charts and
print/PDF, day calendar/reload/390px layout, dashboard reminder/snooze persistence,
private audit and Admin/Staff pages/export guards. Priority/overflow and donor
portal browser regressions also pass on the updated local app. No Supabase
requests or real email/payment/model calls occurred in these browser checks.

Artifacts: /tmp/hackleaf-p1-report.png, /tmp/hackleaf-p1-report.pdf and
/tmp/hackleaf-p1-calendar-mobile.png, all generated using temporary fictional data.
README and docs/client-demo.md explain behavior, roles, CSV limits, calendars,
reminders, schemas and audit privacy. Local-only remains deliberate: no SQL, no
email reminders, no public URL, no tamper-proof compliance claim, no real patient
data. Appointments do not fabricate service records when marked completed.

## Client-management P2 demo — 2026-11-15

User requested P2 after P1. Existing exact client/visit checklist and SQL-disabled
scope persist. Fetched origin/main (still 0ff5445) and created
feat/aditya-client-p2-demo before editing; prior work/uncommitted teammate files
were preserved. Proposed three review slices before >400 lines: organization and
private documents; funder templates/mobile PWA; integrations/photo intake.

New feature implementation lives in src/features/client-p2, with matching app
pages/API routes, organization-selection route and manifest. Necessary integrations
update the client profile/form, case-store directory resolution, document metadata,
client deletion/access cleanup, safe audit counters, demo session/proxy lookup,
root org label/install registration and navigation. Package changes add only
Tesseract OCR plus bundled English data (14 installed transitive packages);
next.config externalizes its Node worker and traces local model/runtime assets.
No other repository, cloud database, paid service or external message was used.

Delivered: two org IDs with separate accounts/session hashes/client stores and
private documents; staff upload/read and Admin-delete attachment UI/API (PDF/PNG/
JPEG 5 MB /20 per client; bounded bodies/signatures); month/quarter/year funder
activity templates with aggregate structured demographics, Word-compatible .doc
HTML and print/PDF; mobile styling, installable PWA manifest/icons and a worker
that caches only a static offline notice; Admin one-time hashed/revocable keys and
an actual inbound HTTP/Zapier-compatible create-client webhook with tenant scope,
validation/atomic idempotency; real local neural OCR with label-based field
mapping, confidence/text review and explicit normal client registration. A
fictional printed English sample form is included. The OCR image/text is never
persisted or sent to a provider. No generative-model claim is made.

Browser testing found and fixed a hostname bug: Next's internal Request.url may
use localhost even when the browser uses 127.0.0.1. Browser Origin checks now use
the received Host, and org-switch redirects retain the validated browser origin;
this prevents a host change from losing the cookie. Org switches revoke the old
session; forged org-cookie/token combinations cannot read another org's data.

Validation under Node 22: npm run check passes lint/typecheck and 148 tests in 25
files. npm run build passes, including all worker/model runtime assets and no
private demo data in build traces. P2 isolated production browser harness passes
real upload/download/deletion/roles, cross-org session/client/document denial,
reviewed OCR registration (sample 94% confidence), aggregate Word export, mobile,
authenticated webhook creation/replay/revocation, org-switch logout/login, PWA
manifest/registration/offline fallback and zero cached client records. No external
browser requests were made. P0 and P1 isolated production browser regressions also
pass; existing donor portal and unique-priority allocation regressions are run
against the updated local app. See temporary screenshots
/tmp/hackleaf-p2-funder.png and /tmp/hackleaf-p2-intake-mobile.png.

Local server restarted on 127.0.0.1:3102 using Node 22. The ignored private
.demo-data/workspace.pre-p2-backup.json was saved beforehand. Verified original
accounts, clients, visits, appointments and all unexpired sessions remain.
README/docs/client-demo.md document setup, dependencies and limits. SQL remains
disabled; documents use private local files rather than Supabase Storage. No
Salesforce/DonorPerfect OAuth sync or hosted Zapier account is connected. The
inbound HTTP endpoint can be configured in a real Zapier workflow after an HTTPS
host is supplied; no provider was contacted during this task. PWA is an online
workspace with a static offline fallback, not offline patient storage. The
multi-org registry is two fictional tenants; production invitations/provisioning,
cloud persistence, malware scanning/secure erasure and real-client governance are
not claimed. All work remains local and unpushed in the user's requested branch.

Final packaging correction: route tracing exclusions do not remove private file
references from Next 16's Node proxy trace. npm run build now also runs
scripts/private-build.mjs to exclude local .demo-data/env paths from deployment
manifests and assert none remain. It never reads, modifies or deletes the private
data files. Final build passed across 52 traces, excluding 3 private references;
independent trace scan found zero. Standard readFile storage code is retained.
No trace-obfuscation or generated dependency source patches are used. Final donor
portal and unique-priority browser regressions both pass. P2 full browser harness
passes with no external requests; P0/P1 harnesses also pass. Final server restart
uses this sanitized build. Existing private backups and Supabase settings remain
ignored by git and excluded from deployment tracing.


## Remove donor self-service — 2026-11-15

User explicitly requested complete removal of the donor portal. Created
feat/aditya-remove-donor-portal. Deleted src/app/donor-portal and
src/features/donor-portal, including registration/login/donate/history/profile,
model, CSS, mapping doc and portal-only tests. Old URL namespace returns 404 in
both live and demo modes. No donor database records, staff donor management,
client records or donation requests were deleted.

Moved shared donation-request state into a giving-only provider under
src/features/donation-requests; it contains requests/gifts/allocations, no donor
profiles or login state. Moved/trimmed staff authentication CSS under demo-auth.
Removed portal navigation, auth links/live placeholder text, self-service chat
identity handling, profile action/read tools, route allowlist and portal-specific
assistant knowledge/tests. Retained defensive rejection of non-staff assistant
audiences and old action names; the legacy snapshot profile slot accepts null
only, so no donor identity state can enter the assistant contract.

Validation: npm run check passes lint/typecheck and 145 tests across 24 files;
4 removed portal model tests are replaced by a proxy regression proving all six
old URLs return 404 in both modes. npm run build passes and private build guard
passes with 46 traces. P0 browser flow passes staff signup/login/logout, client
and visit CRUD, settings, reload and mobile. Priority allocation browser flow
passes sums/overflow/details and mobile. Staff assistant browser suite passes
5 tests, with 1 existing diagnostic test skipped. Anonymous URL and authenticated
browser smoke confirms all removed URLs 404, no portal navigation, and existing
staff donor records remain accessible. Updated app runs on 127.0.0.1:3102; SQL
remains disabled. No private data was changed or deleted. Old generated dev-route
types referencing deleted pages were moved to a temporary backup for regeneration.


## Dashboard design and mathematical analytics — 2026-11-15

User requested a much more attractive dashboard with graphs and detailed math.
Created feat/aditya-dashboard-analytics. Proposed three review slices before the
larger implementation: pure calculations, chart components, then page layout.
All changes stay within case-management plus README/handoff docs; no dependency,
SQL, schema or donor-portal restoration was introduced.

Replaced the sparse dashboard with a green gradient welcome area, quick actions,
4 KPI cards, interactive 7/30/90-day reporting, daily current/prior trend graph,
service mix donut, reach/repeat rates and averages, current age distribution,
recorded services per staff, appointment status/closed completion, completeness,
funding progress/priority amounts, recent service timeline and existing assigned
reminders. Pure math is in dashboard-metrics.ts, client charts in
 dashboard-charts.tsx, analytics/funding panels in dashboard-analytics.tsx,
page assembly in dashboard.tsx and scoped dashboard.module.css. No client records
or auth secrets are serialized to chart components; only aggregate summaries,
service labels and staff names are sent. Existing staff permissions remain.

Metrics state exact period/comparison bounds, denominators, snapshot limitations
and rounding. Empty/zero-prior data does not invent growth, pie segments or
averages. Funding is visibly labeled an all-date, browser-memory staff simulation
independent of the reporting period. No outcome/causation or staff quality claims.
The math test fixtures prove period boundaries, exclusions, zero cases,
completeness, Phoenix registration dates, appointment windows and birthday groups.

Browser QA found a React 19 SSR mismatch caused by multiple JSX children inside
SVG title elements; changed dynamic SVG titles to single text strings. Final
production harness passes seeded and entirely empty client records, all three
filters, exact tables, formula expansion, funding display, 390px layout and zero
page errors after a full reload. Desktop/mobile screenshots are
/tmp/hackleaf-dashboard-desktop.png, /tmp/hackleaf-dashboard-preview.png and
/tmp/hackleaf-dashboard-mobile.png (temporary fictional data only). No runtime
test records were written to the actual local workspace.

Validation: npm run check passes lint/typecheck and 150 tests in 25 files. npm run
build passes, including private runtime trace filtering (46 traces). Isolated
production dashboard browser harness passes; staff assistant regression runs to
check route hydration, different browser year, review/apply and mobile behavior.
Local production server restarts on 127.0.0.1:3102 using Node 22. SQL remains off;
the donor portal remains removed. README/demo documentation includes the metrics
and source distinctions. Existing saved client data is preserved.

Final dashboard regressions: staff assistant browser suite passes 5 tests with
1 existing development-only diagnostic skipped, including dashboard hydration
under extension markers and a browser clock in 2030, signed review/apply,
packet download and mobile controls. Dedicated dashboard browser harness passes
all three filters, detailed daily tables and formulas, populated/empty reloads
with no page errors and no mobile overflow. Local app health returns 200 on the
updated build. Desktop/mobile screenshots were visually inspected; theme and
responsive cards/charts are preserved. No additional runtime dependencies added.


## Brief dashboard summary — 2026-11-15

User requested the same assistant summarize the dashboard very briefly for Today,
Month, Year and All time (four listed scopes). Created
feat/aditya-dashboard-brief. Added dashboard-summary.ts pure calendar aggregation,
server-only dashboard-summary-ai.ts using the existing openAIProvider, protected
/api/dashboard-summary POST, a dashboard-summary-panel client component and scoped
styling. The initial Today brief is factual SSR; each period/refresh fetches fresh
organization records. Month/year are calendar to date in Phoenix; all-time means
retained records through today. Client directory totals are current snapshots.
Funding browser simulation is excluded explicitly. Three sentences maximum.

The AI selects a validated subset of supporting fact IDs; wording/counts are
rendered server-side from approved facts. It can neither fabricate numeric claims
nor invoke actions. This is transparently labeled AI-assisted, not unrestricted
AI prose. Aggregate-only payloads exclude names, emails, phone numbers, notes and
documents. Existing OPENAI_MODEL/OPENAI_API_KEY provider is reused; same
AI_DEMO_ENABLED gate, per-user rate limits and shared daily demo budget apply.
No API keys were added, no AI flag enabled and no paid provider requests made.
Unconfigured AI, network/provider failures, invalid selections or rate limits
show a clearly labeled factual summary instead of a false AI success. Endpoint
independently checks session, org scope, origin, strict period schema, bounded
body and no-store. Panel aborts previous requests and ignores late responses;
errors retain the last summary and reset the selector to its actual period.

Validation under Node 22: lint/typecheck and 156 tests pass across 26 files.
Calendar boundaries (today/month/year/all), zero records, privacy, model selection
validation, auth/origin/extra-field rejection and fallback/rate-limit behavior are
tested. The provider is mocked for tests; production does not mock AI success.
Production build passes with private trace guard. Extended dashboard browser
harness tests all four summary periods against the real local endpoint, fallback
labeling, concise text, existing charts/tables/formulas, mobile and empty reloads.
The running local app is restarted after final checks; SQL remains disabled and
existing data is preserved. README and demo documentation updated.


## AI-ranked donation queue — 2026-11-15

User requested AI-assigned card priorities and always-ascending order. Created
feat/aditya-ai-request-priorities. Added pure priority-planner, server priority-ai,
protected /api/donation-requests/prioritize, and use-ai-priorities hook. Demo tab
receives server AI-ready boolean; automatic ranking runs on entry and after
create/edit, with a refresh action. Existing funded priority labels are locked;
eligible unfunded active requests receive distinct numbers after the funded
anchor; drafts follow. Card order uses one shared ascending sorter in demo and
live views, including filters and next-request selection. No live SQL AI writes.

Same OpenAI provider/model is reused, with shared demo gate/budget and new scoped
per-user limit. The AI returns only candidate IDs; server and client validate the
exact permutation before any local update. Snapshot identity/abort sequencing
prevent a late response from overwriting donations or later edits. Model failures,
invalid output, missing credentials and rate limits keep old priorities with
explicit UI feedback. Config predicate moved to assistant/config.ts and the
existing dashboard export delegates to it. No environment values were changed.
Current AI remains off, so real app assigns unused numbers and labels the state;
no false AI assignment is claimed. Demo browser state resets on reload.

Validation: pure/unit cases cover ascending nonmutating sort, funded locks,
allocations preserved, draft handling, exact ID permutations, auth/origin/live
mode denial, invalid queue input, disabled AI, valid model output and provider/
budget errors. Isolated UI harness intercepts the model-ranking route (no paid
calls), proves ranking after creation, funded priorities fixed, cards unique and
ascending across status/search, stale-response protection when a donation arrives,
mobile and no page errors. Existing real AI-off priority/overflow browser flow
is run against the final local server. Lint/typecheck/tests/build and private
trace filtering complete before restart. README/demo documentation updated.

Final queue validation: npm run check passes 164 tests in 28 files plus lint and
typecheck. Production build/private guard pass (48 traces). Intercepted AI-priority
browser test and the real AI-off unique-priority/donor-sums/overflow/details/mobile
regression both pass. App health is 200 on the final Node 22 production server at
127.0.0.1:3102. AI remains disabled because the existing key/flag are unconfigured;
no actual model calls were made and no hosted records were changed.
