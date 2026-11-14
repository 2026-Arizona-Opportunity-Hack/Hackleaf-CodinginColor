# Prompt — Vishnu Dwivedi: donor data, imports and retention

You are assisting Vishnu Dwivedi on Hackleaf, CIC Problem 2. Read `AGENTS.md`, `CLAUDE.md`, `docs/requirements.md`, `docs/architecture.md`, `docs/api.md`, `docs/team/README.md`, and shared `src/lib/domain/{types,rules,validation}.ts` completely. Inspect the current feature code and tests before editing. This is a three-person team sharing one repo, not three independent prototypes.

## Ownership

Only edit `src/features/donors/**`, `src/features/imports/**`, `src/features/retention/**`, their matching `src/app` routes, `src/app/api/{donors,imports,retention}/**`, `public/samples/**`, and `docs/handoffs/vishnu.md`. Put tests and feature-local CSS in these paths. Do not edit package files, shared types, global CSS, shared components, Supabase migrations or another teammate's feature. Request exact shared changes from Kaustubh in your handoff note. Do not add a second auth/database system.

Create branch `feat/vishnu-donors-imports` after Kaustubh pushes the foundation. Run the app and checks before changes. Split work into small PRs; propose the split before >400 authored lines. No new repo, no paid services, no real donor data in source or prompts. Do not push/publish without the user's instruction.

## Build order

1. **Import preview first:** accept local CSV, choose source (spreadsheet/Zeffy/Benevity), map headers to normalized `importedGift` fields and show row errors before committing. Ask for real header names; provided fixtures are deliberately normalized examples, not actual vendor exports. Never silently guess an amount's units, currency, date format or donor identity.
2. **Dedupe and provenance:** normalize email conservatively; do not merge by name or strip arbitrary plus tags/dots. Show ambiguous/shared-email matches for human decision. Distinguish repeated donor from repeated gift. Source transaction ID is the replay key; if the original export lacks one, propose a stable reviewed fingerprint contract to Kaustubh. Preserve separate gifts from one donor across all channels. Refunded/anonymous/matching gifts need an explicit supported/rejected path. Reject unsupported currency instead of summing it into USD.
3. **Commit boundary:** call Kaustubh's authenticated transactional import/owner-assignment primitive. Do not implement a client loop of independent inserts or a competing SQL migration. Until it exists, keep a clearly labeled preview; do not fake “import complete.” Test same-file replay and overlapping sources.
4. **Donor workflows:** persist create/list/search/profile through the agreed repository, retaining responsive accessible table/filter behavior. Donor timeline combines actual gifts and manually logged/provider-confirmed communications, sorted newest first. Integrate Aditya's task/history data through shared contracts, not imports of their private UI internals. Board members see only their own donors; admins see all. UI filters are not authorization.
5. **Retention:** compare equivalent reporting windows; show new/increased/decreased/unchanged/lapsed and never-given/inactive distinctly. Confirm fiscal year and refund policy; avoid showing a partial current year against a full prior year without warning. Add filters and a route to the donor's next step; Aditya owns drafting and outreach.

## Tests and completion

Test quoted CSV/newlines, BOM, invalid dates, decimal-to-cents boundaries, missing stable IDs, duplicate-file replay, shared emails, repeated gifts, empty imports and owner eligibility. Escape spreadsheet formula cells on any CSV export. Validate in server handlers too; no trust in client-supplied role/owner fields. Limits should prevent oversized imports.

Verify search, owner filter, empty state, donor deep link, import error preview, duplicate review and retention cases in the browser on desktop and mobile. Run `npm run check` and `npm run build`. Write exact changed paths, tests, remaining work and contract requests in `docs/handoffs/vishnu.md`. Remove foundation notices only when that feature actually works.

Your definition of success: spreadsheet + Zeffy + Benevity can become one traceable donor view with balanced ownership and accurate retention, without duplicates, data loss or privacy leaks. Do not spend the weekend restyling the shared shell.
