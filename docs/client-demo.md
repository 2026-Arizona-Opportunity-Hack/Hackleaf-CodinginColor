# Client and visit demo P0 + P1 + P2

The user explicitly selected the generic client-management checklist in addition
to the donor platform and asked to keep SQL disabled. All changes remain in this
repository. Local demo functionality is implemented; no public deployment or
production client-data service is claimed.

| P0 | Demo acceptance |
| --- | --- |
| Auth and role-based access | Email/password signup/login, opaque HttpOnly cookie sessions, fixed Staff signup, seeded Admin/Staff accounts, anonymous page/API denial, logout and expiry. Staff read/create; Admin also edit/delete/configure. |
| Client registration | Name, DOB, phone/email, 4 default demographic fields configurable to 3–5; UUID assigned; searchable client list. |
| Service logging | Date, configurable dropdown, verified signed-in staff identity, notes; tied to client. |
| Profile | Contact/demographics on top, newest-first service history below, Admin CRUD. |
| Seed and deployment | Automatic 12-client/36-service seed; Render blueprint and one-click button prepared. Public URL deferred by user's local-demo choice. |

## Run locally

Use Node 22, `npm ci`, `APP_DATA_MODE=demo` in `.env.local`, `npm run build`, then
`npm start -- --hostname 127.0.0.1 --port 3102`. No SQL or external identity service
is contacted. Open http://127.0.0.1:3102/auth/sign-in.

Admin: `admin@hackleaf.demo` / `DemoAdmin!2026`.
Staff: `staff@hackleaf.demo` / `DemoStaff!2026`.
New email/password registrations are Staff and can immediately read/create
clients and service entries; there is no approval requirement. Google SSO is not
part of this SQL-disabled local demo; the checklist's email option is implemented.
Use fictional data and demo-only passwords.

## Storage and permissions

The local server stores JSON at `.demo-data/workspace.json`, or the directory
specified by `DEMO_DATA_DIR`. It is outside public assets, ignored by git and
excluded from build tracing. Files are owner-only. Writes take a filesystem lock
and replace the JSON atomically. A malformed file fails instead of silently
resetting records. The store is designed for one Node instance, not serverless or
multiple replicas. Do not put real client or patient data in this demo.

Passwords use salted scrypt hashes. Session tokens are random opaque values;
only SHA-256 hashes of those tokens are stored. Cookies are HttpOnly, SameSite=Lax,
8-hour lifetime, and Secure behind HTTPS. Every client mutation resolves the user
from the session on the server. Registered users cannot choose their own role or
submit another staff identity on service entries. Admin edits use revision checks
so stale browser forms cannot silently overwrite later changes.

Staff may read all demo clients and create clients/service entries. Only Admin
may edit/delete them or configure fields/types. Deleting a fictional client also
deletes its service entries after confirmation. Removing a demographic field
keeps its stored historical values; retiring a service type keeps its historical
labels. Auth secrets, hashes, session tokens and patient details never enter the audit
stream. Account/session actions record counts only. Existing donor simulations remain separate in browser memory.

## Optional Render publication

1. Push branch `feat/aditya-client-p2-demo` to this same repository, or merge the
   reviewed changes to main. The deploy button cannot use unpushed local files.
2. Use the README button; select the branch containing `render.yaml`.
3. Review the free web service, Node 22 build/start commands and `APP_DATA_MODE=demo`.
   No SQL service or paid persistent disk is declared. Do not add real keys/data.
4. Deploy in the owner's Render account, then record the returned public URL in
   README and verify sign-in, seeded clients and role permissions there.

The blueprint uses `/tmp/hackleaf-client-demo` on one Node service. Render's free
filesystem is ephemeral: accounts/edits reset on restart, redeploy or spin-down.
The next first login re-seeds fictional data. This is deliberate demo behavior,
not a persistence promise for real records. Details:
[Render blueprint reference](https://render.com/docs/blueprint-spec),
[deploy button and branches](https://render.com/docs/deploy-to-render),
[free service storage limits](https://render.com/docs/free).

No Render project was created and no public URL is claimed in this local-only task.
Sites hosting was evaluated: it targets Cloudflare Workers; this local-file Node
app retains the existing Next.js runtime instead of moving to another repository
or introducing a different database just for hosting.

## P1 workflows

All five P1 items run locally with the existing green theme and email/password
Admin/Staff sessions. No migration, SQL connection, email provider or payment is
needed. The known v1 JSON file upgrades atomically to v2 on first read; existing
accounts, sessions, clients and service histories are preserved. Three fictional
appointments and two service-log field definitions are added. Never replace the
store manually to enable these features.

| Feature | Where and behavior |
| --- | --- |
| CSV import/export | Admin `/client-data`: download template, upload, preview every row, explicitly skip invalid rows if needed, then commit. Exports include all clients or all service logs. |
| Reporting | `/client-reports`: active clients, services this week/month/quarter, filtered service-type bar chart and daily trend, accessible tables, Print / Save as PDF. |
| Calendar | `/appointments`: today/day/week, previous/next, schedule/edit/cancel/complete; Admin can delete. Bookings cannot overlap for the same client or assigned staff. |
| Configurable fields | Admin `/client-settings`: add/edit/remove client demographics (3–5) and service-log fields (0–8), text/whole-number/dropdown. JSON schemas are stored in the local data file and downloadable. |
| Audit | Admin `/audit`: chronological events, action filter, pagination, staff identity, timestamp and before/after structural values. |

CSV requires ISO `YYYY-MM-DD` DOB, at most 1,000 rows and 500 KB. Use the current
template's canonical headers for custom fields. Unknown/duplicate headers,
malformed quoting, invalid dates/contacts and wrong row widths are rejected.
Existing client IDs are skipped; blank IDs create new clients. An identical file
cannot be imported twice. This is file replay protection, not identity matching:
changing a file and leaving IDs blank can create another person record. Imports
are revalidated under the write lock and rejected if field definitions changed
since preview. CSV exports protect formula-like spreadsheet cells. Patient CSV
files remain sensitive even in a real deployment; this demo accepts fictional data.

Reporting uses America/Phoenix operational dates, Monday weeks and calendar
quarters. Week/month/quarter totals end today; the charts use the selected date
range (up to 366 days). Inactive clients are excluded from the active count but
historical services remain in totals. Browser print can save a PDF locally.

Staff can schedule and manage their own appointments; Admin can manage any.
Reschedules use revision checks. Completion is allowed only after the start time
and does not automatically fabricate a service log. Log the actual service on
the client profile. Dashboard reminders show assigned scheduled visits in the
next 24 hours and overdue visits from the preceding 24 hours. They refresh each
minute while visible and can be dismissed for one hour, persisted per staff user.
These are in-app reminders; nothing is sent by email or SMS.

Removing fields retires their schema properties and preserves existing values.
Changing a type or dropdown options is rejected if historical values would become
invalid. Active fields appear on new/edit forms and exports; existing stored
historical values remain available on profiles. The downloadable JSON bundle
contains the client and service custom-field schemas, not patient records.

Audit before/after values deliberately contain counts, existence flags and
revision numbers, with changed field names. Raw clinical before/after values,
client identifiers, names, DOB, contacts, custom values, notes and appointment
times are excluded to meet the checklist's PII restriction. Staff actor identity
is included for accountability. Events cover client/service CRUD, field/type
configuration, imports, appointment changes and account/session changes. Failed
mutations do not append success events. History begins when this feature is
introduced and cannot be edited/deleted through the UI. The JSON file is not a
tamper-proof compliance system; no HIPAA/compliance certification is claimed.


## P2 demo features

These extend the exact client/visit checklist. SQL remains disabled and the
existing default organization file retains all accounts, sessions and records.
No production storage or external CRM connection is implied.

- **Organization isolation:** `/organizations` offers two registered demo org IDs,
  `coding-in-color` and `hope-aid`. The organization cookie selects an allowlisted
  store; each has separate users, token hashes, clients, visits, schemas, audit,
  documents and webhook keys. Switching revokes the old session and clears its
  cookie; sign in again in the selected org. Both orgs initially seed the public
  demo credentials, but newly registered accounts exist only in their org. A
  token from one org cannot authenticate in the other. The default retains the
  original `.demo-data/workspace.json`; HopeAid uses
  `.demo-data/organizations/hope-aid/workspace.json`. Staff donation-request simulations remain in browser memory and reset on reload.
- **Documents:** PDF, PNG and JPEG uploads appear on client profiles. Maximum
  5 MB each, 20 per client, validated by file signatures and bounded request size.
  Staff in the selected org can upload/read; Admin can delete. Opaque file IDs
  resolve through authenticated metadata, never public asset URLs. Downloads use
  attachment disposition, no-store and nosniff. Filenames and file contents are
  excluded from audit. Local owner-only files replace Supabase Storage because
  SQL/cloud connections remain disabled. Deleting a client removes attachment
  access; backups/orphaned private blobs are not a secure-erasure guarantee.
- **Funder templates:** `/client-funder-reports` offers calendar month, quarter and
  year activity templates through today. Reports contain unique clients served,
  service counts and structured demographic breakdowns; free-text custom values
  are excluded. Source/missing-data statements are included, with no invented
  outcomes. Staff/Admin can print/save PDF or download escaped Word-compatible
  HTML in a `.doc` file (not DOCX). These are aggregate demo reports; no individual
  client names, DOB, contact details or service notes are exported.
- **Mobile/PWA:** responsive client flows plus manifest, 192/512px icons and
  service-worker registration. Chrome can offer Install Hackleaf when eligible;
  Safari users can use Share → Add to Home Screen. Installation requires HTTPS or
  localhost. The worker caches only a static offline notice. It never caches
  authenticated HTML, API responses, files or client records. Records require an
  online connection; this is not offline clinical storage.
- **HTTP/Zapier integration:** Admin `/client-integrations` creates up to five
  organization-scoped keys; copy the one-time value and revoke when finished.
  Only SHA-256 hashes are stored. `POST /api/client-integrations` accepts a Bearer
  key and X-Hackleaf-Organization header, with the documented JSON example. The
  bounded endpoint validates configured fields, creates a client under the
  organization's lock and returns its ID. A repeated external_id with identical
  validated content returns the original result; changed content is rejected.
  Revoked keys and keys owned by disabled/non-Admin accounts fail immediately.
  Keys grant create-client access only, never record read/update/delete. Audit
  events contain counts, not payloads or tokens. A reachable HTTPS deployment is
  needed for a real Zapier HTTP step. No outbound request, OAuth CRM sync or paid
  provider is enabled. Existing CSV import/export supports manual data exchange.
- **Photo intake:** `/client-intake` reads printed English PNG/JPEG forms using
  local Tesseract OCR and the bundled English model. Maximum 2 MB / 12 megapixels;
  scans are serialized per Node process and time out at 45 seconds. Known labels
  prefill name, ISO DOB, email, phone and configured demographics; ambiguous dates
  and unknown dropdown choices remain blank. The user reviews/edits and explicitly
  registers the client using the normal validated creation action. No image/text
  is persisted or sent to an AI provider. Neural OCR is local; field mapping uses
  deterministic labels, not a generative model. Handwriting and unusual layouts
  need manual correction. A downloadable fictional form is provided for demos.

P2 runtime dependencies: `tesseract.js` and `@tesseract.js-data/eng`. Official local
setup: https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md.
`npm ci` installs worker, WebAssembly core and models; the Next config includes
these runtime assets. The same single-instance/ephemeral-hosting limits above
apply to every organization and its document files.

Validation commands: `npm run check`, `npm run build`, then
`node src/features/client-p2/p2.browser.mjs` under Node 22. The harness starts a
temporary production server on port 3108, performs a real local OCR scan, checks
cross-org sessions/client/document denial, roles, token replay/revocation,
reviewed registration, report export, mobile layout and PWA/offline caching.

The standard `npm run build` also runs `scripts/private-build.mjs`. This removes
private runtime data/env references that Next's proxy trace can retain despite
route exclusions and checks that deployment manifests contain none. Always use
the repository build command for packaging. It does not change/delete local data.


## Dashboard analytics

The dashboard now includes 7/30/90-day filters, equal-length preceding-period
comparisons, an interactive daily service graph, exact daily table, service mix
donut, client reach/repeat metrics, staff service distribution, appointment status,
current record completeness, age distribution and a funding priority overview.
The green brand is preserved; cards and charts reflow on phones. Daily points can
be hovered or focused, and text tables/explanations provide the underlying values.

Service counts and unique-client denominators use this organization's retained
records. Future services and visits without a current client are excluded. Reach
uses all registered clients, including inactive people; repeat share uses clients
served in the selected period. Per-day averages include days with zero services.
Percent change is undefined with a zero prior denominator; the UI labels first
activity/no activity instead. Completion divides completed appointments by
completed plus cancelled; no closed appointments means no completion percentage.
Completeness measures nonempty name, DOB, one contact method and active custom
field values; it does not verify accuracy. Current client totals/completeness are
snapshots, not reconstructed historical populations. Expand “Understand every
calculation” for the numbers, formulas and date boundaries.

Funding uses the separate staff browser-memory simulation across all dates and
is explicitly independent of the client reporting filter. It shows active request
goals/allocations, received gifts, remaining needs, unallocated money and the
priority queue, using integer cents. Reload resets that simulation. No collected
payment, real-time SQL analytics, causal impact or staff performance scoring is
implied. Existing client records, account permissions and reminders are unchanged.

Run `node src/features/case-management/dashboard.browser.mjs` after `npm run build`
for isolated chart/filter/table/formula/mobile/empty-state browser validation.


### Dashboard brief

A three-sentence summary card appears directly below the welcome panel. Today,
Month, Year and All time use Phoenix calendar dates; month/year mean to date.
These scopes are independent of the rolling 7/30/90-day chart filters. Summaries
cover this organization's saved clients, services and appointments; browser-memory
funding simulation is explicitly excluded. Directory totals are labeled current.

The initial text is computed from aggregate records. With the same existing
OpenAI API key/model and AI_DEMO_ENABLED=true, selecting a period or Summarize
with AI calls the existing assistant provider. The model selects one/two relevant
supporting fact IDs; the server always includes activity and renders approved
sentences directly from counts. This is labeled AI-assisted; it cannot invent
numbers or freeform conclusions. No client names, contact details, notes,
documents, tokens or database rows are sent to the model, and no mutation tools
are offered. The summary is not a payment/outcome report.

When AI is disabled/unconfigured, rate-limited or unavailable, the card labels its
factual fallback. No key/configuration was added or enabled in this task, and no
paid provider call was made during validation. The endpoint enforces sign-in,
organization context, same-origin requests, strict period-only input, bounded
request bodies, no-store and the assistant's shared daily demo AI allowance.
Requests can be cancelled; obsolete responses cannot overwrite a newer period.
No summary is stored in browser storage or written into client records.


### AI donation-request priorities

Donation cards always sort numerically ascending, including search/status filters
and the dormant live view. In demo mode, the existing OpenAI provider can rank
unfunded active requests on tab entry, create/edit, or Refresh AI priorities.
It uses title, purpose, program, goal and existing order, prioritizing explicitly
stated urgency/essential continuity and described beneficiary impact. Missing
facts are not invented; tied evidence should retain existing order. No arbitrary
impact score is shown. AI ranking is a judgment based on entered descriptions.

Requests with allocations keep their exact priority number. New AI-ranked active
requests follow the highest funded priority, followed by drafts, using distinct
numbers. Existing allocations are passed unchanged into the allocation planner;
re-ranking never moves received money between requests. Newly available eligible
money can still fund according to the resulting queue. The client rejects AI
results if the request/donation snapshot changed while ranking was in flight.

The model returns only a permutation of eligible IDs. Missing, duplicate, foreign,
funded or draft IDs invalidate the entire response. No actions/tools/SQL writes
are offered to the model. The authenticated same-origin endpoint bounds and
validates the complete fictional funding snapshot and uses the same demo AI flag,
API key/model, per-user limits and shared daily demo budget as other AI features.
Only candidate request descriptions/goals/IDs go to the provider, not gift/donor
records. Local model responses were mocked/intercepted during tests; no paid
provider calls occurred.

AI remains disabled in the current environment. Without configuration or on
provider/budget errors, the UI explicitly preserves current priorities rather
than claiming an AI assignment; new cards still get an unused automatic number.
The feature stays in browser-memory demo state and resets on reload. The live
view is sorted ascending, but no live database AI-reorder contract is introduced
while SQL is disabled. Use `priority-ai.browser.mjs` for the isolated intercepted
AI ranking UI test and `priority.browser.mjs` for the real AI-off allocation flow.
