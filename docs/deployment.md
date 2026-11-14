# Run, connect and hand off

## Free local start

Use Node **22.13 or newer in the 22.x line**, npm, and the committed lockfile. `nvm install 22 && nvm use 22` selects a supported runtime. Verify `node --version` and `npm --version` inside the repository: this machine initially selected Node 16 in that directory even though Node 22 was installed.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Visit `http://localhost:3000`. All demo records are fictional and dated November 14, 2026. No account, API key, paid plan, email provider or database is required. Search/filter donors and open a profile. Other routes explicitly identify unfinished features.

Checks: `npm run check` and `npm run build`. CI runs both. Unit tests include business rules and embedded-Postgres access policies. They do not substitute for live Supabase authorization tests.

## Budget and accounts

The user requires **free services unless organizers provide sponsored resources**. No account, purchase, deployment or external sending was performed by this foundation task.

- Optional Supabase **Free** provides a hosted Postgres/auth starting point. At the [official pricing page](https://supabase.com/pricing), checked November 14, 2026, it includes 500 MB DB and pauses after one week of inactivity. Pro starts at $25/month, outside CIC's $20/month hosting envelope by itself. Do not upgrade.
- The app uses standard Next.js commands and can deploy to a free host that supports them. Vercel-compatible does not mean a paid plan is authorized. Verify organization/team eligibility, collaboration and free-usage limits with the owner or organizer before selecting production hosting: [Vercel Hobby docs](https://vercel.com/docs/plans/hobby).
- Ask organizers whether the team card includes OHack AI gateway access and whether hosting/database support is available. Nothing in the resources guarantees free sponsorship. Use text debrief/templates before paying for transcription, AI, SMS or email.
- No ongoing polling, cron, vector store, storage bucket, SMS sender, paid model or live provider dependency is required for the skeleton.

## Optional free Supabase setup — integration work, not completed

1. Kaustubh creates/owns a free project, or accepts an organizer-provided project. Keep ownership transferable to CIC. Do not put credentials in chat or git.
2. Apply `supabase/migrations/202611140001_foundation.sql` to a **new** project through Supabase SQL tooling or the CLI. It assumes Supabase `auth.users`, `auth.uid()`, and `anon`/`authenticated` roles. Review before applying to any existing database. There is deliberately no destructive reset command.
3. Configure auth URLs/providers and create named accounts. Provision `public.members` using trusted admin SQL, referencing each auth user UUID. The application cannot self-promote membership. Board members must be active to see owned records. Establish an initial admin explicitly; never use a shared password.
4. Put the URL and publishable key in `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). The publishable key is designed for client use with RLS; service-role/secret keys are not.
5. Implement and verify cookie refresh, auth callback/sign-out, authenticated route/action guards and live repositories. The supplied client factories are setup helpers, not a completed authentication implementation. Generate DB types once the migration is deployed.
6. Test admin, board A, board B, disabled member and nonmember against direct table/API access. Test draft transitions, source replay and concurrent ownership assignment. Set `APP_DATA_MODE=live` only when the protected implementation is ready. In the foundation, live mode intentionally shows a setup state and loads no donor records.

## Deployment after integration

From this same GitHub repo, import into the owner-approved free host using Node 22, `npm ci`, `npm run build`, and `npm start` where requested. Default deployment is a **public fictional demo**, not a live donor portal. Only a complete protected live implementation should use real donor data. Set secrets through the hosting dashboard, never in code. Authenticated responses and APIs must be private/no-store.

Before calling it done: correct live URL, fresh sign-in on another device, owner isolation, import rollback/replay, all P0 workflows, phone/keyboard checks, Lighthouse accessibility ≥95, explicit restore/export plan, and CIC sign-off. Document quota limits and the free-project pause/resume procedure with the account owner. The foundation does not meet these live-product gates yet.

## Submission and handoff

Keep all code in this repo. Kaustubh pushes the base before teammates clone. Follow `docs/team/README.md` for branches, file ownership and role prompts. Never push another teammate's branch or force-push shared history.

At [Team Dashboard](https://www.ohack.dev/hack/fall-2026/manageteam), submit project story and ≤4-minute demo video by **Sunday November 15, 2026, 2 PM MST**, with code checked in. Record starting at noon per repository guidance. DevPost is optional. Current live/demo links must be filled in the README once they exist.
