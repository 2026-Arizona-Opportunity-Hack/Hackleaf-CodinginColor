# Prompt — Aditya Prakash Sahu: follow-through, outreach and funder packets

You are assisting Aditya Prakash Sahu on Hackleaf, CIC Problem 2. Read `AGENTS.md`, `CLAUDE.md`, `docs/requirements.md`, `docs/architecture.md`, `docs/api.md`, `docs/team/README.md`, and `src/lib/domain/{types,rules,validation}.ts` fully before coding. Inspect current source and git status. Build on this foundation rather than creating another app.

## Ownership

Only edit `src/features/follow-ups/**`, `src/features/reports/**`, matching `src/app/{follow-ups,reports}/**`, `src/app/api/{follow-ups,outreach,reports}/**`, and `docs/handoffs/aditya.md`. Feature tests/styles belong there. Shared components, global CSS, domain types, dependencies/lockfile, migrations and `/api/v1/**` belong to Kaustubh; donor/import/retention paths belong to Vishnu. Request exact shared changes in your handoff note before depending on them.

Create branch `feat/aditya-outreach-packets` from the pushed foundation. One repo, free resources only, no external messages or paid APIs without user authorization. No automatic sending. Propose a split before >400 authored lines; keep PRs focused.

## Build order

1. **Next steps:** create/edit/complete a dated next step tied to donor and owner, sorted by Phoenix operational date. Show overdue/today/upcoming/empty states. Use Kaustubh's authenticated repository; keep fictional demo input separate. Changing UI state alone is not persistence.
2. **Quarterly coverage:** identify donors needing a touch this quarter; generate an editable update/thank-you draft per donor. Drafted, approved, manually logged, failed and provider-confirmed sent are distinct. Do not count gift receipt as outreach or a draft as a completed quarterly touch. Ask CIC what counts as a touch, and honor opt-outs and missing contact details.
3. **Human review and history:** provide recipient/channel/body review and explicit approval. Every edit invalidates approval. Use Kaustubh's authorized transition primitive and provider integration if supplied. With no approved provider, offer reviewed copy/download for the human and a separately confirmed “log external outreach” flow, truthfully labeled. Do not claim a mailto link or clipboard copy sent anything. Do not send real emails or texts while developing.
4. **Funder packet P0:** assemble selected funder's actual gifts, designated programs and verified aggregate outcome evidence, with reporting window, provenance, attribution and missing-data statements. Start with print/export-to-PDF through the browser if it saves dependency/setup cost; request a dependency only if necessary. No fabricated learning gains, dollars-per-student ratios or causal claims. Keep donor PII access scoped to authorized owner/admin.
5. **Outcome adapter:** implement an adapter in your reports feature for the proposed `OutcomeEvidence[]` contract. Kaustubh coordinates the real external API; no real endpoint or credentials have been provided. Missing outcomes must remain visible. Do not build the curriculum platform.
6. **P1 only after P0:** text debrief → structured contact/dated next-step/editable follow-up. A deterministic assisted template is acceptable if clearly described; don't call it AI. If organizer AI allowance exists, request a server provider contract from Kaustubh. Human confirms ambiguous dates and all generated output. Events-aware suggestions require real calendar event IDs and dates. Audio and Google Meet integration are optional later slices.

## Tests and completion

Test date rollover, overdue ordering, quarter boundaries, opt-outs, missing address, double approval/send attempts, edit-after-approval, failed delivery and missing evidence. Prove a board member cannot read another owner's packet or task by changing a URL. Your server handlers must verify authorization; a disabled button is insufficient.

Browser-check task creation/completion, draft edit/review, history labels, missing-outcome state and packet print layout, including keyboard and mobile. Run `npm run check` and `npm run build`. Record exact changed paths, actual tests, unfinished acceptance criteria and contract requests in `docs/handoffs/aditya.md`. Remove foundation notices only when implemented.

Your definition of success: a donor conversation survives the next emergency, every donor gets a human-reviewed quarterly touch, and a renewal packet cites evidence CIC can trust. Deliver that before adding AI flourishes.
