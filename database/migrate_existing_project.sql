-- ===========================================================================
-- MIGRATION: original schema  ->  v2 (Supabase Auth `profiles` + RLS)
--
-- For a project that already has the ORIGINAL tables applied (schools, users,
-- students, ffw_uploads, clearmath_uploads, teacher_marks, attendance_log,
-- assessments, alerts, audit_log) with NO row-level security.
--
-- Verified state before running (all tables empty, 0 rows), so the drops below
-- lose no data. If you have real data, back it up first — this is destructive.
--
-- Run the WHOLE file once in the Supabase SQL Editor.
-- It is wrapped in a transaction: if anything fails, nothing changes.
-- ===========================================================================

BEGIN;

-- 1) Remove the old (RLS-less, integer-`users`) schema. CASCADE clears FKs and
--    any dependent policies. `profiles` is included in case a partial run exists.
DROP TABLE IF EXISTS
    audit_log, alerts, assessments, attendance_log, teacher_marks,
    clearmath_uploads, ffw_uploads, students, profiles, users, schools
    CASCADE;

DROP FUNCTION IF EXISTS public.auth_role() CASCADE;
DROP FUNCTION IF EXISTS public.auth_school() CASCADE;
DROP FUNCTION IF EXISTS public.is_all_school_admin() CASCADE;

-- 2) Install the v2 schema (identical to database/schema.sql).
-- ---------------------------------------------------------------------------
-- Core reference tables
-- ---------------------------------------------------------------------------

CREATE TABLE schools (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Replaces Appendix A `users`. One row per Supabase auth user.
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'instructional_leader', 'programme_manager', 'stmc_team', 'school_admin', 'teacher'
    )),
    school_id INTEGER REFERENCES schools(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    last_login TIMESTAMPTZ
);

CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    school_id INTEGER REFERENCES schools(id),
    teacher_id UUID REFERENCES profiles(id),
    grade INTEGER DEFAULT 7,
    zlc_id VARCHAR(50) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Programme upload tables
-- ---------------------------------------------------------------------------

CREATE TABLE ffw_uploads (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    upload_date DATE,
    uploaded_by UUID REFERENCES profiles(id),
    protocol VARCHAR(100),
    completion_pct DECIMAL(5,2),
    points INTEGER,
    sessions INTEGER,
    last_login DATE,
    level_gain DECIMAL(5,2)
);

CREATE TABLE clearmath_uploads (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    upload_date DATE,
    uploaded_by UUID REFERENCES profiles(id),
    topic VARCHAR(100),
    score_pct DECIMAL(5,2),
    mastery_pct DECIMAL(5,2),
    completion_pct DECIMAL(5,2),
    last_activity DATE
);

-- ---------------------------------------------------------------------------
-- Teacher-entered data
-- ---------------------------------------------------------------------------

CREATE TABLE teacher_marks (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    teacher_id UUID REFERENCES profiles(id),
    subject VARCHAR(100),
    assessment_name VARCHAR(255),
    date DATE,
    score DECIMAL(5,2),
    notes TEXT
);

CREATE TABLE attendance_log (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    teacher_id UUID REFERENCES profiles(id),
    session_date DATE,
    status VARCHAR(20) CHECK (status IN ('present', 'absent', 'late')),
    engagement_rating INTEGER CHECK (engagement_rating BETWEEN 1 AND 3),
    notes TEXT
);

CREATE TABLE assessments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    tool_name VARCHAR(50),
    pre_score DECIMAL(5,2),
    current_score DECIMAL(5,2),
    target_score DECIMAL(5,2),
    assessment_date DATE
);

-- ---------------------------------------------------------------------------
-- Alerts & audit
-- ---------------------------------------------------------------------------

CREATE TABLE alerts (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id),
    alert_type VARCHAR(100),
    trigger_value VARCHAR(255),
    severity VARCHAR(20) CHECK (severity IN ('amber', 'red')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    action_type VARCHAR(100),
    table_affected VARCHAR(100),
    record_id INTEGER,
    timestamp TIMESTAMPTZ DEFAULT now(),
    details JSONB
);

-- ---------------------------------------------------------------------------
-- Row-Level Security (RLS) — this is what closes the anon-read exposure.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS TEXT LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.auth_school()
RETURNS INTEGER LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT school_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_all_school_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
    SELECT public.auth_role() IN ('instructional_leader', 'programme_manager', 'stmc_team');
$$;

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools          ENABLE ROW LEVEL SECURITY;
ALTER TABLE students         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ffw_uploads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE clearmath_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_marks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log        ENABLE ROW LEVEL SECURITY;

CREATE POLICY schools_read ON schools FOR SELECT TO authenticated USING (true);

CREATE POLICY profiles_self ON profiles FOR SELECT TO authenticated
    USING (id = auth.uid());
CREATE POLICY profiles_self_update ON profiles FOR UPDATE TO authenticated
    USING (id = auth.uid());

CREATE POLICY students_read ON students FOR SELECT TO authenticated
    USING (public.is_all_school_admin() OR school_id = public.auth_school());

CREATE POLICY ffw_read ON ffw_uploads FOR SELECT TO authenticated
    USING (public.is_all_school_admin() OR student_id IN (
        SELECT id FROM students WHERE school_id = public.auth_school()));

CREATE POLICY clearmath_read ON clearmath_uploads FOR SELECT TO authenticated
    USING (public.is_all_school_admin() OR student_id IN (
        SELECT id FROM students WHERE school_id = public.auth_school()));

CREATE POLICY marks_read ON teacher_marks FOR SELECT TO authenticated
    USING (public.is_all_school_admin() OR student_id IN (
        SELECT id FROM students WHERE school_id = public.auth_school()));

CREATE POLICY attendance_read ON attendance_log FOR SELECT TO authenticated
    USING (public.is_all_school_admin() OR student_id IN (
        SELECT id FROM students WHERE school_id = public.auth_school()));

CREATE POLICY assessments_read ON assessments FOR SELECT TO authenticated
    USING (public.is_all_school_admin() OR student_id IN (
        SELECT id FROM students WHERE school_id = public.auth_school()));

CREATE POLICY alerts_read ON alerts FOR SELECT TO authenticated
    USING (public.is_all_school_admin() OR student_id IN (
        SELECT id FROM students WHERE school_id = public.auth_school()));

-- audit_log has RLS enabled with no policy = service-key-only by design.

-- ---------------------------------------------------------------------------
-- Seed sample data
-- ---------------------------------------------------------------------------

INSERT INTO schools (name, code) VALUES
('Holy Trinity High School', 'HTHS'),
('Newell High School', 'NHS'),
('St. Mary''s College', 'SMC'),
('Pembroke Hall High School', 'PHHS');

COMMIT;

-- ===========================================================================
-- After this runs:
--   1) Create a login:  Authentication -> Users -> Add user (email + password).
--   2) Add their profile row (swap in the new user's UUID + a role):
--        insert into profiles (id, email, role, school_id)
--        values ('<uuid>', 'you@zlc.org', 'instructional_leader',
--                (select id from schools where code = 'HTHS'));
--      (role 'instructional_leader' lands on the Administrator dashboard;
--       'teacher' lands on the Teacher dashboard.)
--   3) Sign in at the app with that email/password.
-- ===========================================================================
