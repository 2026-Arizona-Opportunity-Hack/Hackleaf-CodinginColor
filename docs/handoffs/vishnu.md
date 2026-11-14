# Vishnu — integration handoff

Branch: `feat/vishnu-donors-imports`

## Slice 1 — Import preview (this PR)

### Changed paths

- `src/features/imports/csv-parser.ts` — pure CSV parser (BOM, quoted fields, embedded newlines, CRLF, 1 000-row limit)
- `src/features/imports/csv-parser.test.ts` — 14 tests covering BOM, quoted commas/newlines, escaped quotes, CRLF, truncation, empty input, empty headers, trailing newlines
- `src/features/imports/source-adapter.ts` — maps normalized CSV columns to `importedGift` Zod schema; validates per row via `safeParse`; `validateHeaders` checks required columns
- `src/features/imports/import-workspace.tsx` — interactive client component: source selector, CSV file upload (1 MB limit), per-row error display, shared-email duplicate detection, preview table, disabled commit button
- `src/app/api/imports/preview/route.ts` — POST stub returning `503 import_not_connected` until Kaustubh's transactional primitive exists
- `docs/handoffs/vishnu.md` — this file

### Commands and results

```
npm test -- --run            # all tests pass (csv-parser.test.ts + existing domain tests)
npm run typecheck            # no errors
npm run lint                 # 0 warnings
```

### Acceptance criteria status

| ID | Status | Notes |
| --- | --- | --- |
| D1 — CSV preview and validation | ✅ preview done | Commit blocked on Kaustubh's transactional import primitive |
| D1 — Deduplication | ✅ shared-email detection in preview | Auto-merge by name still rejected; ambiguous shared-email matches shown for human review |
| D1 — Replay safety | ⬜ pending commit primitive | `sourceRecordId` is the replay key; preview parses and exposes it |
| D2 — Donor timeline | ⬜ foundation placeholder (demo data only) | Needs live repository integration |
| D3 — Board owner assignment | ⬜ pending commit primitive | `chooseOwner` pure function exists in `rules.ts`; must run in a DB transaction |
| D5 — Retention view | ✅ demo data wired | Live period filtering and fiscal-year confirmation still needed |

### Contract requests for Kaustubh

1. **Transactional import primitive** — an authenticated server action or API handler that accepts `ImportedGift[]` plus owner-assignment intent, locks eligible board member rows, assigns ownership (using `chooseOwner` as the planner), and inserts gifts in one transaction. Should return `{ committed: number; skipped: number }` keyed on `sourceRecordId` for replay safety.
2. **Shared types confirmation** — confirm whether `z.iso.date()` in Zod v4 accepts `YYYY-MM-DD` strings from the sample CSVs (it does in the samples; just confirming edge cases).

### Remaining P0 work (Vishnu)

- Wire commit button once import primitive ships
- Server-side validation in the POST `/api/imports/preview` route
- Same-file replay test (import same CSV twice → no duplicate gifts)
- Live donor list/search/profile through authenticated repository (D2)
- Live retention with configurable period start/end and fiscal-year confirmation (D5)

### Not yet addressed

- Real Zeffy and Benevity export column headers (CIC has not provided sample exports; adapter has stubs with a clear warning)
- Refunded / anonymous / matching gift paths (need CIC confirmation of handling rules)
- Oversized import splitting guidance (1 MB limit is in place; UX for splitting is not)
