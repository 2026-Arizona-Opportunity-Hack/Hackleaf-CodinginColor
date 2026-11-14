-- Import pipeline and org-settings tables.
-- Apply after 202611140001_foundation.sql.
begin;

create table public.import_batch (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('spreadsheet','zeffy','benevity','az_gives','united_way')),
  file_name text not null check (length(file_name) between 1 and 500),
  row_kind text not null check (row_kind in ('gift','donor')),
  mapping jsonb not null default '{}',
  status text not null default 'uploaded'
    check (status in ('uploaded','mapped','previewed','importing','completed','failed','rolled_back')),
  rows_read int not null default 0 check (rows_read >= 0),
  rows_created int not null default 0 check (rows_created >= 0),
  rows_matched int not null default 0 check (rows_matched >= 0),
  rows_rejected int not null default 0 check (rows_rejected >= 0),
  created_by uuid not null references public.members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'completed' or rows_read = rows_created + rows_matched + rows_rejected)
);
create index import_batch_created_by_idx on public.import_batch(created_by);
create index import_batch_status_idx on public.import_batch(status);

create table public.import_staging (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batch(id) on delete cascade,
  row_no int not null check (row_no >= 2),
  data jsonb not null,
  status text not null default 'pending'
    check (status in ('pending','rejected','applied','skipped')),
  dedupe_key text,
  matched_donor_id uuid references public.donors(id)
);
create index import_staging_batch_idx on public.import_staging(batch_id, row_no);

create table public.import_reject (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batch(id) on delete cascade,
  row_no int not null check (row_no >= 2),
  column_name text not null,
  reason text not null
);
create index import_reject_batch_idx on public.import_reject(batch_id, row_no);

create table public.duplicate_candidate (
  id uuid primary key default gen_random_uuid(),
  donor_a_id uuid not null references public.donors(id),
  donor_b_id uuid not null references public.donors(id),
  evidence jsonb not null default '{}',
  score numeric not null check (score between 0 and 1),
  status text not null default 'suggested'
    check (status in ('suggested','merged','dismissed')),
  created_at timestamptz not null default now(),
  check (donor_a_id < donor_b_id),
  unique (donor_a_id, donor_b_id)
);
create index duplicate_candidate_status_idx on public.duplicate_candidate(status);

-- Single-row org settings; enforced by the unique index on a constant.
create table public.settings (
  singleton boolean primary key default true check (singleton),
  fiscal_year_start_month int not null default 1 check (fiscal_year_start_month between 1 and 12),
  org_name text not null default 'Coding in Color',
  curriculum_api_url text,
  mail_from text,
  mail_domain_verified boolean not null default false,
  digests_paused boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.settings default values;

do $$ declare t text; begin
  foreach t in array array['import_batch','import_staging','import_reject','duplicate_candidate','settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy admin_all on public.%I for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))', t);
  end loop;
end $$;
-- Board members may read their own batches and settings.
create policy member_read_batches on public.import_batch for select to authenticated
  using ((select private.is_member()) and created_by = (select auth.uid()));
create policy member_read_settings on public.settings for select to authenticated
  using ((select private.is_member()));

commit;
