begin;
create function public.case_webhook_ingest(p_token text,p_external_id text,p_client jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare workspace public.case_workspaces; actor public.members; key_data jsonb; receipt jsonb;
  field jsonb; field_value text; field_id text; result_id uuid; normalized jsonb;
  request_hash text; before_count integer; result jsonb;
begin
  if p_token !~ '^hl_[0-9a-f]{64}$' then raise exception 'Unauthorized' using errcode='42501'; end if;
  if p_external_id is null or length(p_external_id) not between 1 and 100 or octet_length(p_client::text)>50000 then raise exception 'Invalid webhook input'; end if;
  select * into workspace from public.case_workspaces where id='coding-in-color' for update;
  select k into key_data from jsonb_array_elements(workspace.data->'webhookKeys') k
    where k->>'hash'=encode(sha256(convert_to(p_token,'UTF8')),'hex');
  if key_data is null then raise exception 'Unauthorized' using errcode='42501'; end if;
  select * into actor from public.members where id=(key_data->>'ownerId')::uuid and active and role='admin';
  if not found then raise exception 'Unauthorized' using errcode='42501'; end if;
  request_hash:=encode(sha256(convert_to(p_client::text,'UTF8')),'hex');
  select r into receipt from jsonb_array_elements(workspace.data->'webhookReceipts') r where r->>'keyId'=key_data->>'id' and r->>'externalId'=p_external_id;
  if receipt is not null then
    if receipt->>'hash'<>request_hash then raise exception 'External ID was already used with different content'; end if;
    return jsonb_build_object('clientId',receipt->>'clientId','replayed',true);
  end if;
  if jsonb_typeof(p_client)<>'object' or length(trim(coalesce(p_client->>'name',''))) not between 1 and 200
    or coalesce(p_client->>'dateOfBirth','') !~ '^\d{4}-\d{2}-\d{2}$'
    or (p_client->>'dateOfBirth')::date>(now() at time zone 'America/Phoenix')::date
    or length(coalesce(p_client->>'email',''))>254 or length(coalesce(p_client->>'phone',''))>30
    or (coalesce(p_client->>'email','')='' and coalesce(p_client->>'phone','')='')
    or jsonb_typeof(p_client->'demographics') is distinct from 'object' then raise exception 'Invalid client fields'; end if;
  for field_id in select jsonb_object_keys(p_client->'demographics') loop
    if not exists(select 1 from jsonb_array_elements(workspace.data->'fields') f where f->>'id'=field_id and f->>'active'='true') then raise exception 'Unknown demographic field'; end if;
  end loop;
  normalized:='{}'::jsonb;
  for field in select f from jsonb_array_elements(workspace.data->'fields') f where f->>'active'='true' loop
    field_value:=trim(coalesce(p_client->'demographics'->>(field->>'id'),''));
    if length(field_value)>200 or (field_value<>'' and field->>'type'='number' and field_value !~ '^\d{1,6}$')
      or (field_value<>'' and field->>'type'='select' and not(field->'options' ? field_value)) then raise exception 'Invalid demographic value'; end if;
    normalized:=normalized||jsonb_build_object(field->>'id',field_value);
  end loop;
  result_id:=gen_random_uuid(); before_count:=jsonb_array_length(workspace.data->'clients');
  workspace.data:=jsonb_set(workspace.data,'{clients}',workspace.data->'clients'||jsonb_build_array(jsonb_build_object(
    'id',result_id,'name',trim(p_client->>'name'),'dateOfBirth',p_client->>'dateOfBirth','email',p_client->>'email','phone',p_client->>'phone',
    'demographics',normalized,'active',true,'revision',1,'createdAt',now())));
  workspace.data:=jsonb_set(workspace.data,'{webhookReceipts}',workspace.data->'webhookReceipts'||jsonb_build_array(jsonb_build_object('keyId',key_data->>'id','externalId',p_external_id,'hash',request_hash,'clientId',result_id)));
  workspace.data:=jsonb_set(workspace.data,'{audit}',workspace.data->'audit'||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'actorId',actor.id,'actorName',actor.display_name,'at',now(),'action','client.webhook_create','entity','client','before',jsonb_build_object('clients',before_count),'after',jsonb_build_object('clients',before_count+1),'changedFields',jsonb_build_array('records'))));
  update public.case_workspaces set data=workspace.data,revision=revision+1,updated_at=now() where id='coding-in-color';
  return jsonb_build_object('clientId',result_id,'replayed',false);
end $$;
revoke all on function public.case_webhook_ingest(text,text,jsonb) from public;
grant execute on function public.case_webhook_ingest(text,text,jsonb) to anon,authenticated;
notify pgrst,'reload schema';
commit;
