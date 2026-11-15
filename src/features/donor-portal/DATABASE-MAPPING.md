# Donor portal field review

Reviewed the user-supplied donor-design screenshots and the current foundation
migration/domain on November 14, 2026. The screenshots describe a larger proposed
schema; the committed migration is not that schema. These pages are an explicitly
labeled demo UI. No second production donor database, password system, payment
processor or public donor-data API was created.

## Donor fields from the screenshots

| Field | Donor-side treatment |
| --- | --- |
| `id` | Generated demo profile reference; not an authenticated account ID. |
| `type` | Individual / organization selector. The shared foundation's `kind` also has foundation/company, so a confirmed adapter is needed before writes. |
| `first_name`, `last_name` | Required for individuals; optional organization contact person. |
| `organization_name` | Required for organizations; optional for individuals. |
| `email` | Required demo entry identifier, normalized to lowercase and checked for duplicate fictional profiles. Email alone is not authentication. |
| `phone` | Optional contact field; no SMS integration or phone verification. |
| `address_line`, `city`, `state`, `postal_code` | Optional profile fields with bounded input; no inferred country or automatic address validation. |
| `is_anonymous` | Profile default for the per-contribution demo display choice. Donor sees their own profile; NGO contribution listing shows Anonymous when chosen. |
| `do_not_contact` | Exact none/email/text/all choices. Defaults to all blocked. No messages sent. |
| `owner_user_id` | Staff assignment, never donor-editable. |
| `email_undeliverable` | Delivery/provider-managed; not a donor checkbox. |
| `status`, `merged_into_id` | Staff lifecycle/merge controls; not registration fields. |
| `created_source`, `created_by_batch_id`, `revision` | System/import metadata; never accepted in profile input. |
| Normalized/generated name, email, phone, postal keys | Derived by the database/import layer, not separate donor inputs. |
| Audit timestamps / actor columns where applicable | Server-managed, not exposed as editable account privileges. |

## Gift fields from the screenshots

| Field | Donation/history treatment |
| --- | --- |
| `id`, `donor_id` | Demo receipt ID generated at review; donor ID derives from the selected demo profile, not a form or URL override. |
| `gift_date` | Read-only demo operational date; foundation equivalent is `received_on`. |
| `amount`, `currency` | Positive USD amount, exact integer cents internally; foundation uses `amount_cents`. |
| `program_id` | Automatically general support; no donor-selectable designation. The priority allocator determines which requests/programs receive each portion. Live use needs the actual `program.is_general` mapping. |
| `source` | Preferred giving-channel selector using the current shared GivingSource values. No claim of provider-confirmed receipt. |
| `external_id`, `dedupe_key` | Must be provider/source-owned in live mode. Demo references are clearly synthetic; foundation `source_record_id` is not a payment receipt. |
| `campaign` | Read-only allocation/request titles in review and history. Donors cannot bypass priority by choosing a lower-priority request. |
| `frequency` | One-time/monthly/annual preference. No recurring subscription or charge is created. |
| `note` | Optional donor note, max 500 characters, retained in this tab's history. |
| `is_summary`, `needs_review`, `batch_id` | Staff/import controls, not editable donation fields. |
| `thanked_at` | Requires actual communication evidence; a demo confirmation does not send or log a thank-you. |
| `created_at` / other audit fields | Server-owned in production. |

## Other pictured tables

`program` supplies program names/designations. `interaction`, `next_step`,
`message_template`, `message_draft`, `message_draft_gift`, `import_batch`,
`import_staging`, import rejection/duplicate records, `outcome`, `settings` and
`settings_secret` remain staff/system features. Registration must never expose
owner assignment, draft sending, import controls, verified outcomes, integration
URLs, keys or encrypted secret fields.

## Live integration still required

The committed database only has admin/board-member memberships, staff-owned
minimal donor rows and RLS for those roles. It has no donor auth-user binding,
donor registration API, expanded profile columns, request goals/priorities or
allocation ledger. Kaustubh must land these contracts before live mode is enabled:

1. Shared Supabase sign-up/sign-in/session refresh and an identity-bound donor
   mapping. Never treat matching an email or a UI-selected donor ID as authorization.
2. Donor-specific server guards and database policies: a donor reads/updates only
   their allowed profile fields and reads only their own gifts. No access to staff
   CRM notes, other donors, merge/owner settings or secrets. Test with two real
   accounts and tampered URLs/actions before calling it authenticated.
3. Confirm the screenshot-to-foundation field/value adapter and which optional
   contact fields CIC actually needs. Preserve anonymous/contact preferences.
4. Approved Zeffy or other provider handoff and verified webhook receipt ingestion.
   Never write a received gift from a client confirmation. Transactionally dedupe
   receipts and apply the unique-priority allocation planner under a lock.
5. Durable history, provider failure/pending states, actual receipts and recurring
   provider agreements. No payment credentials or passwords should be stored in
   client state or this feature's profile model.

The root demo provider shares fictional requests/gifts between donor and NGO
routes during client navigation. Reload clears all profiles, demo entry state,
new contributions and edits. Live routes remain setup-only and do not render this
provider. History filtering is a demo interaction, not a proven security boundary.
