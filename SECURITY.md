# Security

## Secret handling

- **Never commit secrets.** All keys live in `.env` files, which are gitignored.
  Only `*.env.example` (placeholders) belong in the repo.
- **`SUPABASE_SERVICE_KEY` bypasses Row-Level Security** — it is server-side only.
  Never put it in the frontend, a client bundle, or any committed file.
- The frontend uses the public **anon** key, which is safe to ship *only because*
  RLS is enabled on every table (see `database/schema.sql`). Keep it that way.

## Known exposure — action required

An earlier version of this repository committed live credentials to its git
history:

- `backend/.env` — a Supabase **service_role** key
- `backend/7th-grade-dashboard/backend/.env.txt` — a Postgres connection string / password

These files have been removed and the working tree cleaned, and the `main` branch
was force-pushed to a clean history. **However, force-pushing does not erase the
old commits from GitHub** — they remain reachable by commit SHA (and in any forks
or caches) until garbage-collected. Treat the exposed credentials as permanently
compromised.

### Required remediation

1. **Rotate the Supabase `service_role` key** — Supabase dashboard →
   *Project Settings → API → Reset service_role key*. Update your local
   `backend/.env` with the new value.
2. **Rotate the database password** if the exposed connection string used one —
   *Project Settings → Database → Reset database password*.
3. To purge the old commits from GitHub entirely (not just unreference them),
   either delete and recreate the repository, or contact GitHub Support to clear
   cached views after the force-push. Rotation (steps 1–2) is the priority.

## Before production (per Technical Specification v1.0)

- Add write-side RLS policies and tighten teacher-cohort scoping (`schema.sql`).
- Enforce HTTPS/TLS, 30-minute session timeout, and bcrypt-only password storage
  (handled by Supabase Auth).
- Enable audit logging for all uploads, edits, and exports.
- Optional MFA toggle for admin-level accounts.

## Reporting a vulnerability

Report suspected security issues privately to the project owner (Zeal Learning
Center) rather than opening a public issue.
