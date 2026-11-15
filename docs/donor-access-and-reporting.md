# Donor access and reporting changes

## Roles

| Capability | Admin | Staff / Board member |
| --- | --- | --- |
| View donor details, gifts and communications | Every donor | Assigned donors only |
| Create donor | Yes | Yes, assigned to the creator |
| Change another donor's ownership/details | Admin permissions | Not permitted |
| Funding charts | All visible donors, with filtering | Assigned donors only |
| Manage staff accounts | Admin-only page | Hidden and denied on the server |
| Configure local client fields, import/export clients and inspect audit | Yes | Admin-only controls and server actions |

The live database role `board_member` represents Staff / Board member. Live
repositories scope donor queries to the authenticated owner, assistant reads and
actions honor the signed-in role, and PostgreSQL RLS enforces the same rule for
direct queries once the migration below is applied.

## Apply the permission migration

The Supabase project owner must apply
`supabase/migrations/202611150003_exclusive_donor_relationships.sql` after the
existing foundation and `202611150002_donors_member_read.sql` migrations.

This removes broad active-member donor reads and restores owned SELECT access.
The existing active-admin policy retains organization-wide access. Related gifts,
sources, communications, tasks and drafts follow donor RLS scope. Staff can insert
a donor only with themselves as owner. No rows, owners, staff roles or historical
gifts change. This session has not applied the migration to the hosted project;
management access is unavailable. Until applied, the old broad-read policy remains
in that database.

The fictional demo simulates Admin access to all 12 fixtures and the documented
Staff account's four Morgan Chen relationships. Other newly registered demo staff
begin without fixture assignments. Fixtures are public synthetic source data,
not a substitute for real database privacy.

## Chart selection

Directory and donor profiles include **Pick your own chart** with Line, Pie, Bar
and Doughnut options. Exact tables remain available. Directory search/owner
filters also filter charts. Figures describe recorded gift designations by
program, not verified expenditure/impact. The line view compares categories,
not dates.

## PDF and dates

Funder templates now download a real `application/pdf` `.pdf` attachment from
the authenticated `/api/client-funder-report` route. Server generation uses
pdf-lib/fontkit and a bundled SIL Open Font License Noto Sans font, without
external requests or browser binaries. Text wraps and paginates. Aggregate
reports exclude private client identities and notes. Font license:
`src/features/reports/assets/OFL.txt`.

Service-report controls/headings use month/year. Months resolve to inclusive
calendar boundaries; the current month ends today. Daily chart/table details
retain exact dates. Existing print-to-PDF and CSV exports keep their purposes.

## Verification

Node 22: `npm run check`, `npm run build`, then
`node src/features/donors/requirements.browser.mjs`.

Database tests upgrade the prior broad-read policy, checking two board identities,
foreign direct IDs/history, inactive membership, admin visibility, staff ownership
on creation and blocked privilege escalation. Repository tests independently check
server-side scoping. Browser tests check Admin/Staff differences, all chart views,
foreign profiles, mobile layout, month/year filters, PDF bytes/download and page
errors. PDF tests cover pagination and accents; the downloaded PDF is rendered
for layout inspection. Hosted permission verification requires owner migration
application and separate live accounts.
