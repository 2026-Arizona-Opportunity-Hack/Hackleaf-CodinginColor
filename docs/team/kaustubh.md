# Prompt — Kaustubh D: integration, auth and shared platform

You are assisting Kaustubh D on Hackleaf, CIC Problem 2. Read `AGENTS.md`, `CLAUDE.md`, `docs/requirements.md`, `docs/architecture.md`, `docs/api.md`, `docs/deployment.md`, and `docs/team/README.md` completely before coding. Inspect current code and git state. The user wants the strongest sustainable nonprofit product, free services only unless sponsored infrastructure is confirmed. Do not promise a win or pretend skeleton work is finished functionality.

## Scope and boundaries

Own shared infrastructure, dependencies/lockfile, domain contracts, Supabase schema and policies, auth/session flow, server authorization, root app shell/overview, CI, deployment and versioned read API. Exact ownership is in `docs/team/README.md`. Do not modify Vishnu's or Aditya's feature files while they are working; use their handoff requests to coordinate integration.

Use branch `feat/kaustubh-auth-api`, based on the pushed foundation. No new repo, paid services, sending messages, publishing or purchasing without user authorization. Keep generated AGENTS/CLAUDE guidance intact.

## Deliver in focused slices

1. Read the database tests and migration. Obtain a free Supabase project or organizer-provided instance; never request a secret in chat. Configure local untracked env variables. Implement email auth and optional Google only if configured, cookie/session refresh, server-side `getUser`/verified claims, signed-out redirects, trusted membership provisioning and an explicit role matrix. A new auth user must not auto-become admin.
2. Implement a live repository boundary shared by the two workstreams. Keep the synthetic demo explicitly separate. Decide the smallest documented interface before teammates connect mutations. Switch `APP_DATA_MODE=live` only when the whole protected subtree and all APIs have authenticated reads and RLS.
3. Own all migration/RPC changes. Implement transactional least-loaded owner assignment with rotating ties; lock eligible members to avoid two simultaneous imports assigning incorrectly. Verify source transaction uniqueness, rollback on invalid rows and retry/replay behavior. Vishnu supplies adapter/preview decisions; do not build their UI.
4. Provide authenticated server primitives for donor access, tasks and draft state transitions requested by Aditya. Invalidate approval when recipient/channel/subject/body changes. Sending requires explicit human review, approved provider configuration, idempotency and delivery receipt. If no provider exists, honestly ship human-reviewed drafts plus manually logged external outreach; never label that automatic delivery.
5. Implement `/api/v1/reporting` using actual aggregate queries and the proposed `ReportingSnapshot` type. Validate reporting period, comparable windows, program and owner filters; return no donor PII. Use a server-only revocable key, no caching, rate limiting, and safe errors. Do not use a browser service-role key or expose public donor JSON.
6. Coordinate the aggregate outcomes contract with Problem 1 and CIC. No assumed external API. Aditya owns packet rendering and evidence adapter inside their feature; you own shared security and dashboard integration. Record missing evidence honestly.
7. Deploy only to an owner-approved free/organizer host. Document budget limits, restore/export procedure and account ownership. Run two-board-user isolation checks against real Supabase before calling auth/RLS verified. Record the live link only when it exists.

## Acceptance gates

- An unauthenticated API or UI request cannot see real donor data.
- Board A cannot read/write Board B's donors or related records, including by direct API/table calls and guessed UUIDs.
- Disabled/nonmember accounts have no donor access; client metadata cannot elevate a role.
- Duplicate source transaction IDs cannot create duplicate gifts; concurrent imports assign safely.
- Changed drafts require approval again; sent content is immutable; keys and PII never enter logs.
- Key-authenticated reporting returns real aggregates, with missing/bad key denied. Missing integrations return an explicit unavailable state, not fixtures.
- `npm run check`, `npm run build`, and focused live authorization tests pass. Keep README and P0 status truthful.

Coordinate before shared changes. Prioritize all P0s over AI. Ask organizers about the OHack gateway before any model API usage. Microphone permissions are disabled by default in `next.config.ts`; enable only for a deliberately implemented consent-based audio feature.
