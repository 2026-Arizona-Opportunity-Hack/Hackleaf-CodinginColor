# Hackleaf — Coding in Color

Built at [ASU Fall Hackathon 2026 | Phoenix Hackathon for Nonprofits: Nov 14-15](https://www.ohack.dev/hack/fall-2026) for the public good (MIT license).

**Deployed at [hackleaf.vercel.app](https://hackleaf.vercel.app).** Full donor CRM live on Supabase (Google SSO + email login, staff approval, donor profiles, gift history, donation requests, AI-assisted prioritization) plus a seeded demo workspace for judges. No external keys needed to run the demo locally.

> **⚠️ This is your team's ONE repository — all code goes here.** Please don't create
> another repo (personal or org). Judges, the Team Dashboard's code-activity card,
> the public project page and the nonprofit all read **this** repo; work pushed
> anywhere else is invisible to them and won't count. Everyone on the team should be
> a collaborator here — ask an organizer in Slack if someone can't push.

| | |
|---|---|
| **Nonprofit** | [Coding in Color](https://www.ohack.dev/nonprofit/YIXYdYCoxIZC08uQ5DL3) |
| **Problem statement** | [Donor & Funder Relationship Platform (CIC Problem 2)](https://www.ohack.dev/project/e26932c0df1b11f189a8dead68f07eb5) |
| **Team page** | [Hackleaf](https://www.ohack.dev/hack/fall-2026/team/cb3f0794e05d11f1a3c6deadfb009123) · [Team Dashboard](https://www.ohack.dev/hack/fall-2026/manageteam) (story, demo video, submit) |
| **Slack** | team: [#vdwived2](https://opportunity-hack.slack.com/app_redirect?channel=vdwived2) · nonprofit: [#npo-coding-in-color](https://opportunity-hack.slack.com/app_redirect?channel=npo-coding-in-color) · help: [#ask-a-mentor](https://opportunity-hack.slack.com/archives/C01E5CGDQ74) |
| **Created by** | Greg V [Staff/Mentor] |

## Final day

Start recording your demo video by **Sun Nov 15, 12:00 PM MST** — hacking ends at **Sun Nov 15, 2:00 PM MST**, and a demo you recorded with time to spare beats a feature you finished at 1:59.

- Sun Nov 15, 11:00 AM MST — Presentation Feedback Hour
- **Sun Nov 15, 12:00 PM MST — Start recording your demo video**
- Sun Nov 15, 12:30 PM MST — Judges Arrive
- **Sun Nov 15, 2:00 PM MST — 🛑 Submission Deadline: Hacking ends**
- Sun Nov 15, 2:05 PM MST — Judging Round 1
- Sun Nov 15, 3:40 PM MST — Judging Final Round
- Sun Nov 15, 4:30 PM MST — Closing Ceremony: Winners Announced

## Submission checklist

Everything is submitted from your [Team Dashboard](https://www.ohack.dev/hack/fall-2026/manageteam); judges read the dashboard, this README and your demo video.

- [x] **Code pushed** to this repo, in small PRs (see `AGENTS.md`) — judges and future recruiters read the history
- [ ] **Project story** written on the dashboard (`#project`): the problem, who it helps, what you built, what's next
- [ ] **Demo video** (4 minutes or less) on YouTube, Vimeo, Loom or Google Drive, linked on the dashboard (`#demo`) — show it working, not slides
- [ ] **Submit** on the dashboard (you can keep editing until the close)
- [x] This README filled in: team, tech stack, how to run it, live link
- Optional: a [DevPost entry](https://opportunity-hack-2026-arizona.devpost.com/) — the dashboard is the submission of record.

Judges score **Scope, Documentation, Polish and Security**, plus a separate **Accessibility** prize — the rubric is at [ohack.dev/hackathon-judging-criteria](https://www.ohack.dev/hackathon-judging-criteria). Document your work as GitHub Issues as you go: that's how you get public credit for it.

## Team

- **Kaustubh D** — shared platform, auth, database, reporting API and integration · [agent prompt](docs/team/kaustubh.md)
- **Vishnu Dwivedi** — donors, imports and retention · [agent prompt](docs/team/vishnu.md)
- **Aditya Prakash Sahu** — follow-ups, reviewed outreach and funder packets · [agent prompt](docs/team/aditya.md)


Donor self-service has been removed. Staff manage donor records and donation requests from the authenticated workspace. Donation cards always sort by ascending unique priority. When configured, AI ranks unfunded active requests automatically on opening the tab and after create/edit; funded priorities and existing allocations remain fixed.

## Client and visit P0 + P1 + P2 demo

This branch also implements the user's explicitly requested client-management
checklist alongside the Coding in Color donor workspace. Keep `APP_DATA_MODE=demo`;
SQL is disabled. Open `/auth/sign-in` and use a fictional account:

| Role | Email | Demo password | Client/visit permissions |
| --- | --- | --- | --- |
| Admin | `admin@hackleaf.demo` | `DemoAdmin!2026` | Read, create, edit, delete; configure fields/types |
| Staff | `staff@hackleaf.demo` | `DemoStaff!2026` | Read and create |

New email/password registrations immediately receive Staff access. This is local
demo authentication, not Supabase or Google SSO; no emails are sent. Sessions use
opaque HttpOnly cookies; passwords are salted/hashed. Unauthorized users cannot
open the app or its APIs. Use fictional details only; demo account credentials
are intentionally public.

- `/dashboard`: a brief Today/Month/Year/All time summary, plus interactive 7/30/90-day analytics, daily comparison graph, service mix, reach/repeat rates, staff activity, appointment status, record completeness, funding progress, formulas and reminders.
- `/clients`: registration, unique IDs and name search.
- `/clients/[id]`: DOB/contact/demographics, service logging and latest-first history.
- `/client-settings`: Admin configuration of 3–5 demographic fields, up to 8 service-log fields, and service types; persisted JSON schemas.
- `/client-data`: Admin CSV preview/import and client/service exports.
- `/client-reports`: active clients, weekly/monthly/quarterly services, bar/trend charts and print/PDF.
- `/appointments`: day/week calendar, future scheduling, conflict checks and in-app reminders.
- `/audit`: Admin change history with staff, timestamps and before/after metadata; excludes client PII.
- `/organizations`: separate Coding in Color / HopeAid client workspaces and account sessions.
- Client profiles: private PDF/PNG/JPEG attachments (up to 5 MB), staff upload/read and Admin deletion.
- `/client-funder-reports`: month/quarter/year aggregate templates, Word-compatible download and print/PDF.
- `/client-intake`: local photo OCR, editable review and explicit client registration; includes a fictional sample.
- `/client-integrations`: Admin-managed, revocable inbound client webhooks for HTTP/Zapier workflows.
- Mobile/PWA: installable manifest and static offline page; client records are never cached offline.

The first login automatically seeds **12 clients and 36 service entries**. Client
records and accounts persist in the ignored `.demo-data/workspace.json` file on
this local server. Existing donor/request simulations still reset on reload.
Admin/Staff permissions are enforced in Server Actions, not just hidden buttons.
This single-instance file store is for a fictional demo, not real client data.

Run `node src/features/case-management/workspace.browser.mjs` with Node 22 after
`npm run build` for isolated P0 browser checks. It creates a temporary demo store,
starts port 3106, checks both roles, and cleans up its own fictional test data.
Run `node src/features/case-management/p1.browser.mjs` for the isolated P1 flows
on port 3107, including imports, reports, appointments, custom service fields,
reminders and audit privacy. Run `node src/features/client-p2/p2.browser.mjs` for
organization isolation, documents, local OCR, reports, webhooks and PWA checks on
port 3108. All harnesses use disposable data. See [demo behavior and limits](docs/client-demo.md).

OCR uses bundled Tesseract and English model packages from `npm ci`; no external
AI request, key or system OCR installation is needed. The demo uses local private
files rather than Supabase Storage. Webhooks work locally; connecting a hosted
Zapier account needs a reachable HTTPS deployment. Salesforce/DonorPerfect OAuth
sync is not configured.

### One-click deployment

Deploy the demo workspace to Vercel (recommended) or Render:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2F2026-Arizona-Opportunity-Hack%2FHackleaf-CodinginColor&project-name=hackleaf&env=APP_DATA_MODE&envDescription=Set%20to%20%22demo%22%20for%20fictional%20records%20or%20%22live%22%20to%20connect%20Supabase)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2F2026-Arizona-Opportunity-Hack%2FHackleaf-CodinginColor)

The blueprint selects a free Node service and creates no SQL service. Review the
plan in your Render account before deploying. Its temporary file store resets on
restart/redeploy/spin-down, so this hosting option is for fictional judging data.

## What we built

Coding in Color loses donor relationships across spreadsheets and email threads. Hackleaf gives their board one place for the full picture: who gave, when, how much, and what follow-up is due.

**Live workspace (Supabase, deployed):**
- Google SSO + email/password staff login with admin-controlled member approval
- Searchable donor directory with profiles, gift timelines and communication logs
- Donor registration form (name, DOB, phone, email) and admin-only staff management page
- Donation request tracking with AI-assisted priority scoring (OpenAI, optional)
- Dashboard summary email: reviewed outreach drafted and sent by staff
- Postgres RLS enforces admin vs. board-member access; no service-role key in browser
- 12 seeded donors + 36 gifts live in Supabase; auto-seeds on first demo login

**Demo workspace (fictional, no credentials needed):**
- Full client/visit case management: registration, configurable demographic fields, service logging, chronological profile view, appointment scheduling, funder report templates, photo OCR intake, Zapier webhooks
- 12 demo clients + 36 service entries seeded on first login; resets on redeploy

Incomplete: transactional import/assignment guarantees, Salesforce/DonorPerfect OAuth sync, persistent outreach outcomes. All unrouted features say so explicitly. See [assistant setup](docs/assistant.md) for AI configuration.

## Tech stack

- Frontend: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4; semantic HTML and CIC brand tokens.
- Backend: Next.js Server Components and Route Handlers; Zod validation. No separate service.
- Database: Supabase/Postgres migrations and RLS foundation; an existing project can be configured locally. No credentials are committed.
- Checks: ESLint, TypeScript, Vitest, embedded Postgres policy tests and GitHub Actions; Playwright for browser QA.
- Cost: free local demo; **no paid services unless organizer sponsorship is confirmed**. See [deployment](docs/deployment.md) for free-tier limits.

## Run it locally

```bash
git clone https://github.com/2026-Arizona-Opportunity-Hack/Hackleaf-CodinginColor.git
cd Hackleaf-CodinginColor
nvm install 22
nvm use 22
npm ci
cp .env.example .env.local   # no credentials needed in demo mode
npm run dev
```

Open `http://localhost:3000`. Use Node 22.13+ (22.x). Run `npm run check` and `npm run build` before handing off. `APP_DATA_MODE=live` uses staff authentication and live donor reads for the connected routes; incomplete routes show an explicit setup state. It never falls back to fictional records.

For a live staff connection, set `APP_DATA_MODE=live`, `NEXT_PUBLIC_SUPABASE_URL`
and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the ignored `.env.local`, then rebuild
and restart. Create a login at `/auth/register` or open `/auth/sign-in` with an
existing Supabase email/password account. Successful sign-in opens `/dashboard`,
with a welcome message, authorized metrics and session-aware navigation. Signed-in
users are redirected away from sign-in/register; sign-out clears the current
session and synchronizes other tabs. New registrations require email
confirmation when configured and project-owner membership approval.
The matching `members` row must be active with role `admin` or `board_member`;
client-supplied role metadata is never used for access. `/donors` and donor profile
URLs use the signed-in session and database policies. Connection/query failures
are shown separately from an empty donor list. A project API key does not replace
staff sign-in. If no staff account exists, the project owner follows the
[staff access setup](docs/handoffs/staff-access-setup.md). Donor self-registration still needs its shared database contract before live use.

For live donation requests, the project owner applies
[`202611140003_request_funding.sql`](supabase/migrations/202611140003_request_funding.sql)
after the two existing migrations, then apply
[`202611140004_request_access.sql`](supabase/migrations/202611140004_request_access.sql).
Any signed-in account can open `/donation-requests` and manage request goals;
staff approval is not required for requests. Donor identities still use staff permissions.
[Request funding setup](docs/handoffs/request-funding-setup.md) explains permissions,
received-gift allocation, historical gift exclusion and verification.

Teammates: follow [your personal prompt](docs/team/README.md), own only your assigned paths, and request shared-file changes from Kaustubh. All dependency/migration changes go through one owner to reduce merge conflicts.

## Links

- Live demo: **[hackleaf.vercel.app](https://hackleaf.vercel.app)**
- Demo video: link to be added on the [Team Dashboard](https://www.ohack.dev/hack/fall-2026/manageteam).
- Design / docs: [visual reference](docs/design/README.md) · [API proposal](docs/api.md) · [deployment](docs/deployment.md) · [P0 map](docs/requirements.md).

## After the hackathon

Winning teams finish the project with the nonprofit — the [Definition of Done](https://www.ohack.dev/about/completion) (deployed, nonprofit sign-off, docs, open source) is tracked on your team page. Keep the repo public and the README honest; recruiters do read these.

Need a hand this weekend? [#ask-a-mentor](https://opportunity-hack.slack.com/archives/C01E5CGDQ74) on Slack, or ask in [#vdwived2](https://opportunity-hack.slack.com/app_redirect?channel=vdwived2) and a mentor will drop in.
