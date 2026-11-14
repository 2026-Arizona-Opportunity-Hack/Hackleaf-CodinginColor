# Foundation architecture

## Decisions

- Next.js App Router + TypeScript: one application, React Server Components by default, route handlers for server integrations. User preference and general SRD align; no separate FastAPI service is needed for the foundation.
- Tailwind CSS and small owned UI primitives: CIC design tokens, accessible semantic HTML, no external font dependency. shadcn components can be added deliberately when a feature needs them; the suggested library is not a requirement.
- Supabase/Postgres and cookie-based auth: optional client factories and a migration contract. No service-role key in the browser. Live behavior must go through authenticated queries and RLS.
- npm with a committed lockfile and Node 22: one install command across teammates and CI.
- Zod at external boundaries; integer minor currency units; explicit currency; ISO dates and `America/Phoenix` for operational dates.
- Provider adapters stay server-side. AI and message delivery are deliberately not wired in this skeleton.

## Source boundaries

```text
src/app/                  route composition, layouts, error/loading states
src/components/           shared app shell and presentation primitives
src/features/donors/      donor list and profile ownership boundary
src/features/imports/     source adapters and import preview boundary
src/features/follow-ups/  tasks, quarterly coverage, draft review boundary
src/features/retention/   comparison view boundary
src/features/reports/     funder packets and outcome evidence boundary
src/lib/domain/           pure types, validation, tested business rules
src/lib/demo/             explicitly fictional fixtures; never live data
src/lib/supabase/         request-scoped database client factories
src/app/api/v1/           versioned integration boundary
supabase/migrations/      schema and access policies
docs/                     requirements, decisions, handoff
```

## Demo and live isolation

`APP_DATA_MODE=demo` renders only synthetic checked-in fixtures. The default is demo so a teammate can run the shell with no accounts. There is no production-data fallback to fixtures: `APP_DATA_MODE=live` closes the demo workspace with an explicit setup state until the live repository/auth integration is implemented. The UI always identifies fictional records. No cookie, URL parameter or client toggle can enable a live write.

Each fixture route checks mode before rendering, in addition to the root layout. A hidden child under a layout can still serialize into a React Server Component response; hiding it in layout alone is insufficient. Replace those guards only when authenticated live feature repositories are implemented. Fixture code/assets remain public synthetic examples, never secrets.

The foundation does not claim sign-in, CRUD, imports, message delivery, scheduled reminders, AI or funder exports are done. Feature routes give teammates a shared layout and clear entry points. Avoid adding fake “success” interactions to incomplete features.

## Database/security contract

Single CIC organization for this hackathon; no premature multi-tenant SaaS. Membership is provisioned by a trusted administrator, never by user-editable metadata or self-signup. Baseline roles: admin and board member; additional roles need a confirmed permission matrix.

RLS restricts board members to donors they own and related rows. Only admins manage owners, imports and verified outcomes. No anonymous access. Membership rows cannot be modified by authenticated clients. Outcomes are aggregate evidence with source URL, period and verification metadata. API responses must be aggregate-only.

Drafts carry state separately from communications. Delivery requires recipient/body review, authorization, idempotency, provider receipt and explicit actor/time. Approval must be invalidated on edit. A completed task or opened mail composer is not delivery proof. Store minimal audit metadata, not raw imported donor rows, transcripts or message bodies in logs.

All schema changes are forward migrations. Database generated TypeScript types should replace hand-maintained persistence types after the project is provisioned. Domain types remain independent of provider naming.

## Import and reporting invariants

Never merge people by name alone. Exact normalized email is a candidate, not proof for shared household/corporate addresses; ambiguous matches need review. Never strip `+tags` or Gmail dots across arbitrary providers. Preserve source IDs and gift provenance; unique source transaction keys prevent replay duplicates. Amounts parse into integer cents, not floating-point accumulation. Money with different currencies cannot be summed.

Production least-loaded assignment must be atomic: lock eligible board rows, count current ownership, choose minimum load, rotate ties, and insert/assign in the same transaction. The pure helper is a deterministic planner, not a concurrency guarantee.

Retention compares equivalent periods, distinguishes unchanged and neither-year giving, and must not label inactive historical records as new. Funded program totals describe attribution, not proven causal effect. Reports must expose missing/unsourced outcomes.

## Cost and deployment

Keep this a standard Node Next.js build so hosting can move. Vercel compatibility is provided; a paid account is not selected or purchased. Supabase free limits, Vercel usage/plan eligibility, mail/SMS and AI charges must be checked with the account owner before CIC production. The general SRD's $25–46/month paid examples exceed the CIC-specific $20 hosting envelope. Do not promise that upgrading both services fits.

Official references checked November 14, 2026: [Next.js installation](https://nextjs.org/docs/app/getting-started/installation), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs), [Vercel plans](https://vercel.com/docs/plans/hobby). Use the committed package lock as the installed-version authority.
