import type { Student } from './types';

export interface EngineAlert {
  key: string; // stable across re-evaluation: `${studentId}:${type}`
  studentId: number;
  studentName: string;
  schoolId: number;
  type: string;
  severity: 'amber' | 'red';
  recipients: string;
  detail: string;
}

const NOW = new Date('2026-07-15');
const daysSince = (iso: string) => Math.floor((NOW.getTime() - new Date(iso).getTime()) / 86400000);

// Evaluates the spec §8 thresholds against current student state. Because alerts
// are derived from live data, they auto-resolve: once a condition no longer holds
// (e.g. after an upload), re-evaluating simply omits it. Acknowledgement is tracked
// separately by the stable `key`.
export function evaluateAlerts(students: Student[]): EngineAlert[] {
  const out: EngineAlert[] = [];
  for (const s of students) {
    const name = `${s.firstName} ${s.lastName}`;
    const push = (type: string, severity: EngineAlert['severity'], recipients: string, detail: string) =>
      out.push({ key: `${s.id}:${type}`, studentId: s.id, studentName: name, schoolId: s.schoolId, type, severity, recipients, detail });

    const ffwGap = daysSince(s.ffwLastLogin);
    if (ffwGap >= 5) push('FFW inactivity', 'amber', 'Teacher + Super Admin', `No FFW login in ${ffwGap} days`);

    if (s.mathMastery < 50) push('Clear Math mastery critical', 'red', 'Teacher + Super Admin', `Mastery ${s.mathMastery}% (below 50%)`);
    else if (s.mathMastery < 60) push('Clear Math mastery drop', 'amber', 'Teacher', `Mastery ${s.mathMastery}% (below 60%)`);

    const activityGap = Math.min(daysSince(s.ffwLastLogin), daysSince(s.mathLastActivity));
    if (activityGap >= 7) push('Data upload overdue', 'amber', 'Teacher + School Admin', `No FFW/Clear Math activity in ${activityGap}+ days`);

    if (s.riskStatus === 'At Risk') push('Student At Risk', 'red', 'Super Admin + School Admin', 'Risk status = At Risk');

    if (s.attendanceRate < 70) push('Attendance threshold', 'amber', 'Teacher + Super Admin', `Attendance ${s.attendanceRate}% (below 70%)`);

    const lowMark = s.marks.find((m) => m.score < 50);
    if (lowMark) push('Assessment score critical', 'amber', 'Teacher', `${lowMark.subject} "${lowMark.assessment}" = ${lowMark.score}%`);
  }
  // Red first, then by student.
  return out.sort((a, b) => (a.severity === b.severity ? a.studentName.localeCompare(b.studentName) : a.severity === 'red' ? -1 : 1));
}
