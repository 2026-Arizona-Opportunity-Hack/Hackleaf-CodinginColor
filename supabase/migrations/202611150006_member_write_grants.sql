-- The existing admin-only RLS policies still authorize every row change.
-- A policy without the underlying SQL grant cannot enable the approval UI.
grant insert, update on public.members to authenticated;
