-- Allow admins to insert and update member rows (staff approval workflow)
CREATE POLICY "admin_insert_members"
  ON public.members
  FOR INSERT
  TO authenticated
  WITH CHECK (private.is_admin());

CREATE POLICY "admin_update_members"
  ON public.members
  FOR UPDATE
  TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());
