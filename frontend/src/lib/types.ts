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
