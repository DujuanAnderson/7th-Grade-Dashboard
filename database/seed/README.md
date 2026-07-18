# Seed data

One SQL file per data category ("datapoint"), populating the tables the
Teacher and Administrator dashboards read through `getStudents()` /
`getAllStudents()`. The values are generated to mirror
`frontend/src/lib/mockData.ts`, so the live dashboard renders the same cohort
the demo mode does — 42 students across the four schools.

| File | Table | What it holds |
|------|-------|---------------|
| `001_seed_schools.sql`          | `schools`            | The 4 schools (idempotent; run before 005/010) |
| `002_rls_policies.sql`          | (all tables)         | RLS helper functions + read policies (idempotent) |
| `005_seed_logins.sql`           | `auth.users` + `profiles` | One login per role (all 5 access levels) |
| `010_seed_students.sql`         | `students`           | 42 pupils (ids 1–12 Holy Trinity, 200s/300s/400s the other schools) |
| `020_seed_ffw_uploads.sql`      | `ffw_uploads`        | Latest Fast ForWord login per student (protocol, completion %, last login) |
| `030_seed_clearmath_uploads.sql`| `clearmath_uploads`  | 6 weekly Clear Math mastery points per student → the mastery trend line |
| `040_seed_teacher_marks.sql`    | `teacher_marks`      | 4 subjects × 2 assessments per student |
| `050_seed_attendance_log.sql`   | `attendance_log`     | 8 sessions per student → attendance rate & streak |
| `060_seed_assessments.sql`      | `assessments`        | RPI pre / current / target (drives the reading band) |
| `070_seed_alerts.sql`           | `alerts`             | Threshold-triggered amber/red alerts |

## How to load

1. Apply `../schema.sql` first (creates tables, RLS, and the 4 schools).
2. Run `001_seed_schools.sql` — the four schools. **Required before 005/010**:
   `profiles.school_id` and `students.school_id` both FK to `schools(id)`, so
   those seeds fail if this table is empty. (Safe/idempotent even if schema.sql
   already seeded them.)
3. Run `005_seed_logins.sql` to create the per-role logins (see below).
4. Load the student data — in the Supabase SQL Editor either:
   - run the files `010` → `070` in order, **or**
   - run `000_run_all.sql` (ensures schools, then truncates + reloads the data
     tables; safe to re-run).

`005_seed_logins.sql` is independent of the data reload — `000_run_all.sql`
does **not** touch `auth.users` or `profiles`, so your logins survive a
re-seed.

`teacher_id` / `uploaded_by` are left `NULL` because those are FKs to
`profiles` (real Supabase Auth users) — none are needed for the dashboard's
read path.

## Logins (one per role)

The `students` read policy is `is_all_school_admin() OR school_id =
auth_school()`, so the anon key alone returns **nothing** — you must sign in as
a user that has a `profiles` row. `005_seed_logins.sql` creates one login for
every role so each access level is testable:

| Email | Role | Password | Sees |
|-------|------|----------|------|
| `leader@zlc.demo`  | `instructional_leader` | `ZLCdemo!2026` | all 42 (all schools) |
| `manager@zlc.demo` | `programme_manager`    | `ZLCdemo!2026` | all 42 (all schools) |
| `stmc@zlc.demo`    | `stmc_team`            | `ZLCdemo!2026` | all 42 (all schools) |
| `admin@zlc.demo`   | `school_admin`         | `ZLCdemo!2026` | 12 (Holy Trinity) |
| `teacher@zlc.demo` | `teacher`              | `ZLCdemo!2026` | 12 (Holy Trinity) |

Each entry is a real Supabase Auth user (in `auth.users`, with a login
identity) plus a matching `public.profiles` row. The file is idempotent and
re-syncs the password on re-run. **Change the password in the file before using
it anywhere real.**

To regenerate these files: `node gen_seed.mjs <output-dir>` (see the generator
kept in the change that introduced this folder).
