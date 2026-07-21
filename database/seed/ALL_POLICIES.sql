-- 7th Grade Academy — install EVERY RLS policy in one run.
-- ===========================================================================
-- Symptom this fixes: an authenticated user (even an admin) sees no students
-- and no user roster, because the tables have RLS ENABLED but the policies
-- were never created — so every read is denied.
--
-- This is the union of 002_rls_policies.sql (helpers + read policies) and
-- 003_profiles_admin_policies.sql (admin user management). It is fully
-- idempotent (drop-then-create). Paste the WHOLE file into the Supabase SQL
-- Editor of your project and Run. Safe to re-run.
--
-- After running, sign in with an ALL-SCHOOL admin account to see everything:
--   leader@zlc.demo / manager@zlc.demo / stmc@zlc.demo   (password: ZLCdemo!2026)
-- A school_admin or teacher account is scoped to ONE school by design.
-- ===========================================================================

BEGIN;

-- --- Helper functions ------------------------------------------------------
-- SECURITY DEFINER so they read profiles with RLS bypassed (no recursion).
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

-- --- Ensure RLS is on ------------------------------------------------------
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

-- --- Drop-then-create (re-runnable) ---------------------------------------
DROP POLICY IF EXISTS schools_read          ON schools;
DROP POLICY IF EXISTS profiles_self         ON profiles;
DROP POLICY IF EXISTS profiles_self_update  ON profiles;
DROP POLICY IF EXISTS profiles_admin_read   ON profiles;
DROP POLICY IF EXISTS profiles_admin_insert ON profiles;
DROP POLICY IF EXISTS profiles_admin_update ON profiles;
DROP POLICY IF EXISTS profiles_admin_delete ON profiles;
DROP POLICY IF EXISTS students_read         ON students;
DROP POLICY IF EXISTS ffw_read              ON ffw_uploads;
DROP POLICY IF EXISTS clearmath_read        ON clearmath_uploads;
DROP POLICY IF EXISTS marks_read            ON teacher_marks;
DROP POLICY IF EXISTS attendance_read       ON attendance_log;
DROP POLICY IF EXISTS assessments_read      ON assessments;
DROP POLICY IF EXISTS alerts_read           ON alerts;

-- --- Schools ---------------------------------------------------------------
CREATE POLICY schools_read ON schools FOR SELECT TO authenticated USING (true);

-- --- Profiles --------------------------------------------------------------
-- Everyone can read/update their own row.
CREATE POLICY profiles_self ON profiles FOR SELECT TO authenticated
    USING (id = auth.uid());
CREATE POLICY profiles_self_update ON profiles FOR UPDATE TO authenticated
    USING (id = auth.uid());
-- All-school admins manage every account (the "Manage Users" panel).
CREATE POLICY profiles_admin_read ON profiles FOR SELECT TO authenticated
    USING (public.is_all_school_admin());
CREATE POLICY profiles_admin_insert ON profiles FOR INSERT TO authenticated
    WITH CHECK (public.is_all_school_admin());
CREATE POLICY profiles_admin_update ON profiles FOR UPDATE TO authenticated
    USING (public.is_all_school_admin()) WITH CHECK (public.is_all_school_admin());
CREATE POLICY profiles_admin_delete ON profiles FOR DELETE TO authenticated
    USING (public.is_all_school_admin());

-- --- Students + related data ----------------------------------------------
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

COMMIT;

-- --- Verify ----------------------------------------------------------------
-- As service role (here) this bypasses RLS, so these just confirm data exists:
--   select count(*) from profiles;   -- expect your accounts (>= 5 for demo)
--   select count(*) from students;   -- expect 42 for the demo seed
-- Then sign in to the app as leader@zlc.demo and you should see all schools,
-- all students, and the full roster in Manage Users.
