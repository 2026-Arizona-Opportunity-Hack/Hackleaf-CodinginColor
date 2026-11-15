-- Add date_of_birth and phone to donors table (P0 registration fields)
ALTER TABLE donors
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS phone        text;

ALTER TABLE donors
  ADD CONSTRAINT donors_phone_check
  CHECK (phone IS NULL OR (length(phone) >= 7 AND length(phone) <= 20));
