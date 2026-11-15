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
