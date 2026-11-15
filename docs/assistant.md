# Hackleaf assistant

An OpenAI-powered assistant is available from **Ask Hackleaf** on every page. Open/close with the button or Cmd/Ctrl+J. It understands the current page, preserves a conversation across staff navigation, and resets the conversation when switching to the donor audience or changing donor demo identity.

## What it does

The tool registry exposes 22 narrowly defined capabilities, filtered by the current audience and verified live role:

| Read / prepare | Reviewed changes |
| --- | --- |
| Giving totals, quarterly coverage and due/overdue next steps | Create or update a donor relationship |
| Donor search, YTD retention and gift/contact timelines | Assign an active board owner; transfer open next steps |
| Board workload and donation-request funding priorities | Create, edit, complete or reopen a dated next step |
| Current donor's own demo profile and gifts | Log a communication the human says actually occurred |
| Evidence-aware funder packet downloads | Save editable email/SMS drafts, never send them |
| Scoped, formula-safe CSV exports | Create/edit donation requests in the shared demo |
| Attached CSV validation/preview | Change the current donor demo's phone/contact/anonymity preferences |
| Page navigation and curated workflow help | All changes require a separate review-card Apply click |

Example prompts:

- “Who lapsed this year, and what did they give last year?”
- “Prepare a next step to call Jordan Ellis on November 16 about AI Academy.”
- “Draft a thank-you using Mesa Learning Fund's actual gifts. Don't invent outcomes.”
- “Prepare a January–November funder packet for Mesa Learning Fund.”
- “Create a $2,000 AI Academy supplies request and save it as a draft.”
- “Validate the CSV I attached as a Zeffy export.”
- In the donor portal: “How does priority-based giving work?” or “Block email and text contact for my demo profile.”

Record changes appear in the shared demo's donor directory/profiles, overview, next steps, outreach drafts, donation requests or own donor preferences. Demo state and chat history live in tab memory and reset on reload. The assistant does not present a client-state edit as a database write.

## Local setup

Keep secrets in the gitignored `.env` or `.env.local`:

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
AI_ACTION_SECRET=
```

The implementation task configured a random `AI_ACTION_SECRET` in the local `.env` without printing it. A teammate/deployment needs its own randomly generated secret of at least 32 characters. Generate one locally with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and put the result directly into the environment; never send it in chat or commit it.

Run `npm ci` and `npm run dev`. Next.js loads `.env` automatically. In development, the fictional assistant works with an API key; missing configuration produces a visible setup state. API credit is separate from having a ChatGPT subscription. During verification, the supplied key loaded correctly but the API returned **429 `credit_balance_exhausted` / `insufficient_quota`**. No successful real model response has been claimed. Replace/fund the project key to enable that final external integration check.

The [Responses API](https://developers.openai.com/api/docs/guides/streaming-responses), [function-calling contract](https://developers.openai.com/api/docs/guides/function-calling), [strict schema subset](https://developers.openai.com/api/docs/guides/structured-outputs) and [GPT-5.4 mini model reference](https://developers.openai.com/api/docs/models/gpt-5.4-mini) were checked during implementation. The server fixes the official OpenAI endpoint; arbitrary model-supplied URLs, shell/SQL commands and browser credentials are never executable tools. `OPENAI_MODEL` can select another Responses/function-calling-compatible model. The SDK streams typed events and uses its documented output-to-input projection when replaying function-call/reasoning outputs. Tool schemas remove Zod-specific string length/complex-pattern constraints from the model schema, retaining them in the authoritative server validator and describing the length bounds. Batched tool requests are processed under the same 12-call/five-proposal ceilings. Provider storage is disabled with `store: false`; this is not a claim about all provider retention policies.

## Live backend

Apply `supabase/migrations/202611140003_assistant.sql` after the existing foundation/import migrations. This task does not apply migrations to an external database or create staff accounts.

- Live identity is checked with Supabase `getUser()` and active `members` role; a selected browser email or donor UI state never grants access. Board members read owned donors through existing RLS. Admin-only tools are removed from their registry and independently checked on execution.
- The new migration provides transactional action application, locked least-loaded board assignment, exact-once receipts, stale-record checks and durable daily AI turn reservations. It uses explicit membership/ownership checks, a fixed empty SQL search path and restricted function grants. No service-role key is exposed or required by the app.
- Receipts contain actor/action IDs, operation, input hash and minimal result metadata, not transcripts or donor/message content. Direct RPC calls still enforce active membership and operation-specific permissions.
- Deploy with `AI_ACTION_SECRET` set and HTTPS. Production demo requests are disabled unless the owner deliberately sets `AI_DEMO_ENABLED=true`; that setting permits paid requests by fictional-demo visitors. Live staff mode does not need that flag.
- Live donor-account binding and the broader sign-in UI remain pre-existing integration work. A real donor portal is not authorized by matching email addresses. Live donor-audience chat therefore does not expose staff data or mutate donor preferences.

## HTTP and agent boundaries

`GET /api/assistant/status?path=/...` checks availability and issues an HttpOnly, SameSite=Strict, signed session cookie. In production the cookie is Secure. It never returns a key.

`POST /api/assistant/chat` validates a bounded JSON body, audience/path, user text, optional CSV and demo snapshot. It sends NDJSON text/tool/proposal/artifact/navigation events. The model gets only queried tool results, not the entire workspace snapshot or raw attached CSV. Live mode ignores browser-supplied demo data. Client history cannot introduce system/tool messages or override permissions.

`POST /api/assistant/actions` accepts a signed proposal, current path and optional latest demo snapshot. The token binds actor, session, audience, mode, action, prior target state and a ten-minute expiry. Tampering, a different user/session or stale records fail. Demo confirmations are replay-safe for the worker/session; live receipts are persisted atomically. Confirmation does not call the model again.

Limits: 6 chat requests/minute per actor; 20 confirmations/minute; at most 4 model rounds, 12 tool calls and 5 proposals per turn; 2,200 output tokens per model round; 55-second response deadline; 20 bounded history messages; 50 KB CSV attachment; 250 KB HTTP body; bounded tool results and database reads. Partial results are identified; complete exports/packets are refused when data was truncated. Stop aborts the provider request. Errors are returned without API keys, raw provider error bodies or prompt logging.

Live daily reservations cap at 60 turns/member and 200 turns/CIC organization. The demo has a 120-turn/day **per-process** allowance and per-process rate limits; multiple server instances multiply that demo allowance. These are request ceilings, not a dollar-denominated billing guarantee. Keep the public production demo disabled unless its budget is approved, and use the OpenAI project's spend controls. There are no background model calls or automatic retries.

Notes/CSV cells/tool content are explicitly treated as untrusted data. The model cannot execute arbitrary SQL/code or select external network endpoints. The UI renders sanitized Markdown, suppresses raw HTML and allows only approved internal navigation links. Outbound messages/payments, role changes, deletion and bulk import commits are not chatbot tools.

## What the merged-app review found

Baseline before this change: lint, TypeScript, 66 tests and production build passed. That does not mean every live feature is finished. The existing root live setup gate, live donor identity/sign-in integration, communication/outreach HTTP stubs, payment provider and outcomes feed remain incomplete. The existing import commit code does independent writes and must become transactional before being advertised as atomic; this assistant only previews CSVs and never invokes that commit path. Real export headers, consent policy and fiscal-year definitions remain unconfirmed.

The donor welcome copy still mentioned a removed donor-selected program field; it was corrected to amount/frequency so the assistant and interface agree on priority-based giving.

## Verification and maintenance

```bash
npm run check
npm run build
npm run test:assistant:browser
# Development hydration diagnostics and Strict Mode (stop other dev servers first):
PLAYWRIGHT_DEV=true npx playwright test --config=playwright.assistant.config.ts
```

Browser tests use installed Chrome by default; set `PLAYWRIGHT_CHANNEL=chromium` after installing Playwright Chromium if needed. They start an isolated production-build demo on port 3310 with a test-only signing key. They intercept the model response only in the test browser and exercise the **real** confirmation endpoint, UI state updates, token tampering, stale review, replay, downloads, Stop, focus return, mobile sizing and staff/donor conversation reset. This creates no model charges and does not test or claim a funded OpenAI response. The application contains no fake AI provider or fallback canned replies.

Hydration regression tests simulate extensions adding `bis_skin_checked` throughout framework/application markup and a `__processed_<UUID>__` body attribute before React loads. A synchronous client instrumentation pass removes only those reported markers before hydration; all hydration diagnostics remain enabled. Tests check all 14 demo routes, a different browser year and an intentional unrelated mismatch. See [browser compatibility](browser-compatibility.md). Connection checks ignore obsolete results after navigation/unmount instead of aborting the small status fetch during Strict Mode cleanup. Streaming responses still support Stop and abort on unmount. A delayed-status regression verifies that an obsolete route cannot disable a newer working chat.

Unit tests cover permissions, tool grounding, exact USD totals, bounded streaming, Unicode, signed sessions/expiry, action reducers, preview-only imports and honest missing-evidence packets. Embedded Postgres tests run the actual migration and verify owner isolation, no role escalation, atomic replay, stale reviews, draft-only persistence, real actor attribution, balanced assignment and usage caps. Hosted Supabase sessions must still be tested with real provisioned admin/board accounts before live operation.

The in-app Browser runtime reported no available browser connection during this task. Playwright with installed Chrome was used as the frontend workflow's fallback. UI screenshots are local QA intermediates, not committed fake product imagery.

Final local verification: lint/TypeScript and **85 unit/database tests passed**, production build passed, **seven development browser tests passed**, and **six production-build browser tests passed** at 1440×1000 desktop and 390×844 mobile. The intentional diagnostic test is development-only and skipped in production, where React omits attribute warnings. The suite checks all 14 demo routes with the reported extension mutations and a browser year of 2030, as well as the real review/apply endpoint, navigation, Stop and donor/staff isolation. The open review panel had **zero automated WCAG A/AA violations** in axe. Tests use a test-only streamed model response, not a funded OpenAI answer. The configured OpenAI key was also checked for absence from client/public/source files; the production dependency audit reported zero known vulnerabilities.

Shared-state integration: `AssistantWorkspaceProvider` owns fictional donors, tasks, communications and drafts; the existing donor provider owns request/allocation/profile state. Keep those as the common source when extending the pages. Donor-audience requests omit staff records; preference confirmation preserves the full local staff state, and changed preferences refresh the visible profile form. Server live mode uses Supabase identity/RLS and ignores all demo snapshots.

Add a capability by defining a strict Zod input schema, role/audience policy, server tool and reviewed mutation/transaction if needed; then add domain/authorization tests. Never solve a missing feature by giving the model unrestricted database or network access.
