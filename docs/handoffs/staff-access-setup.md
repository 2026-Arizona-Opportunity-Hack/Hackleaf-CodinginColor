# Activate a staff account for the live UI

The UI is connected to the configured Supabase project and its Auth service. The
project key does not identify a staff user. This setup must be performed by the
Supabase project owner or another trusted administrator in that existing project.
No passwords, service-role keys or private credentials belong in git or chat.

1. The intended staff user opens `/auth/register`, enters their full name, email
   and password, and confirms their email if required. This creates only an Auth
   login; it does not grant staff access. In Supabase Authentication → URL
   Configuration, the project owner must allow the app callback URL (locally
   `http://127.0.0.1:3102/auth/callback`; use the deployed origin in production).
   Then the owner opens Authentication → Users and copies that confirmed user's
   UUID. Alternatively, the owner can create/invite the Auth user directly.
2. In the project SQL editor, provision the matching application membership using
   the example below. Replace the UUID and display name. `board_member` is the
   baseline role; select `admin` only if this person is the approved CIC app
   administrator. The statement deliberately does not promote existing members.

```sql
insert into public.members (id, display_name, role, active)
values (
  'REPLACE_WITH_AUTH_USER_UUID'::uuid,
  'Replace with approved staff display name',
  'board_member',
  true
)
on conflict (id) do nothing
returning id, display_name, role, active;
```

3. The user signs in at `/auth/sign-in` with their own Auth email/password, then
   lands on `/dashboard`. A signed-in account awaiting membership sees a welcome
   page explaining approval rather than another sign-in prompt. Once approved,
   open `/donors`. A board member sees only donor records assigned to their UUID;
   an empty authorized list may be correct until donors are assigned. An admin
   sees records permitted by the project's admin policies. Provisioning a user
   does not require disabling RLS or exposing a service-role key to the browser.

If `members` is missing, stop and have the schema owner reconcile/apply the
repository's existing migrations to the intended project. Do not create a second
project or second incompatible donor schema as a workaround. If the account
already exists but is inactive or has a different role, the owner must explicitly
review it; this example intentionally leaves it unchanged.

## Still separate from staff access

Live donor self-registration needs a trusted Auth-user ↔ donor-profile binding
and scoped policies. Live request goals, priorities and allocation storage are supplied by
`202611140003_request_funding.sql`; the owner must apply that migration following
[request funding setup](request-funding-setup.md). A staff membership alone does
not apply database migrations. Do not turn demo donation
confirmation into a paid gift; received gifts need approved receipt ingestion.

## Diagnose the signed-in account

The dashboard shows the caller's own verified Auth UUID and whether donor-access
membership is missing, inactive or has an unsupported role. Donation-request
management is available to signed-in accounts without approval after migration 004. It retains Donors and
Donation requests links and displays access-pending metrics instead of hiding
those features. A signed-in user does not need to register or sign in again.

The project owner can inspect that UUID in the SQL editor:

```sql
select u.id, m.display_name, m.role, m.active
from auth.users u
left join public.members m on m.id = u.id
where u.id = 'REPLACE_WITH_DASHBOARD_AUTH_USER_UUID'::uuid;
```

If the owner approves this person for organization-wide donor access, they must
provision the exact UUID with `role = 'admin'` and `active = true`. A board-member
membership only exposes assigned donors, so it cannot fulfill an administrator's
request to see all donors. Existing inactive accounts or role changes require
explicit owner review; registration and frontend controls never grant that role.
The browser dashboard's status will update on focus/periodic verification after
the database membership is corrected. Applying the request-funding migration is
still a separate prerequisite for live request totals.
