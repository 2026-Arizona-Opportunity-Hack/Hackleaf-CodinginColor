-- Restore exclusive relationships after 202611150002_donors_member_read.sql.
-- Apply in the existing Supabase project as its owner.
begin;
drop policy if exists member_read_donors on public.donors;
drop policy if exists owned_donors on public.donors;
drop policy if exists owned_donor_create on public.donors;
create policy owned_donors on public.donors for select to authenticated
  using ((select private.is_member()) and owner_id = (select auth.uid()));
-- Existing admin_all permits active admins to read/manage every relationship.
-- Child-table owned_read policies follow the now-scoped donors query.
create policy owned_donor_create on public.donors for insert to authenticated
  with check ((select private.is_member()) and owner_id = (select auth.uid()));
notify pgrst, 'reload schema';
commit;
