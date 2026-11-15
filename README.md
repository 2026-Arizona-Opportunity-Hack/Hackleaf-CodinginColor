# Hackleaf — Coding in Color

Built at [ASU Fall Hackathon 2026 | Phoenix Hackathon for Nonprofits: Nov 14-15](https://www.ohack.dev/hack/fall-2026) for the public good (MIT license).

**Current status: teammate-ready Next.js foundation, not the completed P0 product.** Run a fictional donor workspace without accounts or keys. Read the [requirements](docs/requirements.md), [architecture](docs/architecture.md), and [three-person work plan](docs/team/README.md) before contributing.

**OpenAI assistant:** use **Ask Hackleaf** on any page (Cmd/Ctrl+J). It can query the workspace, prepare reports/CSV downloads and propose donor, task, outreach and request changes for review. Applied demo changes update the pages. Add a server-side `OPENAI_API_KEY` with API credits to enable the model; production/live setup, tool capabilities and tests are in [the assistant guide](docs/assistant.md). No automatic messages or payments.

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

## Before hacking ends — the submission checklist

Everything is submitted from your [Team Dashboard](https://www.ohack.dev/hack/fall-2026/manageteam); judges read the dashboard, this README and your demo video.

- [ ] **Code pushed** to this repo, in small PRs (see `AGENTS.md`) — judges and future recruiters read the history
- [ ] **Project story** written on the dashboard (`#project`): the problem, who it helps, what you built, what's next
- [ ] **Demo video** (4 minutes or less) on YouTube, Vimeo, Loom or Google Drive, linked on the dashboard (`#demo`) — show it working, not slides
- [ ] **Submit** on the dashboard (you can keep editing until the close)
- [ ] This README filled in below: team, tech stack, how to run it, live link if you have one
- Optional: a [DevPost entry](https://opportunity-hack-2026-arizona.devpost.com/) — the dashboard is the submission of record.

Judges score **Scope, Documentation, Polish and Security**, plus a separate **Accessibility** prize — the rubric is at [ohack.dev/hackathon-judging-criteria](https://www.ohack.dev/hackathon-judging-criteria). Document your work as GitHub Issues as you go: that's how you get public credit for it.

## Team

- **Kaustubh D** — shared platform, auth, database, reporting API and integration · [agent prompt](docs/team/kaustubh.md)
- **Vishnu Dwivedi** — donors, imports and retention · [agent prompt](docs/team/vishnu.md)
- **Aditya Prakash Sahu** — follow-ups, reviewed outreach and funder packets · [agent prompt](docs/team/aditya.md)

## What we built

Coding in Color needs one reliable place for donor history, board ownership, follow-through and evidence for funder renewals. The base provides a branded responsive workspace, searchable/filterable fictional donor directory, profiles/timelines, retention calculations and separate feature routes for parallel implementation.

Also included: typed domain/validation contracts, source fixtures, Supabase clients/migrations, business-rule/database tests, CI, CSV preview/live import primitives, donation-request and donor-portal demos, outreach review, packet preparation and the OpenAI assistant. Live sign-in/donor identity, transactional bulk import, delivery/payments and outcomes integration remain incomplete. The assistant adds an atomic authenticated mutation backend; it does not turn the existing simulated donor portal into real authentication or payment processing. No public deployment or real donor data is included.

## Tech stack

- Frontend: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4; semantic HTML and CIC brand tokens.
- Backend: Next.js Server Components and Route Handlers; Zod validation. No separate service.
- Database: Supabase/Postgres migration and RLS foundation; optional free project, not provisioned.
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

Open `http://localhost:3000`. Use Node 22.13+ (22.x). Run `npm run check` and `npm run build` before handing off. `APP_DATA_MODE=live` intentionally closes the fixture workspace until auth and live repositories are implemented.

Browser-extension hydration warnings and the compatibility tests are explained in [browser troubleshooting](docs/browser-compatibility.md).

Teammates: follow [your personal prompt](docs/team/README.md), own only your assigned paths, and request shared-file changes from Kaustubh. All dependency/migration changes go through one owner to reduce merge conflicts.

## Links

- Live demo: not deployed yet.
- Demo video: not recorded yet.
- Design / docs: [visual reference](docs/design/README.md) · [API proposal](docs/api.md) · [deployment](docs/deployment.md) · [P0 map](docs/requirements.md).

## After the hackathon

Winning teams finish the project with the nonprofit — the [Definition of Done](https://www.ohack.dev/about/completion) (deployed, nonprofit sign-off, docs, open source) is tracked on your team page. Keep the repo public and the README honest; recruiters do read these.

Need a hand this weekend? [#ask-a-mentor](https://opportunity-hack.slack.com/archives/C01E5CGDQ74) on Slack, or ask in [#vdwived2](https://opportunity-hack.slack.com/app_redirect?channel=vdwived2) and a mentor will drop in.
