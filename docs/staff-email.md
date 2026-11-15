# Automatic staff email

Real delivery uses Resend's server API. Nothing is sent until configuration is
complete and explicitly enabled. SQL remains disabled: records and the email
outbox use the existing single-instance private local store. Deploy with durable
disk; an ephemeral filesystem cannot retain pending email or acceptance history.

## Configure

1. Sign in to [Resend](https://resend.com), verify a sender domain, and create a
   sending API key. Domain ownership and DNS changes are handled by the owner.
2. Fill these **server-only** values in ignored `.env.local` (and deployment
   environment settings). Never commit the key or put it in a `NEXT_PUBLIC_` value.

   ```dotenv
   STAFF_EMAIL_ENABLED=true
   RESEND_API_KEY=your-private-sending-key
   STAFF_EMAIL_FROM=alerts@your-verified-domain.org
   STAFF_EMAIL_RECIPIENTS=staff1@your-domain.org,staff2@your-domain.org
   STAFF_EMAIL_ORGANIZATION=coding-in-color
   STAFF_EMAIL_CRON_SECRET=your-random-secret-of-at-least-32-characters
   ```

3. Sender must be a plain verified email address. Use 1–5 explicit staff recipient
   addresses; recipients are never taken from self-registration or client input.
   This configuration is bound to one organization; other demo organizations do
   not send to these inboxes. Restart the app after editing configuration.
4. Perform an intentional new activity. The dashboard shows configuration state,
   queued messages, recent provider acceptances, and failures. Tests mock Resend;
   no real email has been sent during development.

## Triggers and content

New client registration/import/inbound webhook, new service log, and appointment
creation/update/cancellation/completion each queue an alert after the record has
saved. An import generates one aggregate alert rather than one per client. Seed
data, login, reading the dashboard, reminder snoozes and historical activity do
not send. The existing external email draft feature is separate.

Emails contain the activity type and today's calculated service/client/appointment
brief, with Phoenix dates and the fictional-demo notice. No client names, emails,
phone numbers, notes, staff names, or document attachments are included. This
does not notify about browser-memory funding simulations, arbitrary donor changes,
or overdue appointments without a saved event. It is real email about demo data,
not a live SQL integration.

## Delivery and retries

The record and queued email are written atomically before calling Resend. A
provider failure does not undo the record. Acceptance is stored with a provider
ID; it is **not** a delivery receipt. Check Resend's dashboard for bounces and
delivery results; a delivery-status webhook is not implemented.

One eligible email is attempted per saved transaction, with a 3-second timeout.
Temporary failures retry with backoff on subsequent saves. For unattended retries,
configure your scheduler to POST `/api/reports/staff-email-retry` every minute
with `Authorization: Bearer <STAFF_EMAIL_CRON_SECRET>`. A scheduler has not been
provisioned automatically. It drains one eligible message per call and always uses
the configured organization, ignoring browser cookies.

Retries reuse a stable Resend idempotency key. Automatic retries stop after five
attempts or 23 hours, before Resend's 24-hour key expiry. Permanent errors and
removed recipients also stop retries. Inspect provider history before manually
re-sending a failed message; failures are visible on the dashboard. The local
filesystem lock serializes sends across processes on this one instance. For
multiple replicas, move the outbox to a shared transactional store first.

References: [Send email](https://resend.com/docs/api-reference/emails/send-email),
[idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys).
