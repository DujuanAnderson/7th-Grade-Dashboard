-- 7th Grade Academy — seed data: schools (reference table)
-- ===========================================================================
-- schema.sql seeds these too, but that file can't be re-run once the tables
-- exist. This standalone, idempotent insert lets you (re)load the four schools
-- on their own. Run this FIRST — profiles (005) and students (010) both have
-- foreign keys to schools(id), so those seeds fail if this table is empty.
-- ===========================================================================

INSERT INTO schools (id, name, code) VALUES
  (1, 'Holy Trinity High School',    'HTHS'),
  (2, 'Newell High School',          'NHS'),
  (3, 'St. Mary''s College',         'SMC'),
  (4, 'Pembroke Hall High School',   'PHHS')
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name, code = EXCLUDED.code;

-- Keep the SERIAL sequence ahead of the explicit ids we inserted.
SELECT setval('schools_id_seq', (SELECT MAX(id) FROM schools));
