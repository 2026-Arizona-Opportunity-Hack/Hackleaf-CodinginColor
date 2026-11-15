-- Allow any active staff member (admin or board_member) to read all donors.
-- The previous owned_donors policy restricted board_members to donors they
-- personally own, which blocked them from seeing seeded or imported records.
DROP POLICY IF EXISTS "owned_donors" ON public.donors;

CREATE POLICY "member_read_donors"
  ON public.donors
  FOR SELECT
  TO authenticated
  USING (private.is_member());
