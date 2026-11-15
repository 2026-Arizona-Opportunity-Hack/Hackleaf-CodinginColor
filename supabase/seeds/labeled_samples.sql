-- Explicitly requested sample records. Additive and idempotent; never replaces
-- real records or creates login accounts. All sample people/funding are fictional.
begin;
select pg_advisory_xact_lock(422050);
create table if not exists private.hackleaf_sample_batches(id text primary key,created_at timestamptz not null default now());
revoke all on private.hackleaf_sample_batches from public,anon,authenticated;
do $$
<<seed>>
declare data jsonb; owners uuid[]; owner uuid; client_id uuid; donor_id uuid;
  i integer; j integer; typ jsonb; demo_values jsonb; f jsonb; old_count integer;
  names text[]:=array['Alex Morgan','Blair Taylor','Casey Reed','Drew Brooks','Emery Lee','Finley Quinn','Gray Jordan','Harper Lane','Indigo Parker','Jamie River','Kai Avery','Robin Sage'];
  donor_names text[]:=array['Jordan Ellis','Mesa Learning Fund','Alex Rivera','Sunrise Community Fund','Morgan Chen','Valley Opportunity Partners'];
  today date:=(now() at time zone 'America/Phoenix')::date;
begin
 if exists(select 1 from private.hackleaf_sample_batches where id='labeled-samples-v1') then return; end if;
 select array_agg(id order by created_at,id) into owners from public.members where active and role in ('admin','board_member');
 if coalesce(array_length(owners,1),0)=0 then raise exception 'Provision staff before adding samples'; end if;
 select w.data into data from public.case_workspaces w where w.id='coding-in-color' for update;
 old_count:=jsonb_array_length(data->'clients');
 for i in 1..2 loop
   if not exists(select 1 from jsonb_array_elements(data->'serviceTypes') t where t->>'id'='sample-service-'||i) then
     data:=jsonb_set(data,'{serviceTypes}',data->'serviceTypes'||jsonb_build_array(jsonb_build_object('id','sample-service-'||i,'label',case when i=1 then 'Sample resource support' else 'Sample follow-up visit' end,'active',true)));
   end if;
 end loop;
 for i in 1..12 loop
   client_id:=('c1c00000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
   owner:=owners[1+((i-1)%array_length(owners,1))]; demo_values:='{}'::jsonb;
   for f in select value from jsonb_array_elements(data->'fields') where value->>'active'='true' loop
     demo_values:=demo_values||jsonb_build_object(f->>'id',case when f->>'type'='number' then (1+i%5)::text when f->>'type'='select' then coalesce(f->'options'->>0,'') when f->>'id'='language' then case when i%2=0 then 'Spanish' else 'English' end else 'Sample value' end);
   end loop;
   if not exists(select 1 from jsonb_array_elements(data->'clients') c where c->>'id'=client_id::text) then
     data:=jsonb_set(data,'{clients}',data->'clients'||jsonb_build_array(jsonb_build_object('id',client_id,'name','Sample '||names[i],'dateOfBirth',make_date(1980+i*2,4,least(i+1,28))::text,'email','sample-client-'||i||'@example.invalid','phone','202-555-'||lpad((100+i)::text,4,'0'),'demographics',demo_values,'active',true,'revision',1,'createdAt',now()-make_interval(days=>i*3))));
   end if;
   for j in 1..3 loop
     select t into typ from jsonb_array_elements(data->'serviceTypes') t where t->>'active'='true' order by t->>'id' offset (j-1)%greatest(1,jsonb_array_length(data->'serviceTypes')) limit 1;
     if typ is null then select t into typ from jsonb_array_elements(data->'serviceTypes') t where t->>'active'='true' limit 1; end if;
     data:=jsonb_set(data,'{visits}',data->'visits'||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'clientId',client_id,'date',(today-((i-1)*2+(j-1)*7))::text,'serviceTypeId',typ->>'id','serviceTypeLabel',typ->>'label','staffId',owner,'staffName',(select display_name from public.members where id=owner),'notes','Sample: fictional service activity for demonstration, not a real client interaction.','customFields','{}'::jsonb,'revision',1,'createdAt',now()-make_interval(days=>(i-1)*2+(j-1)*7))));
   end loop;
 end loop;
 for i in 1..8 loop
   owner:=owners[1+((i-1)%array_length(owners,1))];client_id:=('c1c00000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid;
   data:=jsonb_set(data,'{appointments}',data->'appointments'||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'clientId',client_id,'date',case when i<=3 then ((now()+make_interval(mins=>45+i*30)) at time zone 'America/Phoenix')::date::text when i<=6 then (today-i)::text else (today+i-6)::text end,'time',case when i<=3 then to_char((now()+make_interval(mins=>45+i*30)) at time zone 'America/Phoenix','HH24:MI') else '10:00' end,'durationMinutes',30,'serviceTypeId',typ->>'id','serviceTypeLabel',typ->>'label','staffId',owner,'staffName',(select display_name from public.members where id=owner),'notes','Sample: fictional demonstration appointment.','status',case when i in (4,5) then 'completed' when i=6 then 'cancelled' else 'scheduled' end,'revision',1,'createdAt',now())));
 end loop;
 data:=jsonb_set(data,'{audit}',data->'audit'||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'actorId','system','actorName','Sample data setup','at',now(),'action','sample.seed','entity','workspace','before',jsonb_build_object('clients',old_count),'after',jsonb_build_object('clients',jsonb_array_length(data->'clients')),'changedFields',jsonb_build_array('records'))));
 update public.case_workspaces w set data=seed.data,revision=revision+1,updated_at=now() where w.id='coding-in-color';
 -- Requests precede new sample gifts so the existing allocation triggers produce
 -- a realistic saved priority/funding view. No real money is collected.
 for i in 1..3 loop
   insert into public.donation_requests(id,campaign,program_id,goal_cents,priority,source,frequency,note,state,created_by)
   values(('f1c00000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,
     'Sample '||(array['Learning materials','Community workshop access','Program continuity'])[i],
     'general',(array[250000,500000,150000])[i],1,'spreadsheet','one_time','Sample: fictional demonstration funding need, not a real campaign.','active',owners[1]);
 end loop;
 for i in 1..6 loop
   donor_id:=('d1c00000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid; owner:=owners[1+((i-1)%array_length(owners,1))];
   insert into public.donors(id,name,kind,email,owner_id) values(donor_id,'Sample '||donor_names[i],case when i in (2,4) then 'foundation' when i=6 then 'company' else 'individual' end,'sample-donor-'||i||'@example.invalid',owner);
   if i<>4 then insert into public.gifts(donor_id,amount_cents,currency,received_on,program_id,source,source_record_id) values(donor_id,10000*i,'USD',make_date(extract(year from today)::int-1,6,15),'general','spreadsheet','hackleaf-sample-v1-previous-'||i); end if;
   if i<>3 then insert into public.gifts(donor_id,amount_cents,currency,received_on,program_id,source,source_record_id) values(donor_id,12500*i,'USD',today-(i*2),'general','spreadsheet','hackleaf-sample-v1-current-'||i); end if;
   insert into public.follow_ups(donor_id,owner_id,title,due_on,kind) values(donor_id,owner,'Sample: review the relationship and next update',today+(i-2),'check_in');
   insert into public.communications(donor_id,actor_id,channel,summary,occurred_at,origin) values(donor_id,owner,'meeting','Sample: fictional demonstration conversation; no actual outreach occurred.',now()-make_interval(days=>i*3),'manual_log');
   if i in (2,4) then insert into public.outreach_drafts(donor_id,channel,subject,body,state) values(donor_id,'email','Sample funder update draft','Sample draft for demonstration only. Replace with reviewed, verified information before sending.','draft'); end if;
 end loop;
 insert into private.hackleaf_sample_batches(id) values('labeled-samples-v1');
end $$;
commit;
