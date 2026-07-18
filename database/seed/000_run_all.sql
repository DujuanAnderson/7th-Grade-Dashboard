-- 7th Grade Academy — run ALL seed data in one shot.
--
-- Prerequisite: schema.sql has been applied (tables + RLS + the 4 schools).
-- This file wipes the data tables and reloads them from the per-table seeds,
-- so it is safe to re-run. Paste the WHOLE file into the Supabase SQL Editor,
-- OR run the individual 0NN_*.sql files in numeric order.
--
-- The Supabase SQL Editor cannot \include other files, so the statements below
-- are inlined by copy order. If you prefer, open each file 010→070 in turn.

BEGIN;

-- Ensure the reference schools exist (students FK to schools(id)).
INSERT INTO schools (id, name, code) VALUES
  (1, 'Holy Trinity High School',    'HTHS'),
  (2, 'Newell High School',          'NHS'),
  (3, 'St. Mary''s College',         'SMC'),
  (4, 'Pembroke Hall High School',   'PHHS')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code;
SELECT setval('schools_id_seq', (SELECT MAX(id) FROM schools));

-- Clear existing rows (children first) so re-runs don't duplicate.
TRUNCATE alerts, assessments, attendance_log, teacher_marks,
         clearmath_uploads, ffw_uploads, students RESTART IDENTITY CASCADE;

-- Then paste the contents of, in order:
--   010_seed_students.sql
--   020_seed_ffw_uploads.sql
--   030_seed_clearmath_uploads.sql
--   040_seed_teacher_marks.sql
--   050_seed_attendance_log.sql
--   060_seed_assessments.sql
--   070_seed_alerts.sql

COMMIT;
