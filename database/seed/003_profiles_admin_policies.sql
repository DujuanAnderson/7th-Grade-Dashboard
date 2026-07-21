-- 7th Grade Academy — profile management policies for all-school admins
-- ===========================================================================
-- Adds the RLS policies the Administrator "Manage Users" panel relies on.
-- Out of the box `profiles` only lets a user read/update their OWN row, so an
-- admin cannot list, re-role, re-assign, or remove other accounts. These
-- policies grant those operations to all-school admins only
-- (instructional_leader / programme_manager / stmc_team) — school-scoped roles
-- and teachers are unaffected and still see just their own row.
--
-- Safe because is_all_school_admin() → auth_role() is SECURITY DEFINER and
-- reads profiles with RLS bypassed, so there is no policy recursion.
--
-- Run once in the Supabase SQL Editor. Idempotent (drop-then-create).
-- Requires 002_rls_policies.sql (defines the helper functions) to have run.
-- ===========================================================================

BEGIN;

DROP POLICY IF EXISTS profiles_admin_read   ON profiles;
DROP POLICY IF EXISTS profiles_admin_update ON profiles;
DROP POLICY IF EXISTS profiles_admin_delete ON profiles;

-- All-school admins can read every profile (the user roster).
CREATE POLICY profiles_admin_read ON profiles FOR SELECT TO authenticated
    USING (public.is_all_school_admin());

-- All-school admins can change any profile's role / school scope.
CREATE POLICY profiles_admin_update ON profiles FOR UPDATE TO authenticated
    USING (public.is_all_school_admin())
    WITH CHECK (public.is_all_school_admin());

-- All-school admins can remove a profile row (revokes app access). Removing the
-- underlying Supabase auth user still requires the service key, server-side.
CREATE POLICY profiles_admin_delete ON profiles FOR DELETE TO authenticated
    USING (public.is_all_school_admin());

COMMIT;

-- Verify (run as an all-school admin): `select count(*) from profiles;` should
-- return every account; as a teacher it should still return 1.
