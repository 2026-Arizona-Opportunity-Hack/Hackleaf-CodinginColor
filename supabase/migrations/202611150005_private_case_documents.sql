begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('case-documents','case-documents',false,5242880,array['application/pdf','image/png','image/jpeg'])
on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;
create function private.case_document_referenced(object_name text) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.case_workspaces w,
    jsonb_array_elements(w.data->'documents') d
    where w.id='coding-in-color' and object_name='coding-in-color/'||(d->>'createdBy')||'/'||(d->>'id'));
$$;
revoke all on function private.case_document_referenced(text) from public,anon;
grant execute on function private.case_document_referenced(text) to authenticated;
create policy case_document_read on storage.objects for select to authenticated using (
  bucket_id='case-documents' and split_part(name,'/',1)='coding-in-color'
  and (select private.is_member()) and (private.case_document_referenced(name)
    or split_part(name,'/',2)=(select auth.uid())::text or (select private.is_admin()))
);
create policy case_document_upload on storage.objects for insert to authenticated with check (
  bucket_id='case-documents' and split_part(name,'/',1)='coding-in-color'
  and split_part(name,'/',2)=(select auth.uid())::text and (select private.is_member())
  and name ~ '^coding-in-color/[0-9a-f-]{36}/[0-9a-f-]{36}$'
);
create policy case_document_delete on storage.objects for delete to authenticated using (
  bucket_id='case-documents' and split_part(name,'/',1)='coding-in-color'
  and (select private.is_member()) and ((select private.is_admin()) or
    (split_part(name,'/',2)=(select auth.uid())::text and not private.case_document_referenced(name)))
);
commit;
