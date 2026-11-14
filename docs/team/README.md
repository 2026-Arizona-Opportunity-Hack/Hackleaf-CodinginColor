# Three-person delivery plan

All code stays in **2026-Arizona-Opportunity-Hack/Hackleaf-CodinginColor**. Wait until Kaustubh pushes and lands this foundation on `main` before teammates clone; otherwise they will only see the organizer's initial README. If reviewing the foundation branch first, explicitly check it out before running the app.

## Start

```bash
git clone https://github.com/2026-Arizona-Opportunity-Hack/Hackleaf-CodinginColor.git
cd Hackleaf-CodinginColor
nvm install 22
nvm use 22
npm ci
cp .env.example .env.local
npm run dev
```

Use the repository's Node 22 version; Node 16 will not work. No account, database or API key is required for the fictional demo.

Give your coding assistant exactly one of these instructions:

- Kaustubh: `Read AGENTS.md, CLAUDE.md and docs/team/kaustubh.md in full. Follow my workstream and its ownership rules. Start by inspecting the current code and docs; do not overwrite teammates' work.`
- Vishnu: `Read AGENTS.md, CLAUDE.md and docs/team/vishnu.md in full. Follow my workstream and its ownership rules. Start by inspecting the current code and docs; do not overwrite teammates' work.`
- Aditya: `Read AGENTS.md, CLAUDE.md and docs/team/aditya.md in full. Follow my workstream and its ownership rules. Start by inspecting the current code and docs; do not overwrite teammates' work.`

## File ownership

| Owner | Exclusive implementation paths |
| --- | --- |
| Kaustubh D | Root configs/dependencies/lockfile/README, CI, `src/components/**`, `src/lib/**`, root `src/app/{layout,page,globals.css,error,loading,not-found}`, `src/app/auth/**`, `src/app/api/v1/**`, `src/app/api/health/**`, `supabase/**`, `docs/architecture.md`, `docs/requirements.md`, `docs/api.md`, `docs/deployment.md` |
| Vishnu Dwivedi | `src/features/{donors,imports,retention}/**`, `src/app/{donors,imports,retention}/**`, `src/app/api/{donors,imports,retention}/**`, `public/samples/**`, `docs/handoffs/vishnu.md` |
| Aditya Prakash Sahu | `src/features/{follow-ups,reports}/**`, `src/app/{follow-ups,reports}/**`, `src/app/api/{follow-ups,outreach,reports}/**`, `docs/handoffs/aditya.md` |

New tests go beside the feature they test, in that owner's paths. Kaustubh owns shared/domain/database tests. No other teammate edits shared types, migrations, package files, the global stylesheet or app shell: propose the exact needed change in your own handoff note and ask Kaustubh to land it first. Feature-specific styles can use Tailwind or a feature-local CSS module. Keep small helpers inside your feature, rather than adding shared barrels.

This minimizes source conflicts; it does not remove integration dependencies. Do not resolve a contract disagreement by inventing a second donor schema, auth system or database.

## Delivery order

1. **Foundation:** Kaustubh pushes this reviewed base. Teammates branch from that commit, run the checks, and write the first task in their handoff note.
2. **Contract freeze:** Confirm shared domain fields and migration needs before building writes. Start a free Supabase project only when Kaustubh can own it; ask organizers about existing sponsored resources. No purchase or paid API use is authorized.
3. **Parallel first slices:** Vishnu builds import preview/normalization plus donor views. Aditya builds draft/task UI and evidence-aware packet rendering with fictional inputs. Kaustubh builds sign-in, session refresh, trusted membership, repositories and transactional assignment/import primitives.
4. **Integration checkpoint:** Merge database/auth contracts first. Then donor persistence/import, then task/outreach persistence and packets, then aggregate API. Do not let demo fallback conceal a broken live integration.
5. **P0 completion:** Reimport the same file safely; prove board isolation with two accounts; demonstrate dated next steps, quarterly draft coverage, retention and sourced packet export. At least one P1 only after the P0 flows work.
6. **Freeze and submission:** Sunday 11 AM mentor feedback, noon start recording, by 2 PM MST code + story + ≤4-minute video submitted on Team Dashboard. Test from a fresh browser/session and a phone before recording.

## Branch and review rules

- Branches: `feat/kaustubh-auth-api`, `feat/vishnu-donors-imports`, `feat/aditya-outreach-packets`. Use additional focused branches for later slices.
- Sync `main` before each slice; never force-push a shared branch. Do not push directly to another person's branch.
- Follow `AGENTS.md`: propose a split for >400-line changes, keep PRs focused. Generated lockfiles are reviewed separately from authored changes.
- Run `npm run check` and `npm run build`; add useful edge-case tests. In your handoff, record commands, actual results, unfinished acceptance criteria and dependencies.
- Work/decisions should become GitHub Issues and link to PRs. Creating external issues/comments requires the user's authorization; until then the handoff notes provide ready-to-copy task descriptions.
- Kaustubh integrates shared-file requests and keeps the README/requirements status current. Other agents report their updates in their own handoff files.

## First nonprofit questions

Kaustubh coordinates one shared list so CIC does not receive duplicate questions: sample export column headers, roster/roles, fiscal-year/YTD definitions, communication consent/provider, actual calendar access, outcome/reporting API and approved logo. Nobody pastes real donor rows, keys or student information into an assistant conversation.
