-- Bootstrap users for a fresh logbook_db schema
-- Run this AFTER schema.sql
-- Default password for all seeded users: Passw0rd!

BEGIN;

SET search_path TO public;

DO $$
BEGIN
  IF to_regclass('public.users') IS NULL THEN
    RAISE EXCEPTION 'Table public.users not found. Run database/schema.sql in logbook_db first.';
  END IF;
  IF to_regclass('public.institutions') IS NULL THEN
    RAISE EXCEPTION 'Table public.institutions not found. Run database/schema.sql in logbook_db first.';
  END IF;
END;
$$;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) Ensure at least one institution exists for student/host assignment
INSERT INTO institutions (name, address, contact_person, contact_email, contact_phone)
VALUES (
  'Kenya Revenue Authority',
  'Times Tower, Nairobi',
  'Main Liaison',
  'liaison@kra.go.ke',
  '0712345678'
)
ON CONFLICT DO NOTHING;

-- 2) Create users (passwords hashed with bcrypt via pgcrypto)
INSERT INTO users (email, password_hash, phone_number, role, full_name, must_change_password)
VALUES
  ('admin@attachmenthub.local', crypt('Passw0rd!', gen_salt('bf')), '0712345601', 'admin', 'System Administrator', FALSE),
  ('faculty@attachmenthub.local', crypt('Passw0rd!', gen_salt('bf')), '0712345602', 'faculty_supervisor', 'Faculty Supervisor', FALSE),
  ('host@attachmenthub.local', crypt('Passw0rd!', gen_salt('bf')), '0712345603', 'host_supervisor', 'Host Supervisor', FALSE),
  ('student@attachmenthub.local', crypt('Passw0rd!', gen_salt('bf')), '0712345604', 'student', 'Student User', FALSE)
ON CONFLICT (email) DO NOTHING;

-- 3) Link role profile tables
INSERT INTO administrators (user_id, access_level)
SELECT u.id, 'coordinator'
FROM users u
WHERE u.email = 'admin@attachmenthub.local'
  AND NOT EXISTS (
    SELECT 1 FROM administrators a WHERE a.user_id = u.id
  );

INSERT INTO faculty_supervisors (user_id, department, faculty)
SELECT u.id, 'Computing', 'Computing and Engineering Sciences'
FROM users u
WHERE u.email = 'faculty@attachmenthub.local'
  AND NOT EXISTS (
    SELECT 1 FROM faculty_supervisors fs WHERE fs.user_id = u.id
  );

INSERT INTO host_supervisors (user_id, institution_id, department, job_title)
SELECT
  u.id,
  i.id,
  'Technology',
  'Senior Developer'
FROM users u
JOIN institutions i ON i.name = 'Kenya Revenue Authority'
WHERE u.email = 'host@attachmenthub.local'
  AND NOT EXISTS (
    SELECT 1 FROM host_supervisors hs
    WHERE hs.user_id = u.id AND hs.institution_id = i.id
  );

INSERT INTO students (user_id, institution_id, host_supervisor_id, faculty_supervisor_id, reg_number, programme)
SELECT
  su.id,
  i.id,
  hs.id,
  fs.id,
  '138701',
  'WBL'
FROM users su
JOIN institutions i ON i.name = 'Kenya Revenue Authority'
LEFT JOIN host_supervisors hs ON hs.user_id = (SELECT id FROM users WHERE email = 'host@attachmenthub.local')
LEFT JOIN faculty_supervisors fs ON fs.user_id = (SELECT id FROM users WHERE email = 'faculty@attachmenthub.local')
WHERE su.email = 'student@attachmenthub.local'
  AND NOT EXISTS (
    SELECT 1 FROM students s WHERE s.user_id = su.id
  );

COMMIT;

-- Quick verification
SELECT email, role, full_name FROM users ORDER BY role, email;
SELECT reg_number, programme FROM students ORDER BY reg_number;
