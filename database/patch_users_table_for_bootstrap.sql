-- Patch older users table definitions to match current backend expectations.
-- Run this in logbook_db before bootstrap_users.sql if needed.

BEGIN;

SET search_path TO public;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS full_name VARCHAR(150);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

-- Make phone nullable to support register flow variants that do not always provide it.
ALTER TABLE users
  ALTER COLUMN phone_number DROP NOT NULL;

COMMIT;

SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
  AND column_name IN ('full_name', 'must_change_password', 'updated_at')
ORDER BY column_name;
