begin;
-- Durable single-NGO case workspace. Existing donor tables retain their own
-- ownership policies. No demo people, passwords or sessions are copied here.
create table public.case_workspaces (
  id text primary key check (id = 'coding-in-color'),
  revision bigint not null default 1,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.case_workspaces enable row level security;
revoke all on public.case_workspaces from anon, authenticated;
grant select on public.case_workspaces to authenticated;
create policy case_workspace_read on public.case_workspaces for select to authenticated
  using ((select private.is_member()));
insert into public.case_workspaces(id,data) values ('coding-in-color',
  '{"version":2,"clients":[],"visits":[],"appointments":[],"audit":[],"documents":[],"webhookKeys":[],"webhookReceipts":[],"importBatches":[],"reminderDismissals":[],"staffEmails":[],"settingsRevision":1,"serviceFields":[],"fields":[{"id":"gender","label":"Gender","type":"text","options":[],"active":true},{"id":"language","label":"Preferred language","type":"text","options":[],"active":true},{"id":"household_size","label":"Household size","type":"number","options":[],"active":true}],"serviceTypes":[{"id":"intake","label":"Intake assessment","active":true}]}'::jsonb);

create function public.case_workspace_save(expected_revision bigint, next_data jsonb)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  old_data jsonb; revision_now bigint; actor public.members;
  k text; previous jsonb; item jsonb; ident text;
  allowed text[] := array['version','clients','visits','appointments','audit','documents','webhookKeys','webhookReceipts','importBatches','reminderDismissals','staffEmails','settingsRevision','fields','serviceFields','serviceTypes'];
begin
  select * into actor from public.members where id=auth.uid() and active;
  if not found or actor.role not in ('admin','board_member') then raise exception 'Active staff access required' using errcode='42501'; end if;
  if jsonb_typeof(next_data)<>'object' or octet_length(next_data::text)>8000000 then raise exception 'Invalid workspace payload'; end if;
  if exists(select 1 from jsonb_object_keys(next_data) p where not (p=any(allowed))) then raise exception 'Unexpected workspace field'; end if;
  select data,revision into old_data,revision_now from public.case_workspaces where id='coding-in-color' for update;
  if revision_now<>expected_revision then raise exception 'Workspace changed. Refresh before saving.' using errcode='40001'; end if;
  if next_data->'version' is distinct from old_data->'version' then raise exception 'Invalid workspace version'; end if;
  foreach k in array array['clients','visits','appointments','audit','documents','webhookKeys','webhookReceipts','importBatches','reminderDismissals','staffEmails','fields','serviceFields','serviceTypes'] loop
    if jsonb_typeof(next_data->k) is distinct from 'array' then raise exception 'Invalid collection: %', k; end if;
  end loop;
  -- Authenticated staff may add clients/services/documents and manage only their
  -- own appointments/reminders. Configuration and destructive changes are admin-only.
  if actor.role<>'admin' then
    foreach k in array array['settingsRevision','fields','serviceFields','serviceTypes','webhookKeys','webhookReceipts','importBatches','staffEmails'] loop
      if next_data->k is distinct from old_data->k then raise exception 'Admin access required' using errcode='42501'; end if;
    end loop;
    foreach k in array array['clients','visits','documents'] loop
      for previous in select value from jsonb_array_elements(old_data->k) loop
        if not (next_data->k @> jsonb_build_array(previous)) then raise exception 'Existing records require admin access' using errcode='42501'; end if;
      end loop;
    end loop;
    for previous in select value from jsonb_array_elements(old_data->'appointments') loop
      select value into item from jsonb_array_elements(next_data->'appointments') where value->>'id'=previous->>'id';
      if item is null or (item is distinct from previous and (previous->>'staffId'<>actor.id::text or item->>'staffId'<>actor.id::text)) then raise exception 'Cannot change another staff appointment' using errcode='42501'; end if;
    end loop;
    for item in select value from jsonb_array_elements(next_data->'appointments') loop
      if not (old_data->'appointments' @> jsonb_build_array(item)) and item->>'staffId' is distinct from actor.id::text then raise exception 'Cannot assign another staff member' using errcode='42501'; end if;
    end loop;
    for previous in select value from jsonb_array_elements(old_data->'reminderDismissals') loop
      if previous->>'userId'<>actor.id::text and not (next_data->'reminderDismissals' @> jsonb_build_array(previous)) then raise exception 'Cannot change another reminder' using errcode='42501'; end if;
    end loop;
    for item in select value from jsonb_array_elements(next_data->'reminderDismissals') loop
      if not (old_data->'reminderDismissals' @> jsonb_build_array(item)) and item->>'userId' is distinct from actor.id::text then raise exception 'Cannot forge reminders' using errcode='42501'; end if;
    end loop;
  end if;
  foreach k in array array['clients','visits','appointments','documents'] loop
    if exists(select 1 from jsonb_array_elements(next_data->k) p where jsonb_typeof(p)<>'object' or coalesce(p->>'id','') !~ '^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$') then raise exception 'Invalid record identifier'; end if;
    if (select count(*)<>count(distinct p->>'id') from jsonb_array_elements(next_data->k) p) then raise exception 'Duplicate identifiers'; end if;
  end loop;
  foreach k in array array['visits','appointments','documents'] loop
    for item in select value from jsonb_array_elements(next_data->k) loop
      if not exists(select 1 from jsonb_array_elements(next_data->'clients') c where c->>'id'=item->>'clientId') then raise exception 'Client does not exist'; end if;
      if k='visits' and not (old_data->'visits' @> jsonb_build_array(item)) and actor.role<>'admin' and item->>'staffId' is distinct from actor.id::text then raise exception 'Cannot forge service author' using errcode='42501'; end if;
      if k='documents' and not (old_data->'documents' @> jsonb_build_array(item)) and item->>'createdBy' is distinct from actor.id::text then raise exception 'Cannot forge document author' using errcode='42501'; end if;
    end loop;
  end loop;
  -- Audit history is immutable even for application admins. Normalize new event
  -- attribution inside the transaction; callers cannot impersonate another user.
  for previous in select value from jsonb_array_elements(old_data->'audit') loop
    if not (next_data->'audit' @> jsonb_build_array(previous)) then raise exception 'Audit history is immutable'; end if;
  end loop;
  next_data:=jsonb_set(next_data,'{audit}',coalesce((select jsonb_agg(case when old_data->'audit' @> jsonb_build_array(p) then p else p || jsonb_build_object('actorId',actor.id,'actorName',actor.display_name,'at',now()) end) from jsonb_array_elements(next_data->'audit') p),'[]'::jsonb));
  update public.case_workspaces set data=next_data,revision=revision+1,updated_at=now() where id='coding-in-color' returning revision into revision_now;
  return revision_now;
end $$;
revoke all on function public.case_workspace_save(bigint,jsonb) from public,anon;
grant execute on function public.case_workspace_save(bigint,jsonb) to authenticated;
commit;
