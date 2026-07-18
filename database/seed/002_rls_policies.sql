-- 7th Grade Academy — RLS helper functions + read policies (standalone)
-- ===========================================================================
-- The tables have RLS ENABLED but (in this database) the policies were never
-- created, so every authenticated read is denied and the dashboards show
-- "No data to display". This file installs exactly the RLS section from
-- schema.sql. It is idempotent — safe to run on a live, seeded database.
--
-- Run this once in the Supabase SQL Editor of project mxvwulstyvpmwzotends.
-- ===========================================================================

BEGIN;

-- Helpers: read the calling user's role / school from their profile.
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

-- Make sure RLS is on (no-op if already enabled).
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools           ENABLE ROW LEVEL SECURITY;
ALTER TABLE students          ENABLE ROW LEVEL SECURITY;
ALTER TABLE ffw_uploads       ENABLE ROW LEVEL SECURITY;
ALTER TABLE clearmath_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_marks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_log    ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log         ENABLE ROW LEVEL SECURITY;

-- Drop-then-create so this is re-runnable.
DROP POLICY IF EXISTS schools_read         ON schools;
DROP POLICY IF EXISTS profiles_self        ON profiles;
DROP POLICY IF EXISTS profiles_self_update ON profiles;
DROP POLICY IF EXISTS students_read        ON students;
DROP POLICY IF EXISTS ffw_read             ON ffw_uploads;
DROP POLICY IF EXISTS clearmath_read       ON clearmath_uploads;
DROP POLICY IF EXISTS marks_read           ON teacher_marks;
DROP POLICY IF EXISTS attendance_read      ON attendance_log;
DROP POLICY IF EXISTS assessments_read     ON assessments;
DROP POLICY IF EXISTS alerts_read          ON alerts;

-- Everyone signed in can read the list of schools.
CREATE POLICY schools_read ON schools FOR SELECT TO authenticated USING (true);

-- Users can read/update their own profile.
CREATE POLICY profiles_self ON profiles FOR SELECT TO authenticated
    USING (id = auth.uid());
CREATE POLICY profiles_self_update ON profiles FOR UPDATE TO authenticated
    USING (id = auth.uid());

-- Students: all-school admins see everyone; school-scoped users see own school.
CREATE POLICY students_read ON students FOR SELECT TO authenticated
    USING (public.is_all_school_admin() OR school_id = public.auth_school());

-- Programme/teacher data: visible when the parent student is in scope.
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

COMMIT;

-- Verify (run as a signed-in user, not here): schools should return 4 rows,
-- a teacher should see 12 students, an all-school admin all 42.
