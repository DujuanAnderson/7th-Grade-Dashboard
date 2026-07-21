-- 7th Grade Academy — allow all-school admins to create profile rows
-- ===========================================================================
-- The "Add User" action in the Manage Users panel signs up a new Supabase auth
-- user in the browser, then inserts its matching public.profiles row as the
-- signed-in admin. That INSERT needs an RLS policy — without one it is denied
-- and the new account is left with an auth user but no profile (so no role).
--
-- Run once in the Supabase SQL Editor. Idempotent. Requires the helper
-- functions from 002_rls_policies.sql / ALL_POLICIES.sql.
--
-- ALSO REQUIRED for immediate logins: in the Supabase dashboard go to
-- Authentication → Providers → Email and turn OFF "Confirm email", so an
-- admin-created account can sign in right away with the password you set.
-- ===========================================================================

BEGIN;

DROP POLICY IF EXISTS profiles_admin_insert ON profiles;

CREATE POLICY profiles_admin_insert ON profiles FOR INSERT TO authenticated
    WITH CHECK (public.is_all_school_admin());

COMMIT;
