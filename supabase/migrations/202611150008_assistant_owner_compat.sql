-- Live registration already permits admin-owned donors. Prefer board owners,
-- fall back to active admins when no board roster exists, and support follow-ups
-- for any active owner. Actor permissions and signed-review semantics are unchanged.
begin;
create or replace function public.assistant_apply_action(p_id uuid, p_operation text, p_input jsonb, p_before jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid(); actor_role text; target public.donors; task public.follow_ups;
  receipt public.assistant_action_receipts; owner uuid; entity uuid;
  request_hash text := md5(p_operation || p_input::text); result jsonb;
begin
  select role into actor_role from public.members where id=actor and active;
  if actor_role is null then raise exception 'Not authorized'; end if;
  if p_operation not in ('create_donor','update_donor','assign_owner','create_follow_up','update_follow_up','log_communication','draft_outreach') then raise exception 'Unsupported operation'; end if;
  if p_operation in ('create_donor','update_donor','assign_owner') and actor_role <> 'admin' then raise exception 'Admin required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_id::text));
  select * into receipt from public.assistant_action_receipts where id=p_id;
  if found then
    if receipt.actor_id <> actor or receipt.request_hash <> request_hash then raise exception 'Action conflict'; end if;
    return receipt.result || jsonb_build_object('replayed',true);
  end if;

  if p_operation = 'update_follow_up' then
    select * into task from public.follow_ups where id=(p_input->>'taskId')::uuid;
    if not found then raise exception 'Next step unavailable'; end if;
    select * into target from public.donors where id=task.donor_id for update;
    select * into task from public.follow_ups where id=(p_input->>'taskId')::uuid for update;
    if actor_role <> 'admin' and (task.owner_id <> actor or target.owner_id <> actor) then raise exception 'Not authorized'; end if;
    if p_before is null or p_before = '{}'::jsonb or not(to_jsonb(task) @> p_before) then raise exception 'Record changed; prepare again'; end if;
  elsif p_operation <> 'create_donor' then
    select * into target from public.donors where id=(p_input->>'donorId')::uuid for update;
    if not found or (actor_role <> 'admin' and target.owner_id <> actor) then raise exception 'Donor unavailable'; end if;
    if p_before is null or p_before = '{}'::jsonb or not(to_jsonb(target) @> p_before) then raise exception 'Record changed; prepare again'; end if;
  end if;

  case p_operation
  when 'create_donor' then
    -- Lock the eligible roster before counting loads; concurrent creates serialize.
    perform id from public.members where active and role in ('board_member','admin') order by id for update;
    select m.id into owner from public.members m where m.active and m.role in ('board_member','admin')
      order by case when m.role='board_member' then 0 else 1 end, (select count(*) from public.donors d where d.owner_id=m.id), m.last_assigned_at asc nulls first, m.id limit 1;
    if owner is null then raise exception 'No active staff owner'; end if;
    if p_input->>'email' is not null and exists(select 1 from public.donors where lower(trim(email))=lower(trim(p_input->>'email'))) then raise exception 'Matching email needs review'; end if;
    insert into public.donors(id,name,kind,email,owner_id) values(p_id,p_input->>'name',p_input->>'kind',p_input->>'email',owner) returning id into entity;
    update public.members set last_assigned_at=now() where id=owner;
  when 'update_donor' then
    if p_input->>'email' is not null and exists(select 1 from public.donors where id<>target.id and lower(trim(email))=lower(trim(p_input->>'email'))) then raise exception 'Matching email needs review'; end if;
    update public.donors set name=p_input->>'name',kind=p_input->>'kind',email=p_input->>'email' where id=target.id returning id into entity;
  when 'assign_owner' then
    owner := (p_input->>'memberId')::uuid;
    if not exists(select 1 from public.members where id=owner and active and role in ('board_member','admin')) then raise exception 'Owner unavailable'; end if;
    update public.donors set owner_id=owner where id=target.id returning id into entity;
    update public.follow_ups set owner_id=owner where donor_id=target.id and status='open';
  when 'create_follow_up' then
    if actor_role <> 'admin' and target.owner_id<>actor then raise exception 'Not authorized'; end if;
    if not exists(select 1 from public.members where id=target.owner_id and active and role in ('board_member','admin')) then raise exception 'Active staff owner required'; end if;
    insert into public.follow_ups(id,donor_id,owner_id,title,due_on,kind)
      values(p_id,target.id,target.owner_id,p_input->>'title',(p_input->>'dueOn')::date,p_input->>'kind') returning id into entity;
  when 'update_follow_up' then
    update public.follow_ups set title=p_input->>'title',due_on=(p_input->>'dueOn')::date,status=p_input->>'status' where id=task.id returning id into entity;
  when 'log_communication' then
    if (p_input->>'occurredOn')::date > (now() at time zone 'America/Phoenix')::date then raise exception 'Contact date is in the future'; end if;
    insert into public.communications(id,donor_id,actor_id,channel,summary,occurred_at,origin)
      values(p_id,target.id,actor,p_input->>'channel',p_input->>'summary',((p_input->>'occurredOn') || 'T12:00:00-07:00')::timestamptz,'manual_log') returning id into entity;
  when 'draft_outreach' then
    if char_length(p_input->>'subject') > 200 then raise exception 'Subject is too long'; end if;
    insert into public.outreach_drafts(id,donor_id,channel,subject,body,state)
      values(p_id,target.id,p_input->>'channel',p_input->>'subject',p_input->>'body','draft') returning id into entity;
  end case;
  result := jsonb_build_object('id',entity,'operation',p_operation,'state',case when p_operation='draft_outreach' then 'draft' else 'applied' end);
  -- Minimal receipt: never store transcripts, donor names or message bodies here.
  insert into public.assistant_action_receipts(id,actor_id,operation,request_hash,result) values(p_id,actor,p_operation,request_hash,result);
  return result;
end $$;
revoke all on function public.assistant_apply_action(uuid,text,jsonb,jsonb) from public,anon;
grant execute on function public.assistant_apply_action(uuid,text,jsonb,jsonb) to authenticated;
commit;
