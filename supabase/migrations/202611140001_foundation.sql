-- CIC-only foundation. Apply to a new Supabase database after account setup.
-- No donor data is seeded. Provision memberships through trusted SQL/admin tooling.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.members (
  id uuid primary key references auth.users(id),
  display_name text not null check (length(display_name) between 1 and 200),
  role text not null check (role in ('admin', 'board_member')),
  active boolean not null default true,
  last_assigned_at timestamptz,
  created_at timestamptz not null default now()
);
create function private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.members where id = (select auth.uid()) and active and role = 'admin');
$$;
create function private.is_member() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.members where id = (select auth.uid()) and active);
$$;
revoke all on function private.is_admin(), private.is_member() from public;
grant execute on function private.is_admin(), private.is_member() to authenticated;

create table public.programs (
  id text primary key, name text not null check (length(name) between 1 and 200)
);
create table public.donors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 200),
  kind text not null check (kind in ('individual', 'foundation', 'company')),
  email text check (length(email) <= 254),
  owner_id uuid not null references public.members(id),
  created_at timestamptz not null default now()
);
-- Nonunique: shared household/corporate email addresses require human review.
create index donors_email_idx on public.donors(lower(trim(email)));
create index donors_owner_idx on public.donors(owner_id);
create table public.donor_sources (
  id uuid primary key default gen_random_uuid(), donor_id uuid not null references public.donors(id),
  source text not null check (source in ('spreadsheet','zeffy','benevity','az_gives','united_way')),
  source_donor_id text not null, unique(source, source_donor_id)
);
create index donor_sources_donor_idx on public.donor_sources(donor_id);
create table public.gifts (
  id uuid primary key default gen_random_uuid(), donor_id uuid not null references public.donors(id),
  amount_cents bigint not null check (amount_cents > 0 and amount_cents <= 9007199254740991),
  currency text not null default 'USD' check (currency = 'USD'), received_on date not null,
  program_id text not null references public.programs(id),
  source text not null check (source in ('spreadsheet','zeffy','benevity','az_gives','united_way')),
  source_record_id text not null check (length(source_record_id) between 1 and 200),
  created_at timestamptz not null default now(), unique(source, source_record_id)
);
create index gifts_donor_date_idx on public.gifts(donor_id, received_on desc);
create index gifts_program_date_idx on public.gifts(program_id, received_on);
create table public.communications (
  id uuid primary key default gen_random_uuid(), donor_id uuid not null references public.donors(id),
  actor_id uuid not null references public.members(id),
  channel text not null check (channel in ('email','sms','meeting','phone')),
  summary text not null check (length(summary) between 1 and 2000), occurred_at timestamptz not null,
  origin text not null check (origin in ('manual_log','provider_receipt')),
  provider_receipt_id text unique,
  check (origin <> 'provider_receipt' or provider_receipt_id is not null)
);
create index communications_donor_date_idx on public.communications(donor_id, occurred_at desc);
create index communications_actor_idx on public.communications(actor_id);
create table public.follow_ups (
  id uuid primary key default gen_random_uuid(), donor_id uuid not null references public.donors(id),
  owner_id uuid not null references public.members(id), title text not null check (length(title) between 1 and 500),
  due_on date not null, status text not null default 'open' check (status in ('open','completed')),
  kind text not null check (kind in ('thank_you','quarterly','renewal','check_in')),
  created_at timestamptz not null default now()
);
create index follow_ups_donor_idx on public.follow_ups(donor_id);
create index follow_ups_owner_due_idx on public.follow_ups(owner_id, due_on) where status = 'open';
create table public.outreach_drafts (
  id uuid primary key default gen_random_uuid(), donor_id uuid not null references public.donors(id),
  channel text not null check (channel in ('email','sms')), subject text,
  body text not null check (length(body) between 1 and 10000),
  state text not null default 'draft' check (state in ('draft','approved','sent','failed')),
  approved_by uuid references public.members(id), approved_at timestamptz, sent_at timestamptz,
  provider_receipt_id text unique,
  check (state not in ('approved','sent') or (approved_by is not null and approved_at is not null)),
  check (state <> 'sent' or (sent_at is not null and provider_receipt_id is not null))
);
create index outreach_drafts_donor_idx on public.outreach_drafts(donor_id);
create index outreach_drafts_approver_idx on public.outreach_drafts(approved_by);
create function private.invalidate_draft_approval() returns trigger language plpgsql set search_path = '' as $$
begin
  if old.state = 'sent' then raise exception 'Sent drafts are immutable'; end if;
  if row(new.body,new.subject,new.channel,new.donor_id) is distinct from row(old.body,old.subject,old.channel,old.donor_id) then
    new.state := 'draft'; new.approved_by := null; new.approved_at := null;
    new.sent_at := null; new.provider_receipt_id := null;
  end if;
  return new;
end $$;
create trigger invalidate_draft_approval before update on public.outreach_drafts
  for each row execute function private.invalidate_draft_approval();
create table public.outcome_evidence (
  id uuid primary key default gen_random_uuid(), program_id text not null references public.programs(id),
  period_start date not null, period_end date not null check (period_end >= period_start),
  metric text not null, value numeric not null, unit text not null,
  source_url text not null check (source_url ~ '^https://'), verified_at timestamptz not null,
  attribution_note text not null
);
create index outcome_evidence_program_idx on public.outcome_evidence(program_id, period_start);

-- No grants to anon. RLS is a second boundary beyond server authorization.
do $$ declare t text; begin
  foreach t in array array['members','programs','donors','donor_sources','gifts','communications','follow_ups','outreach_drafts','outcome_evidence'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    if t <> 'members' then
      execute format('create policy admin_all on public.%I for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))', t);
    end if;
  end loop;
end $$;
-- No client role, including admin, may create or promote memberships.
revoke insert, update, delete on public.members from authenticated;
create policy member_self_or_admin on public.members for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));
create policy member_programs on public.programs for select to authenticated using ((select private.is_member()));
create policy owned_donors on public.donors for select to authenticated
  using ((select private.is_member()) and owner_id = (select auth.uid()));

do $$ declare t text; begin
  foreach t in array array['donor_sources','gifts','communications','follow_ups','outreach_drafts'] loop
    execute format('create policy owned_read on public.%I for select to authenticated using (exists (select 1 from public.donors d where d.id = donor_id))', t);
  end loop;
end $$;
create policy owned_communication_insert on public.communications for insert to authenticated
  with check (actor_id = (select auth.uid()) and origin = 'manual_log' and provider_receipt_id is null
    and exists(select 1 from public.donors d where d.id = donor_id));
create policy owned_followup_insert on public.follow_ups for insert to authenticated
  with check (owner_id = (select auth.uid()) and exists(select 1 from public.donors d where d.id = donor_id));
create policy owned_followup_update on public.follow_ups for update to authenticated
  using (owner_id = (select auth.uid()) and exists(select 1 from public.donors d where d.id = donor_id))
  with check (owner_id = (select auth.uid()) and exists(select 1 from public.donors d where d.id = donor_id));
create policy owned_draft_insert on public.outreach_drafts for insert to authenticated
  with check (state = 'draft' and approved_by is null and approved_at is null and sent_at is null
    and provider_receipt_id is null and exists(select 1 from public.donors d where d.id = donor_id));
commit;
