-- 7th Grade Academy — login schema: one sign-in per role
-- ===========================================================================
-- Creates a Supabase Auth user AND its matching public.profiles row for each
-- of the five roles in the schema, so every access level can be tested with a
-- real email/password login. RLS then scopes what each one sees.
--
-- Run this in the Supabase SQL Editor (service role — bypasses RLS). It is
-- idempotent: existing users are reused, profiles are upserted. Requires the
-- schools to exist already (schema.sql seeds them).
--
--   Role                  | Email               | Scope (school_id) | Sees
--   ----------------------|---------------------|-------------------|--------------
--   instructional_leader  | leader@zlc.demo     | all schools       | all 42
--   programme_manager     | manager@zlc.demo    | all schools       | all 42
--   stmc_team             | stmc@zlc.demo       | all schools       | all 42
--   school_admin          | admin@zlc.demo      | Holy Trinity (1)  | 12
--   teacher               | teacher@zlc.demo    | Holy Trinity (1)  | 12
--
--   Password for ALL demo accounts:  ZLCdemo!2026
--   ^ change it below before using anywhere real.
-- ===========================================================================

-- Password hashing helpers (Supabase ships pgcrypto in the extensions schema).
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  demo_password text := 'ZLCdemo!2026';
  r record;
  uid uuid;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('leader@zlc.demo',  'instructional_leader', NULL::int),
      ('manager@zlc.demo', 'programme_manager',    NULL::int),
      ('stmc@zlc.demo',    'stmc_team',            NULL::int),
      ('admin@zlc.demo',   'school_admin',         1),
      ('teacher@zlc.demo', 'teacher',              1)
    ) AS t(email, role, school_id)
  LOOP
    -- Reuse an existing auth user with this email if one is already present.
    SELECT id INTO uid FROM auth.users WHERE email = r.email;

    IF uid IS NULL THEN
      uid := gen_random_uuid();

      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data, is_super_admin,
        confirmation_token, recovery_token, email_change_token_new, email_change
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
        r.email, extensions.crypt(demo_password, extensions.gen_salt('bf')),
        now(), now(), now(),
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        jsonb_build_object('role', r.role),
        false,
        '', '', '', ''
      );

      -- GoTrue requires a matching identity row for email/password logins.
      INSERT INTO auth.identities (
        provider_id, user_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        uid::text, uid,
        jsonb_build_object('sub', uid::text, 'email', r.email, 'email_verified', true),
        'email', now(), now(), now()
      );
    ELSE
      -- Keep the password in sync on re-run so the credentials above always work.
      UPDATE auth.users
         SET encrypted_password = extensions.crypt(demo_password, extensions.gen_salt('bf')),
             raw_user_meta_data  = jsonb_build_object('role', r.role),
             email_confirmed_at  = COALESCE(email_confirmed_at, now()),
             updated_at          = now()
       WHERE id = uid;
    END IF;

    -- Application-level profile (role + school scope used by the RLS helpers).
    INSERT INTO public.profiles (id, email, role, school_id)
    VALUES (uid, r.email, r.role, r.school_id)
    ON CONFLICT (id) DO UPDATE
      SET email     = EXCLUDED.email,
          role      = EXCLUDED.role,
          school_id = EXCLUDED.school_id;
  END LOOP;
END $$;

-- Verify:
--   select p.email, p.role, p.school_id from public.profiles p order by p.role;
