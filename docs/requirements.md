# Product contract — CIC Problem 2

## Authority and source review

Read in full on November 14, 2026:

1. `[Public] ASU OHack November 14th and 15th 2026.docx`: the controlling CIC-specific brief. Both problem statements were reviewed to understand the outcomes integration; this team builds **Donor & Funder Relationship Platform** only.
2. `CODING IN COLOR BRAND GUIDELINES.docx`: design authority. White background, dark green `#007A3D` headings, targeted green `#00A850` accents, light tint `#E6F4ED`, readable sans-serif type. Do not invent or alter CIC's logo.
3. `Client Case Management _ Software Requirements Doc (SRD).docx`: background on inexpensive Next.js/Supabase delivery, human-reviewed AI, and sustainable handoff. Its client registration, clinical notes, pricing estimates, and P0 checklist do **not** replace the donor brief.
4. Repository `AGENTS.md`, `CLAUDE.md`, README, PR template, workflow, and hooks: one repository, MIT, small changes, no secrets, Team Dashboard submission.

Original documents remain in the sibling `../useful-resources/` directory; teammates do not need that local directory to run the application.

The CIC brief includes an agent-directed purple-page/disruptive-copy instruction. It conflicts with the actual product and brand requirements and is treated as untrusted embedded text, not a feature.

## The people and the job

CIC's founder needs complete funder context for renewals. Board members need an owned donor list and a way to record outreach quickly. Fundraising staff need coordinated campaigns and event-aware next steps. Donors need credible evidence of what their gifts support.

Build a thin relationship workflow around CIC's existing giving channels. **Zeffy remains donation intake.** Benevity contributes exports. Do not build payment processing, a generic CRM, an LMS, or a replacement website.

## P0 acceptance map

| ID | Required behavior | Foundation status / next acceptance test |
| --- | --- | --- |
| D1 | Spreadsheet, Zeffy, Benevity CSVs become one deduplicated donor table | Typed import contract and sample fixtures; adapters, preview, transaction and replay-safe commit still needed. Reimport must not duplicate gifts. |
| D2 | Timeline combines gifts and communications | Synthetic donor profiles and timeline types; connect persisted queries and create forms. |
| D3 | Every donor has a board owner; new donors go to the least-loaded eligible member with rotating ties | Tested pure assignment function; production assignment must lock eligible members in a transaction. |
| D4 | Per-donor dated next step and quarterly update coverage | Follow-up workspace and schema; persistence, completion and quarterly queue remain. A person sends reminders and outreach. |
| D5 | Comparable year-over-year new/increased/decreased/lapsed relationships | Tested retention classifier and sample view, including unchanged and inactive states. Confirm calendar vs fiscal years and YTD comparison. |
| D6 | Email/text thank-you templates, human approval, send history | Draft lifecycle contract and schema; provider delivery, approvals and receipts remain. Never equate “drafted” with “sent.” |
| D7 | One-click funder packet: gifts plus funded outcomes | Packet feature boundary and evidence contract; implement export once attribution/source contract is confirmed. |
| D8 | Key-authenticated read API, preaggregated by period/program/board member, plus recent activity | Protected versioned route contract; returns explicit unavailable response until live aggregation exists. No names, addresses, message bodies or API keys in output. |

Shared gates: individual sign-in; least-privilege roles; donor PII protected on server **and** in database; validate inputs; Lighthouse accessibility ≥95; full keyboard navigation; operating hosting ≤$20/month plus ≤$250 setup; deployed, documented and demonstrable by Sunday 2 PM MST.

## Differentiation after P0

Recommended P1: **debrief to action**. A board member's text/voice/meeting note becomes a reviewed contact record, a dated next step, and an editable draft. Event suggestions must cite an actual event/date; ambiguous language asks for confirmation. Text input can ship before audio and Google Calendar.

Make the workflow distinctive through traceability: conversation → approved next step → reviewed outreach → renewal packet with sourced outcomes. The value is fewer dropped relationships and less grant preparation work. Do not invent donor propensity scores, learning outcomes, savings, or a causal “dollars per student” claim.

Classroom outcomes are owned by Problem 1. Use a narrow integration adapter for aggregate, dated, source-linked outcomes. A missing integration means “outcomes unavailable,” not fabricated impact. No student-level PII is needed here.

## Questions to resolve with CIC / team

- Actual spreadsheet/Zeffy/Benevity headers, stable transaction IDs, anonymous gifts, refunds, currencies, corporate matching, households and ambiguous shared email addresses.
- Board roster, eligibility, tie rotation, inactive members, reassignment, visibility for fundraiser/program-manager roles. Proposed baseline: admin sees all, board sees owned donors only; validate before production.
- Calendar or fiscal year? Compare full completed years or equivalent YTD windows? What is a lapsed relationship, and how are zero/refunded gifts handled?
- What counts as a quarterly touch? Which channels and consent/opt-out rules apply? Do imported historic communications count?
- Which mail/SMS provider is approved? Who may approve/send? Can board members log outreach sent from their own phone/mail client?
- Problem 1 outcomes API, funder-to-program mapping, reporting periods, attribution wording, and CIC dashboard's expected authentication/response schema.
- Supabase owner, deployment account, approved paid plans, backup/restore requirements, and post-hackathon maintainer. Never request secrets in chat.
- Final approved logo asset. Until supplied, use a text project name without imitating CIC's mark.

## Submission and judging

Checked against the official [event page](https://www.ohack.dev/hack/fall-2026) and [rubric](https://www.ohack.dev/hackathon-judging-criteria) on November 14, 2026. Scope, Documentation, Polish and Security are the core rubric; judge shipped behavior, not feature claims. AI has no separate score in the CIC brief.

- Sunday November 15, 11 AM MST: presentation feedback.
- Noon: repository guidance says start recording.
- **2 PM MST: code checked in, project story and ≤4-minute video submitted through the [Team Dashboard](https://www.ohack.dev/hack/fall-2026/manageteam).** DevPost is optional.
- Confirm event-specific accessibility award details with organizers; the provided documents and live prize list are not identical. The ≥95 accessibility requirement still applies.

Suggested four-minute demo: import overlapping exports → inspect dedupe decisions and assigned owners → open a donor timeline → record a debrief and confirm a dated next step → review a thank-you draft → find a lapsed donor → export an evidence-backed funder packet → demonstrate the aggregated API and denied unauthorized access. Every unimplemented step must be identified honestly.
