export type RiskStatus = 'On Track' | 'Needs Attention' | 'At Risk';
export type ReadingBand = 'Below' | 'Approaching' | 'At' | 'Above';

export interface School {
  id: number;
  name: string;
  code: string;
}

export interface Mark {
  subject: string;
  assessment: string;
  date: string;
  score: number;
}

export interface AttendanceEntry {
  date: string;
  status: 'present' | 'absent' | 'late';
  engagement: number | null;
}

export interface Alert {
  type: string;
  severity: 'amber' | 'red';
  status: 'active' | 'acknowledged' | 'resolved';
  date: string;
  detail: string;
}

export interface Student {
  id: number;
  zlcId: string;
  firstName: string;
  lastName: string;
  schoolId: number;
  grade: number;
  readingBand: ReadingBand;
  rpiPre: number;
  rpiCurrent: number;
  rpiTarget: number;
  ffwProtocol: string;
  ffwCompletionPct: number;
  ffwLastLogin: string;
  mathMastery: number;
  mathLastActivity: string;
  classroomMathAvg: number;
  attendanceRate: number;
  attendanceStreak: number;
  riskStatus: RiskStatus;
  marks: Mark[];
  attendance: AttendanceEntry[];
  alerts: Alert[];
  masteryTrend: number[];
}

export interface CurrentUser {
  email: string;
  name: string;
  role: string;
  schoolId: number;
  cohortName: string;
}

// The five application roles (mirrors the profiles.role CHECK in schema.sql).
export type UserRole =
  | 'instructional_leader'
  | 'programme_manager'
  | 'stmc_team'
  | 'school_admin'
  | 'teacher';

export const USER_ROLES: UserRole[] = [
  'instructional_leader',
  'programme_manager',
  'stmc_team',
  'school_admin',
  'teacher',
];

// Roles that are scoped to a single school (must have a school_id set).
export const SCHOOL_SCOPED_ROLES: UserRole[] = ['school_admin', 'teacher'];

export function roleLabel(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// A managed account, as shown in the admin "Manage Users" panel.
export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  schoolId: number | null;
  lastLogin: string | null;
  createdAt: string | null;
}
