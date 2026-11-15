-- User-requested policy: signed-in accounts manage request metadata without
-- staff approval. Donor identities, gifts and role promotion remain restricted.
begin;
alter table public.donation_requests drop constraint donation_requests_created_by_fkey;
alter table public.donation_requests add constraint donation_requests_created_by_fkey
  foreign key(created_by) references auth.users(id);
drop policy staff_request_read on public.donation_requests;
create policy signed_in_request_read on public.donation_requests for select to authenticated
  using ((select auth.uid()) is not null);

create or replace function public.save_donation_request(
  p_id uuid, p_revision integer, p_campaign text, p_program_id text, p_goal_cents bigint,
  p_source text, p_frequency text, p_note text, p_state text
) returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign-in required' using errcode = '42501'; end if;
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

-- One consistent snapshot: aggregate funding is visible to signed-in accounts; identities
-- are returned only for an admin or the donor's assigned active board member.
create or replace function public.request_funding_snapshot() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb; admin boolean;
begin
  if auth.uid() is null then raise exception 'Sign-in required' using errcode = '42501'; end if;
  admin := private.is_admin();
  select jsonb_build_object(
    'programs', (select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name) order by name),'[]'::jsonb) from public.programs),
    'requests', (select coalesce(jsonb_agg(to_jsonb(r) - 'created_by' order by r.priority),'[]'::jsonb) from public.donation_requests r),
    'allocations', (select coalesce(jsonb_agg(jsonb_build_object(
      'request_id', a.request_id, 'amount_cents',a.amount_cents,
      'donor_name',case when admin or (private.is_member() and d.owner_id = auth.uid()) then d.name else 'Restricted donor' end,
      'received_on',case when admin or (private.is_member() and d.owner_id = auth.uid()) then g.received_on else null end
    ) order by a.created_at,a.gift_id,a.request_id),'[]'::jsonb)
      from public.donation_allocations a join public.gifts g on g.id=a.gift_id join public.donors d on d.id=g.donor_id),
    'unallocated_cents', (select coalesce(sum(g.amount_cents),0) from public.gifts g join private.request_receipts r on r.gift_id=g.id)
      - (select coalesce(sum(amount_cents),0) from public.donation_allocations)
  ) into result;
  return result;
end $$;

notify pgrst, 'reload schema';
commit;
