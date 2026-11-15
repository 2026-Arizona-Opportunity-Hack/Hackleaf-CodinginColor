-- Request funding uses existing received gifts, never checkout intentions.
-- Existing gifts are NOT backfilled: only receipts inserted after this migration
-- participate. Restricted gifts keep their program; the first unfinished request
-- blocks lower priorities even when its program has no matching receipt.
begin;
alter table public.programs add column is_general boolean not null default false;
create unique index one_general_program on public.programs(is_general) where is_general;
insert into public.programs(id,name,is_general) values ('general','General support',true)
  on conflict(id) do update set is_general = true;

create table private.request_funding_lock(singleton boolean primary key check(singleton));
insert into private.request_funding_lock values (true);
create table public.donation_requests (
  id uuid primary key default gen_random_uuid(),
  campaign text not null check(length(trim(campaign)) between 1 and 120),
  program_id text not null references public.programs(id),
  goal_cents bigint not null check(goal_cents between 1 and 99999999999),
  priority integer not null unique check(priority > 0),
  currency text not null default 'USD' check(currency = 'USD'),
  source text not null check(source in ('spreadsheet','zeffy','benevity','az_gives','united_way')),
  frequency text not null check(frequency in ('one_time','monthly','annually')),
  note text not null check(length(trim(note)) between 1 and 500),
  state text not null check(state in ('active','draft')),
  revision integer not null default 1,
  created_by uuid not null references public.members(id),
  created_at timestamptz not null default now()
);
-- Internal eligibility marker: historic gifts are not silently spent again.
create table private.request_receipts(gift_id uuid primary key references public.gifts(id));
create table public.donation_allocations (
  gift_id uuid not null references public.gifts(id),
  request_id uuid not null references public.donation_requests(id),
  amount_cents bigint not null check(amount_cents > 0),
  created_at timestamptz not null default now(),
  primary key(gift_id,request_id)
);
revoke all on private.request_receipts, private.request_funding_lock from public, anon, authenticated;
create index donation_allocations_request_idx on public.donation_allocations(request_id);
alter table public.donation_requests enable row level security;
alter table public.donation_allocations enable row level security;
revoke all on public.donation_requests, public.donation_allocations from anon, authenticated;
grant select on public.donation_requests, public.donation_allocations to authenticated;
create policy staff_request_read on public.donation_requests for select to authenticated
  using ((select private.is_member()));
create policy owned_allocation_read on public.donation_allocations for select to authenticated
  using ((select private.is_member()) and exists(select 1 from public.gifts g where g.id = gift_id));

create function private.allocate_request_funds() returns void
language plpgsql security definer set search_path = '' as $$
declare r record; g record; needed bigint; available bigint; portion bigint;
begin
  perform 1 from private.request_funding_lock for update;
  for r in select * from public.donation_requests where state = 'active' order by priority loop
    select r.goal_cents - coalesce(sum(a.amount_cents),0) into needed
      from public.donation_allocations a where a.request_id = r.id;
    if needed = 0 then continue; end if;
    for g in select gifts.*, p.is_general from public.gifts gifts
      join private.request_receipts receipt on receipt.gift_id = gifts.id
      join public.programs p on p.id = gifts.program_id
      where p.is_general or gifts.program_id = r.program_id
      order by gifts.received_on, gifts.created_at, gifts.id loop
      select g.amount_cents - coalesce(sum(a.amount_cents),0) into available
        from public.donation_allocations a where a.gift_id = g.id;
      portion := least(available,needed);
      if portion > 0 then
        insert into public.donation_allocations(gift_id,request_id,amount_cents)
          values(g.id,r.id,portion) on conflict(gift_id,request_id) do update
          set amount_cents = public.donation_allocations.amount_cents + excluded.amount_cents;
        needed := needed - portion;
      end if;
      exit when needed = 0;
    end loop;
    exit when needed > 0;
  end loop;
end $$;

create function private.guard_request_funding() returns trigger
language plpgsql security definer set search_path = '' as $$
declare raised bigint;
begin
  perform 1 from private.request_funding_lock for update;
  if tg_op = 'INSERT' then
    select coalesce(max(priority),0)+1 into new.priority from public.donation_requests;
  else
    if tg_op = 'DELETE' then raise exception 'Requests cannot be deleted'; end if;
    if row(new.id,new.priority,new.created_by,new.created_at) is distinct from
      row(old.id,old.priority,old.created_by,old.created_at) then raise exception 'Request identity and priority are immutable'; end if;
    select coalesce(sum(amount_cents),0) into raised from public.donation_allocations where request_id = old.id;
    if new.goal_cents < raised or (raised > 0 and (new.state = 'draft' or new.program_id <> old.program_id)) then
      raise exception 'Allocated funds must be preserved';
    end if;
    new.revision := old.revision + 1;
  end if;
  return new;
end $$;
create trigger guard_request_funding before insert or update or delete on public.donation_requests
  for each row execute function private.guard_request_funding();
create function private.request_funding_changed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'gifts' then insert into private.request_receipts values(new.id); end if;
  perform private.allocate_request_funds();
  return new;
end $$;
create trigger allocate_after_request after insert or update on public.donation_requests
  for each row execute function private.request_funding_changed();
create function private.guard_funding_receipt() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from private.request_funding_lock for update;
  if tg_op <> 'INSERT' and exists(select 1 from private.request_receipts where gift_id = old.id) then
    -- Corrections/refunds require a separately reviewed reversal workflow.
    raise exception 'Funding receipts are immutable';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
create trigger guard_funding_receipt before insert or update or delete on public.gifts
  for each row execute function private.guard_funding_receipt();
create trigger allocate_received_gift after insert on public.gifts
  for each row execute function private.request_funding_changed();
-- Designations cannot be changed underneath already committed allocations.
create function private.guard_general_program() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.is_general is distinct from old.is_general then raise exception 'General designation is fixed'; end if;
  return new;
end $$;
create trigger guard_general_program before update on public.programs
  for each row execute function private.guard_general_program();

create function public.save_donation_request(
  p_id uuid, p_revision integer, p_campaign text, p_program_id text, p_goal_cents bigint,
  p_source text, p_frequency text, p_note text, p_state text
) returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_member() then raise exception 'Active staff membership required' using errcode = '42501'; end if;
  perform 1 from private.request_funding_lock for update;
  if p_revision is null then
    -- A stable client UUID makes retries idempotent, without assigning a second priority.
    if exists(select 1 from public.donation_requests where id = p_id) then
      if exists(select 1 from public.donation_requests where id = p_id and created_by = auth.uid()
        and row(campaign,program_id,goal_cents,source,frequency,note,state) =
            row(trim(p_campaign),p_program_id,p_goal_cents,p_source,p_frequency,trim(p_note),p_state)) then return p_id; end if;
      raise exception 'Request already exists; reload before editing';
    end if;
    insert into public.donation_requests(id,campaign,program_id,goal_cents,source,frequency,note,state,created_by)
      values(p_id,trim(p_campaign),p_program_id,p_goal_cents,p_source,p_frequency,trim(p_note),p_state,auth.uid());
  else
    update public.donation_requests set campaign=trim(p_campaign), program_id=p_program_id,
      goal_cents=p_goal_cents, source=p_source, frequency=p_frequency, note=trim(p_note), state=p_state
      where id=p_id and revision=p_revision;
    if not found then raise exception 'Request changed; reload before editing'; end if;
  end if;
  return p_id;
end $$;

-- One consistent snapshot: aggregate funding is visible to active staff; identities
-- are returned only for an admin or the donor's assigned active board member.
create function public.request_funding_snapshot() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb; admin boolean;
begin
  if not private.is_member() then raise exception 'Active staff membership required' using errcode = '42501'; end if;
  admin := private.is_admin();
  select jsonb_build_object(
    'programs', (select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) order by name),'[]'::jsonb) from public.programs),
    'requests', (select coalesce(jsonb_agg(to_jsonb(r) - 'created_by' order by r.priority),'[]'::jsonb) from public.donation_requests r),
    'allocations', (select coalesce(jsonb_agg(jsonb_build_object(
      'request_id', a.request_id, 'amount_cents',a.amount_cents,
      'donor_name',case when admin or d.owner_id = auth.uid() then d.name else 'Restricted donor' end,
      'received_on',case when admin or d.owner_id = auth.uid() then g.received_on else null end
    ) order by a.created_at,a.gift_id,a.request_id),'[]'::jsonb)
      from public.donation_allocations a join public.gifts g on g.id=a.gift_id join public.donors d on d.id=g.donor_id),
    'unallocated_cents', (select coalesce(sum(g.amount_cents),0) from public.gifts g join private.request_receipts r on r.gift_id=g.id)
      - (select coalesce(sum(amount_cents),0) from public.donation_allocations)
  ) into result;
  return result;
end $$;

revoke all on function private.allocate_request_funds(), private.guard_request_funding(),
  private.request_funding_changed(), private.guard_funding_receipt(), private.guard_general_program() from public, anon, authenticated;
revoke all on function public.save_donation_request(uuid,integer,text,text,bigint,text,text,text,text), public.request_funding_snapshot() from public, anon;
grant execute on function public.save_donation_request(uuid,integer,text,text,bigint,text,text,text,text), public.request_funding_snapshot() to authenticated;
notify pgrst, 'reload schema';
commit;
