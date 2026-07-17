import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { MOCK_STUDENTS, ALL_STUDENTS, MOCK_SCHOOLS, DEMO_USER, DEMO_ADMIN } from './mockData';
import type { Student, School, CurrentUser } from './types';

export type DemoRole = 'teacher' | 'admin';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Demo mode = no Supabase configured. The app is fully runnable in this mode
// with sample data and any login. Set the two VITE_ vars to use real auth.
export const DEMO_MODE = !url || !anon;

// This Phase-1 build has no data ingestion yet (uploads/marks come in Phase 2),
// so the dashboard always renders sample data. Real auth still works when
// configured; the "Sample data" badge makes this explicit in the UI.
export const SAMPLE_DATA = true;

let supabase: SupabaseClient | null = null;
if (!DEMO_MODE) {
  supabase = createClient(url as string, anon as string);
}

function nameFromEmail(email: string): string {
  const handle = email.split('@')[0] || 'User';
  return handle.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function login(email: string, password: string, demoRole: DemoRole = 'teacher'): Promise<CurrentUser> {
  if (DEMO_MODE || !supabase) {
    // Any credentials are accepted in demo mode; role chosen at the login screen.
    const base = demoRole === 'admin' ? DEMO_ADMIN : DEMO_USER;
    return { ...base, email: email || base.email };
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const user = data.user;
  return {
    email: user.email ?? email,
    name: nameFromEmail(user.email ?? email),
    role: (user.user_metadata?.role as string) ?? 'teacher',
    schoolId: 1,
    cohortName: DEMO_USER.cohortName,
  };
}

// Roles with cross-school administrator access (spec §3).
export function isAdminRole(role: string): boolean {
  return ['instructional_leader', 'programme_manager', 'stmc_team', 'school_admin'].includes(role);
}

export async function logout(): Promise<void> {
  if (supabase) await supabase.auth.signOut();
}

export async function getStudents(): Promise<Student[]> {
  // Teacher's cohort (school 1). Wire to real tables in a later phase.
  return MOCK_STUDENTS.map((s) => ({ ...s }));
}

export async function getAllStudents(): Promise<Student[]> {
  // Full cross-school population for the Administrator dashboard.
  return ALL_STUDENTS.map((s) => ({ ...s }));
}

export function getSchools(): School[] {
  return MOCK_SCHOOLS;
}
