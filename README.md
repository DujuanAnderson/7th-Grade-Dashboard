# 7th Grade Academy Data Dashboard

Early-stage scaffold for the ZLC 7th Grade Academy Data Dashboard, targeting
Technical Specification v1.0 (June 2026). **This is a foundation, not a finished
product** — see status below.

## Stack
- **Frontend:** React 18 + Vite + Tailwind (CDN), Supabase JS client
- **Backend:** Node.js + Express, Supabase (Auth + Postgres)
- **Database:** PostgreSQL on Supabase (schema in `database/schema.sql`)

## Current status

**Built**
- ✅ Database schema for all core tables in Appendix A, reconciled to Supabase
  Auth (UUID `profiles` keyed to `auth.users`) with starter RLS policies
- ✅ Email/password login via Supabase Auth, **routed by role** (spec §3)
- ✅ **Teacher Dashboard (§6, §7):** cohort header, risk quick-stats, reading-band +
  class-mastery charts, filterable roster, full Student Profile Card
- ✅ **Upload Centre (§4, §6):** in-browser CSV/XLSX parser for Fast ForWord &
  Clear Math with field mapping, student matching, and a matched/unmatched/duplicate
  validation summary; partial-apply + upload history
- ✅ **Teacher data entry (§6):** bulk subject-mark entry + attendance/engagement log,
  writing back to the cohort (risk recomputes live)
- ✅ **Administrator Dashboard (§5):** global filters, four school summary cards,
  cross-school comparison charts (literacy benchmark, programme KPIs, FFW-vs-gain
  scatter), sortable KPI table, FFW-inactivity + low-mastery lists, student drill-down
- ✅ **Alerts & Notification System (§8):** rules engine evaluating the spec's
  thresholds (FFW inactivity, mastery drop/critical, upload overdue, at-risk,
  attendance, low assessment), a notification centre with severity + acknowledgement,
  and automatic resolution when a condition clears
- ✅ **Reporting & Export (§9):** Excel export (roster / raw data) and branded
  printable PDF reports (cross-school summary, per-student progress) with the
  ZLC header + "Zeal Learning Center | Confidential" footer
- ✅ **Demo mode** — runs with sample data and no external services (see below)
- ✅ Express API with `GET /api/students`

**Not yet built**
- ⬜ Real data pipeline behind the dashboards (uploads/edits update in-memory
  sample data; not yet persisted to Postgres) + server-side parser (spec §2).
  Ready to wire once the Supabase schema is applied.
- ⬜ Scheduled alert delivery by email + digest subscriptions (the *engine* is
  built; the cron + email transport are not) (spec §8)
- ⬜ MFA, session timeout, audit logging, write-side RLS, WCAG AA (spec §3, §11)

## Run it on your machine (demo mode — no setup)

The dashboards run standalone with sample data. No Supabase, no keys, no backend.

```bash
cd frontend
npm install
npm run dev        # opens http://localhost:5173
```

At the login screen (demo mode), pick **Teacher** or **Administrator**, then enter
**any** email/password:

- **Teacher** → cohort dashboard. Try the **Upload Centre** tab: drop
  `sample-data/ffw_sample.csv` or `sample-data/clearmath_sample.csv` to see the
  parser + validation summary (7 matched / 1 unmatched / 1 duplicate), then
  Confirm to apply. The **Data Entry** tab writes marks/attendance back to the cohort.
- **Administrator** → cross-school dashboard for all four schools, plus the
  **Reports & Export** panel (Cross-School PDF, Raw Data Excel).

The **🔔 bell** (top bar) opens the notification centre — acknowledge alerts, or
click a name to jump to that student. Any **Student Profile Card** has a
**Download report** button (branded PDF via the print dialog).

Data is badged "Sample data" — uploads/edits update the in-memory cohort for the
session but aren't persisted yet (that's the next phase).

## Run against real Supabase (optional)

Project: `mxvwulstyvpmwzotends`. In the Supabase dashboard:

1. **Rotate the leaked key** — *Project Settings → API → `service_role` → Reset*.
   (The old key was committed and must be considered compromised.)
2. **Create the schema** — *SQL Editor → New query* → paste all of
   `database/schema.sql` → Run. It relies on Supabase's built-in `auth.users`.
3. **Grab your keys** — *Project Settings → API*: copy the **Project URL**, the
   **anon public** key (frontend), and the freshly **rotated service_role** key (backend).
4. **Create at least one user** — *Authentication → Users → Add user*, then add a
   matching row in `profiles` (id = that auth user's UUID, a `role`, a `school_id`).

Then:
```bash
# Frontend — real Supabase Auth (demo role toggle disappears)
cd frontend
cp .env.example .env   # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev

# Backend (Express API)
cd backend
npm install
cp .env.example .env   # SUPABASE_URL + SUPABASE_SERVICE_KEY (the rotated one)
npm run dev            # http://localhost:5000
```

## Security notes

See [SECURITY.md](SECURITY.md) for the full policy and a **required key-rotation**
notice (earlier commits exposed a Supabase service key).

- Secrets live in `.env` files, which are gitignored. **Never commit them.**
- The `SUPABASE_SERVICE_KEY` bypasses RLS — server-side only.
- The frontend uses the public **anon** key; data is protected by the RLS
  policies in `schema.sql`, which are a starting point and need write-side
  policies and tighter teacher-cohort scoping before go-live.

Built for Zeal Learning Center • Kingston, Jamaica
