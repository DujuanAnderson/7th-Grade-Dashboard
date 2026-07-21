import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { computeRisk, bandForRpi } from './compute';
import type {
  Student, School, CurrentUser, RiskStatus, Mark, AttendanceEntry, Alert,
  UserProfile, UserRole,
} from './types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// The dashboard is fully API-driven. Both env vars must be set (locally in
// frontend/.env, on Vercel as project env vars) or the app cannot reach data.
export const IS_CONFIGURED = Boolean(url && anon);

const NOT_CONFIGURED =
  'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.';

const supabase: SupabaseClient | null = IS_CONFIGURED
  ? createClient(url as string, anon as string)
  : null;

function client(): SupabaseClient {
  if (!supabase) throw new Error(NOT_CONFIGURED);
  return supabase;
}

function nameFromEmail(email: string): string {
  const handle = email.split('@')[0] || 'User';
  return handle.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function login(email: string, password: string): Promise<CurrentUser> {
  const sb = client();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const user = data.user;

  // Role and school scope come from the user's profile row (RLS: self-readable).
  const { data: profile } = await sb
    .from('profiles')
    .select('role, school_id')
    .eq('id', user.id)
    .single();

  const role = (profile?.role as string) ?? (user.user_metadata?.role as string) ?? 'teacher';
  return {
    email: user.email ?? email,
    name: nameFromEmail(user.email ?? email),
    role,
    schoolId: profile?.school_id ?? 0,
    cohortName: 'Grade 7 Cohort',
  };
}

// Roles with cross-school administrator access (spec §3).
export function isAdminRole(role: string): boolean {
  return ['instructional_leader', 'programme_manager', 'stmc_team', 'school_admin'].includes(role);
}

export async function logout(): Promise<void> {
  if (supabase) await supabase.auth.signOut();
}

export async function getSchools(): Promise<School[]> {
  const { data, error } = await client().from('schools').select('id, name, code').order('id');
  if (error) throw new Error(error.message);
  return (data ?? []).map((s: any) => ({ id: s.id, name: s.name, code: s.code }));
}

// ---------------------------------------------------------------------------
// Live student data
//
// The dashboard's `Student` object is denormalized (single FFW/Clear Math
// values plus nested marks/attendance/alerts). The database is normalized
// across many tables, so we pull each student with its related rows in one
// PostgREST query (embedded resources) and reshape below. RLS decides which
// rows come back: a teacher sees their school, an all-school admin sees
// everyone — so getStudents (teacher) and getAllStudents (admin) share the
// same query and differ only by the caller's session scope.
// ---------------------------------------------------------------------------

const STUDENT_SELECT = `
  id, zlc_id, first_name, last_name, school_id, grade,
  ffw_uploads ( protocol, completion_pct, last_login, upload_date ),
  clearmath_uploads ( mastery_pct, last_activity, upload_date ),
  teacher_marks ( subject, assessment_name, date, score ),
  attendance_log ( session_date, status, engagement_rating ),
  assessments ( tool_name, pre_score, current_score, target_score ),
  alerts ( alert_type, trigger_value, severity, status, created_at )
`;

const num = (v: unknown): number => (v == null ? 0 : Number(v));

// Reshape one embedded DB row into the denormalized `Student` the UI expects.
function mapRowToStudent(row: any): Student {
  // Reading Progress Index assessment → reading band + pre/current/target.
  const rpi = (row.assessments ?? []).find((a: any) => a.tool_name === 'RPI') ?? {};
  const rpiCurrent = num(rpi.current_score);

  // Latest Fast ForWord upload.
  const ffwRows = [...(row.ffw_uploads ?? [])].sort(
    (a, b) => String(b.upload_date).localeCompare(String(a.upload_date)),
  );
  const ffw = ffwRows[0] ?? {};

  // Clear Math mastery over time (oldest → newest) drives the trend line.
  const cmRows = [...(row.clearmath_uploads ?? [])].sort(
    (a, b) => String(a.upload_date).localeCompare(String(b.upload_date)),
  );
  const masteryTrend = cmRows.map((c) => num(c.mastery_pct));
  const mathMastery = masteryTrend.length ? masteryTrend[masteryTrend.length - 1] : 0;
  const mathLastActivity = cmRows.reduce(
    (latest, c) => (String(c.last_activity) > latest ? String(c.last_activity) : latest),
    '',
  );

  // Teacher marks; classroom math average = mean of Mathematics scores.
  const marks: Mark[] = (row.teacher_marks ?? []).map((m: any) => ({
    subject: m.subject,
    assessment: m.assessment_name,
    date: m.date,
    score: num(m.score),
  }));
  const mathMarks = marks.filter((m) => m.subject === 'Mathematics');
  const classroomMathAvg = mathMarks.length
    ? Math.round(mathMarks.reduce((s, m) => s + m.score, 0) / mathMarks.length)
    : 0;

  // Attendance → rate (present / total) and current present streak.
  const attendance: AttendanceEntry[] = [...(row.attendance_log ?? [])]
    .sort((a, b) => String(b.session_date).localeCompare(String(a.session_date)))
    .map((a: any) => ({
      date: a.session_date,
      status: a.status,
      engagement: a.engagement_rating ?? null,
    }));
  const presentCount = attendance.filter((a) => a.status === 'present').length;
  const attendanceRate = attendance.length
    ? Math.round((presentCount / attendance.length) * 100)
    : 0;
  let attendanceStreak = 0;
  for (const a of attendance) {
    if (a.status === 'present') attendanceStreak++;
    else break;
  }

  const alerts: Alert[] = (row.alerts ?? []).map((a: any) => ({
    type: a.alert_type,
    severity: a.severity,
    status: a.status,
    date: String(a.created_at).slice(0, 10),
    detail: a.trigger_value,
  }));

  const ffwCompletionPct = num(ffw.completion_pct);
  const riskStatus: RiskStatus = computeRisk(ffwCompletionPct, mathMastery, attendanceRate);

  return {
    id: row.id,
    zlcId: row.zlc_id,
    firstName: row.first_name,
    lastName: row.last_name,
    schoolId: row.school_id,
    grade: row.grade ?? 7,
    readingBand: bandForRpi(rpiCurrent),
    rpiPre: num(rpi.pre_score),
    rpiCurrent,
    rpiTarget: num(rpi.target_score),
    ffwProtocol: ffw.protocol ?? '—',
    ffwCompletionPct,
    ffwLastLogin: ffw.last_login ?? ffw.upload_date ?? '',
    mathMastery,
    mathLastActivity,
    classroomMathAvg,
    attendanceRate,
    attendanceStreak,
    riskStatus,
    marks,
    attendance,
    alerts,
    masteryTrend,
  };
}

// Shared live fetch. Errors (network / RLS / misconfig) propagate so the UI can
// show a real error state; an empty result is returned as an empty array.
async function fetchStudents(): Promise<Student[]> {
  const { data, error } = await client().from('students').select(STUDENT_SELECT).order('id');
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRowToStudent);
}

export async function getStudents(): Promise<Student[]> {
  // Teacher's cohort — RLS scopes the rows to the signed-in teacher's school.
  return fetchStudents();
}

export async function getAllStudents(): Promise<Student[]> {
  // Full cross-school population for the Administrator dashboard (RLS-scoped).
  return fetchStudents();
}

// ---------------------------------------------------------------------------
// User management (Administrator only)
//
// Accounts live in `profiles`, one row per Supabase auth user. Reading and
// writing other people's profiles is gated by RLS: the admin management
// policies (database/seed/003_profiles_admin_policies.sql) let all-school
// admins list, re-role, re-assign, and remove profiles. A non-admin session
// only ever sees its own row, so these calls are safe to expose in the UI.
//
// NOTE: creating a brand-new sign-in requires minting a Supabase auth user,
// which needs the service key and therefore happens server-side (see the
// seed_logins pattern) — it is intentionally not offered from the browser.
// ---------------------------------------------------------------------------

function mapRowToUser(row: any): UserProfile {
  return {
    id: row.id,
    email: row.email ?? '',
    role: row.role as UserRole,
    schoolId: row.school_id ?? null,
    lastLogin: row.last_login ?? null,
    createdAt: row.created_at ?? null,
  };
}

export async function getUsers(): Promise<UserProfile[]> {
  const { data, error } = await client()
    .from('profiles')
    .select('id, email, role, school_id, last_login, created_at')
    .order('role');
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRowToUser);
}

export async function updateUser(
  id: string,
  changes: { role?: UserRole; schoolId?: number | null },
): Promise<UserProfile> {
  const patch: Record<string, unknown> = {};
  if (changes.role !== undefined) patch.role = changes.role;
  if (changes.schoolId !== undefined) patch.school_id = changes.schoolId;

  const { data, error } = await client()
    .from('profiles')
    .update(patch)
    .eq('id', id)
    .select('id, email, role, school_id, last_login, created_at')
    .single();
  if (error) throw new Error(error.message);
  return mapRowToUser(data);
}

export async function deleteUser(id: string): Promise<void> {
  const { error } = await client().from('profiles').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
