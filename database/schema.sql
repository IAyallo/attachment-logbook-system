-- ============================================================
-- Web-Based Attachment Logbook System
-- Database Schema — PostgreSQL 18
-- Strathmore University | ICS 3 Group E
-- Authors: Ishmael Ayallo (138615) · Patrick Mungai (191231)
-- Supervisor: Daniel Machanje
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('student', 'host_supervisor', 'faculty_supervisor', 'admin');

CREATE TYPE entry_status AS ENUM ('draft', 'pending_sync', 'submitted', 'approved', 'rejected', 'archived');

CREATE TYPE sync_status AS ENUM ('synced', 'pending', 'failed');

CREATE TYPE supervisor_type AS ENUM ('host', 'faculty');

CREATE TYPE programme_type AS ENUM ('WBL', 'SBL');

CREATE TYPE log_category_type AS ENUM (
    'WBL Backend Development',
    'WBL Frontend Development',
    'WBL QA & Testing',
    'WBL Documentation & Reporting',
    'WBL Workplace Professionalism',
    'WBL Project Management',
    'SBL Community Engagement',
    'SBL Service Delivery',
    'SBL Stakeholder Communication',
    'SBL Civic Reflection',
    'SBL Social Impact Analysis',
    'SBL Documentation & Reporting'
);

-- ============================================================
-- 1. USERS (base table — all roles inherit from here)
-- ============================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            user_role NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 2. INSTITUTIONS
-- ============================================================

CREATE TABLE institutions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    address         TEXT,
    contact_person  VARCHAR(100),
    contact_email   VARCHAR(100),
    registered_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. HOST SUPERVISORS
-- ============================================================

CREATE TABLE host_supervisors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
    department      VARCHAR(100),
    job_title       VARCHAR(100)
);

-- ============================================================
-- 4. FACULTY SUPERVISORS
-- ============================================================

CREATE TABLE faculty_supervisors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department      VARCHAR(100),
    faculty         VARCHAR(100)
);

-- ============================================================
-- 5. ADMINISTRATORS
-- ============================================================

CREATE TABLE administrators (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_level    VARCHAR(50) NOT NULL DEFAULT 'coordinator'
);

-- ============================================================
-- 6. STUDENTS
-- ============================================================

CREATE TABLE students (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_id      UUID REFERENCES institutions(id) ON DELETE SET NULL,
    host_supervisor_id  UUID REFERENCES host_supervisors(id) ON DELETE SET NULL,
    faculty_supervisor_id UUID REFERENCES faculty_supervisors(id) ON DELETE SET NULL,
    reg_number          VARCHAR(20) NOT NULL UNIQUE,
    programme           programme_type NOT NULL,
    attachment_start    DATE,
    attachment_end      DATE
);

-- ============================================================
-- 7. LOGBOOK ENTRIES
-- ============================================================

CREATE TABLE logbook_entries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    approved_by     UUID REFERENCES host_supervisors(id) ON DELETE SET NULL,
    title           VARCHAR(150) NOT NULL,
    description     TEXT NOT NULL,
    category        log_category_type NOT NULL DEFAULT 'WBL Workplace Professionalism',
    hours_logged    DECIMAL(4,2) NOT NULL CHECK (hours_logged > 0),
    status          entry_status NOT NULL DEFAULT 'draft',
    sync_status     sync_status NOT NULL DEFAULT 'pending',
    entry_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    submitted_at    TIMESTAMP,
    approved_at     TIMESTAMP,
    feedback        TEXT,
    marks           DECIMAL(5,2) CHECK (marks >= 0 AND marks <= 100)
);

-- ============================================================
-- 8. ASSESSMENT FORMS
-- ============================================================

CREATE TABLE assessment_forms (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id              UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    host_supervisor_id      UUID REFERENCES host_supervisors(id) ON DELETE SET NULL,
    faculty_supervisor_id   UUID REFERENCES faculty_supervisors(id) ON DELETE SET NULL,
    form_type               VARCHAR(50) NOT NULL,        -- 'mid_term' | 'final'
    host_marks              DECIMAL(5,2) CHECK (host_marks >= 0 AND host_marks <= 100),
    faculty_marks           DECIMAL(5,2) CHECK (faculty_marks >= 0 AND faculty_marks <= 100),
    host_comments           TEXT,
    faculty_comments        TEXT,
    status                  entry_status NOT NULL DEFAULT 'submitted',
    submitted_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    approved_at             TIMESTAMP
);

-- ============================================================
-- 9. OFFLINE SYNC QUEUE
-- ============================================================

CREATE TABLE offline_sync_queue (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    payload         JSONB NOT NULL,             -- full entry payload cached offline
    status          sync_status NOT NULL DEFAULT 'pending',
    retry_count     INT NOT NULL DEFAULT 0,
    queued_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    synced_at       TIMESTAMP
);

-- ============================================================
-- 10. AUDIT TRAILS
-- ============================================================

CREATE TABLE audit_trails (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id        UUID NOT NULL REFERENCES logbook_entries(id) ON DELETE CASCADE,
    actor_id        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action          VARCHAR(100) NOT NULL,       -- e.g. 'submitted', 'approved', 'rejected'
    change_detail   TEXT,
    performed_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES (performance)
-- ============================================================

-- Speed up lookups of entries by student
CREATE INDEX idx_logbook_entries_student_id ON logbook_entries(student_id);

-- Speed up filtering entries by status (e.g. pending approval queue)
CREATE INDEX idx_logbook_entries_status ON logbook_entries(status);

-- Speed up sync queue processing
CREATE INDEX idx_offline_sync_queue_status ON offline_sync_queue(status);

-- Speed up audit trail lookups by entry
CREATE INDEX idx_audit_trails_entry_id ON audit_trails(entry_id);

-- Speed up student lookups by reg number
CREATE INDEX idx_students_reg_number ON students(reg_number);

-- ============================================================
-- UPDATED_AT TRIGGER (auto-update timestamp on users)
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- END OF SCHEMA
-- ============================================================
