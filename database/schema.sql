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
    full_name       VARCHAR(150),
    phone_number    VARCHAR(30) CHECK (phone_number ~ '^07[0-9]{8}$'),
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
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
    contact_phone   VARCHAR(30) NOT NULL CHECK (contact_phone ~ '^07[0-9]{8}$'),
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
    institution_id      UUID NOT NULL REFERENCES institutions(id) ON DELETE RESTRICT,
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
-- 11. NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id        UUID REFERENCES users(id) ON DELETE SET NULL,
    type            VARCHAR(60) NOT NULL,
    title           VARCHAR(150) NOT NULL,
    message         TEXT NOT NULL,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    read_at         TIMESTAMP
);

-- ============================================================
-- 12. ATTACHMENT APPLICATIONS
-- ============================================================

CREATE TABLE attachment_applications (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id                  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course                      VARCHAR(150) NOT NULL,
    attachment_type             VARCHAR(50) NOT NULL,
    attachment_period           VARCHAR(120),
    start_date                  DATE NOT NULL,
    end_date                    DATE NOT NULL,
    hours_per_day               INTEGER NOT NULL CHECK (hours_per_day > 0 AND hours_per_day <= 24),
    days_per_week               JSONB NOT NULL DEFAULT '[]'::jsonb,
    institution_mode            VARCHAR(20) NOT NULL CHECK (institution_mode IN ('existing', 'new')),
    existing_institution_id     UUID REFERENCES institutions(id) ON DELETE SET NULL,
    organisation_name           VARCHAR(180),
    organisation_description    TEXT,
    organisation_country        VARCHAR(120),
    organisation_county         VARCHAR(120),
    organisation_constituency   VARCHAR(120),
    supervisor_name             VARCHAR(120) NOT NULL,
    supervisor_designation      VARCHAR(120) NOT NULL,
    supervisor_email            VARCHAR(255) NOT NULL,
    supervisor_phone            VARCHAR(30) NOT NULL CHECK (supervisor_phone ~ '^07[0-9]{8}$'),
    key_activities              JSONB NOT NULL DEFAULT '[]'::jsonb,
    skills_to_develop           JSONB NOT NULL DEFAULT '[]'::jsonb,
    training_opportunities      JSONB NOT NULL DEFAULT '[]'::jsonb,
    status                      VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes                 TEXT,
    reviewed_by                 UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at                 TIMESTAMP,
    approved_institution_id     UUID REFERENCES institutions(id) ON DELETE SET NULL,
    onboarded_host_supervisor_id UUID REFERENCES host_supervisors(id) ON DELETE SET NULL,
    created_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 13. STUDENT ATTACHMENT HISTORY (PREVIOUS ATTACHMENTS)
-- ============================================================

CREATE TABLE student_attachment_history (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id                  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    institution_id              UUID REFERENCES institutions(id) ON DELETE SET NULL,
    host_supervisor_id          UUID REFERENCES host_supervisors(id) ON DELETE SET NULL,
    attachment_start            DATE,
    attachment_end              DATE,
    attachment_type             VARCHAR(50),
    attachment_period           VARCHAR(120),
    hours_per_day               INTEGER,
    days_per_week               JSONB,
    organisation_name           VARCHAR(180),
    organisation_description    TEXT,
    organisation_country        VARCHAR(120),
    organisation_county         VARCHAR(120),
    organisation_constituency   VARCHAR(120),
    internship_objectives       JSONB,
    internship_skills           JSONB,
    internship_training_opportunities JSONB,
    host_supervisor_name        VARCHAR(120),
    host_supervisor_designation VARCHAR(120),
    host_supervisor_email       VARCHAR(255),
    host_supervisor_phone       VARCHAR(30),
    faculty_supervisor_name     VARCHAR(120),
    faculty_supervisor_email    VARCHAR(255),
    faculty_date_allocated      TIMESTAMP,
    host_score                  DECIMAL(5,2),
    faculty_score               DECIMAL(5,2),
    report_score                DECIMAL(5,2),
    total_grade                 DECIMAL(6,2),
    status_message              TEXT,
    status                      VARCHAR(20) NOT NULL CHECK (status IN ('halted', 'completed')),
    halt_reason                 TEXT,
    replaced_by_application_id  UUID REFERENCES attachment_applications(id) ON DELETE SET NULL,
    created_at                  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 14. COMPOSITE REPORTS
-- ============================================================

CREATE TABLE composite_reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id      UUID NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
    graded_by       UUID REFERENCES faculty_supervisors(id) ON DELETE SET NULL,
    file_path       TEXT NOT NULL,
    file_name       VARCHAR(255) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'rejected')),
    marks           DECIMAL(5,2) CHECK (marks >= 0 AND marks <= 50),
    faculty_comments TEXT,
    submitted_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    graded_at       TIMESTAMP
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

-- Speed up unread notification checks
CREATE INDEX idx_notifications_recipient_unread ON notifications(recipient_id, is_read, created_at DESC);

-- Speed up application review queues
CREATE INDEX idx_attachment_applications_status_created_at ON attachment_applications(status, created_at);
CREATE INDEX idx_attachment_applications_student_status ON attachment_applications(student_id, status);

-- Speed up previous attachment lookups per student
CREATE INDEX idx_student_attachment_history_student_created_at
ON student_attachment_history(student_id, created_at DESC);

-- Speed up student lookups by reg number
CREATE INDEX idx_students_reg_number ON students(reg_number);

-- Speed up composite report lookups by status and student
CREATE INDEX idx_composite_reports_status_submitted_at ON composite_reports(status, submitted_at DESC);

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
