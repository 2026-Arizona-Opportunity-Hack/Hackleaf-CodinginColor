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
