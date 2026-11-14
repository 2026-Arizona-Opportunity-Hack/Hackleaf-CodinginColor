# Proposed integration contracts, version 1

These are team-owned proposals. CIC and the Problem 1 team have not supplied a dashboard/outcomes contract. Coordinate before treating these as external agreements.

## Current endpoints

| Endpoint | Current behavior |
| --- | --- |
| `GET /api/health` | Public minimal liveness response; no infrastructure details, credentials or donor records. |
| `GET /api/v1/reporting` | Missing, weak or incorrect bearer key → `401 {"error":"unauthorized"}`. Correct configured key → `503 {"error":"reporting_not_connected","schemaVersion":"1"}` until live aggregation ships. Always `Cache-Control: no-store`. |

The public demo workspace is synthetic. It is never the source of a live organizational reporting response. No public donor JSON endpoint exists in the foundation.

## Reporting target (Kaustubh)

Header: `Authorization: Bearer <server-side key>` over HTTPS. Keep the key in a secret store/environment and rotate it on compromise; it must be at least 32 characters of securely generated randomness. The foundation checks length, not entropy. Never place it in a URL, client bundle or screenshot.

Planned query: `start=2026-01-01&end=2026-11-14`, inclusive ISO dates in `America/Phoenix`; optional `programId` and `memberId`. Validate dates, ordering, maximum range and filter IDs. Return `400` for invalid input, `401` for bad key, `429` for rate limit, `503` for unavailable upstream/database. Query validation/rate limiting are still pending.

Successful shape is `ReportingSnapshot` in `src/lib/domain/types.ts`:

```json
{
  "schemaVersion": "1",
  "generatedAt": "2026-11-14T20:00:00Z",
  "period": { "start": "2026-01-01", "end": "2026-11-14", "timezone": "America/Phoenix" },
  "totals": { "giftCents": 0, "currency": "USD", "donors": 0, "communications": 0 },
  "byProgram": [],
  "byBoardMember": [],
  "recentActivity": []
}
```

The zeros illustrate structure, not real CIC totals. Count distinct donors, not gift rows. A donor may support multiple programs, so program distinct counts are not additive. Confirm whether board attribution means current owner or owner at gift time before freezing queries. Recent activity contains per-day counts only, no free text or identities. A valid zero-data response must be distinguishable from missing data.

## Outcome adapter target (Aditya, coordinated by Kaustubh)

Receive aggregate `OutcomeEvidence[]`: ID, program ID, period start/end, metric, value, unit, HTTPS source URL, verification timestamp and attribution note. No student names, schools linked to individuals, grades or assessment records are needed in the donor platform.

Fetch upstream only from a configured allowlisted URL, with timeouts, bounded size, schema validation and server-only credentials. A user-supplied arbitrary URL would create SSRF risk. Store last verified source/time; expose stale or unavailable status. Matching funder/program/period is explicit, not inferred by an LLM. Keep fixture evidence distinguishable from verified live evidence.

## Internal workstream handshake

- Shared domain and validation definitions: Kaustubh owns `src/lib/domain/`.
- Vishnu supplies normalized imported gift rows and reviewed donor-match decisions. Kaustubh supplies atomic import/assignment storage. No source headers are assumed until sample exports are supplied.
- Aditya supplies draft/task/packet UI and feature-local actions. Kaustubh supplies authentication and authorized persistence/transition primitives.
- Feature APIs follow the ownership table in `docs/team/README.md`; `/api/v1/reporting` belongs only to Kaustubh. Authentication must be applied per handler/action, not inferred from a protected page layout.
- Do not expose service-role access to clients. Database migrations/types are coordinated centrally. Changes to shared contracts land before dependent PRs.
