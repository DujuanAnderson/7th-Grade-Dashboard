import type {
  Student, School, CurrentUser, ReadingBand, RiskStatus, Mark, AttendanceEntry, Alert,
} from './types';

export const MOCK_SCHOOLS: School[] = [
  { id: 1, name: 'Holy Trinity High School', code: 'HTHS' },
  { id: 2, name: 'Newell High School', code: 'NHS' },
  { id: 3, name: "St. Mary's College", code: 'SMC' },
  { id: 4, name: 'Pembroke Hall High School', code: 'PHHS' },
];

export const DEMO_USER: CurrentUser = {
  email: 'teacher@demo.zlc',
  name: 'Ms. Camille Bennett',
  role: 'teacher',
  schoolId: 1,
  cohortName: '7B Literacy Cohort',
};

// Risk thresholds mirror spec §5/§8 (FFW completion, Clear Math mastery, attendance).
export function computeRisk(ffw: number, mastery: number, attendance: number): RiskStatus {
  if (ffw < 50 || mastery < 50 || attendance < 70) return 'At Risk';
  if (ffw < 70 || mastery < 70 || attendance < 85) return 'Needs Attention';
  return 'On Track';
}

const TODAY = new Date('2026-07-15');
function daysAgo(n: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

interface Raw {
  first: string; last: string; band: ReadingBand;
  rpiPre: number; rpiCur: number; rpiTgt: number;
  protocol: string; ffw: number; ffwDays: number;
  mastery: number; mathDays: number; classAvg: number;
  attendance: number; streak: number;
}

const RAW: Raw[] = [
  { first: 'Andre',   last: 'Clarke',   band: 'At',          rpiPre: 62, rpiCur: 78, rpiTgt: 80, protocol: 'Reading',  ffw: 82, ffwDays: 1,  mastery: 88, mathDays: 2,  classAvg: 84, attendance: 96, streak: 12 },
  { first: 'Shanice', last: 'Brown',    band: 'Approaching', rpiPre: 48, rpiCur: 60, rpiTgt: 72, protocol: 'Language', ffw: 66, ffwDays: 2,  mastery: 71, mathDays: 3,  classAvg: 68, attendance: 90, streak: 7  },
  { first: 'Devon',   last: 'Reid',     band: 'Below',       rpiPre: 40, rpiCur: 47, rpiTgt: 66, protocol: 'Literacy', ffw: 44, ffwDays: 8,  mastery: 52, mathDays: 9,  classAvg: 51, attendance: 74, streak: 2  },
  { first: 'Kadeen',  last: 'Powell',   band: 'At',          rpiPre: 58, rpiCur: 74, rpiTgt: 78, protocol: 'Reading',  ffw: 76, ffwDays: 1,  mastery: 80, mathDays: 1,  classAvg: 79, attendance: 93, streak: 10 },
  { first: 'Tamara',  last: 'Grant',    band: 'Approaching', rpiPre: 50, rpiCur: 63, rpiTgt: 74, protocol: 'Language', ffw: 69, ffwDays: 3,  mastery: 66, mathDays: 4,  classAvg: 64, attendance: 86, streak: 6  },
  { first: 'Rohan',   last: 'Malcolm',  band: 'Below',       rpiPre: 38, rpiCur: 45, rpiTgt: 64, protocol: 'Literacy', ffw: 41, ffwDays: 11, mastery: 47, mathDays: 12, classAvg: 49, attendance: 68, streak: 1  },
  { first: 'Alicia',  last: 'Stewart',  band: 'Above',       rpiPre: 70, rpiCur: 86, rpiTgt: 84, protocol: 'Reading',  ffw: 91, ffwDays: 0,  mastery: 93, mathDays: 1,  classAvg: 90, attendance: 98, streak: 15 },
  { first: 'Jerome',  last: 'Campbell', band: 'Approaching', rpiPre: 52, rpiCur: 64, rpiTgt: 73, protocol: 'Reading',  ffw: 72, ffwDays: 2,  mastery: 69, mathDays: 3,  classAvg: 67, attendance: 88, streak: 8  },
  { first: 'Britney', last: 'Walsh',    band: 'At',          rpiPre: 60, rpiCur: 73, rpiTgt: 79, protocol: 'Language', ffw: 78, ffwDays: 1,  mastery: 82, mathDays: 2,  classAvg: 80, attendance: 91, streak: 9  },
  { first: 'Marlon',  last: 'Ellis',    band: 'Below',       rpiPre: 42, rpiCur: 50, rpiTgt: 67, protocol: 'Literacy', ffw: 55, ffwDays: 6,  mastery: 58, mathDays: 7,  classAvg: 56, attendance: 79, streak: 3  },
  { first: 'Chantal', last: 'Reid',     band: 'At',          rpiPre: 57, rpiCur: 71, rpiTgt: 77, protocol: 'Reading',  ffw: 74, ffwDays: 2,  mastery: 76, mathDays: 2,  classAvg: 75, attendance: 90, streak: 7  },
  { first: 'Odane',   last: 'Palmer',   band: 'Approaching', rpiPre: 46, rpiCur: 49, rpiTgt: 70, protocol: 'Language', ffw: 47, ffwDays: 9,  mastery: 51, mathDays: 10, classAvg: 53, attendance: 72, streak: 2  },
];

const SUBJECTS = ['English Language Arts', 'Mathematics', 'General Science', 'Social Studies'];
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function makeMarks(r: Raw): Mark[] {
  const marks: Mark[] = [];
  for (const subject of SUBJECTS) {
    const base = subject === 'Mathematics' ? r.classAvg : r.rpiCur;
    marks.push({ subject, assessment: 'Unit 2 Quiz', date: daysAgo(20), score: clamp(base - 4) });
    marks.push({ subject, assessment: 'Term Test', date: daysAgo(6), score: clamp(base + 3) });
  }
  return marks;
}

function makeAttendance(r: Raw): AttendanceEntry[] {
  const sessions = 8;
  const presentCount = Math.round((r.attendance / 100) * sessions);
  const out: AttendanceEntry[] = [];
  for (let i = 0; i < sessions; i++) {
    const present = i < presentCount;
    const status: AttendanceEntry['status'] = present ? 'present' : i % 2 === 0 ? 'late' : 'absent';
    out.push({
      date: daysAgo(i * 2),
      status,
      engagement: present ? (i % 3 === 0 ? 2 : 3) : null,
    });
  }
  return out;
}

function makeAlerts(r: Raw): Alert[] {
  const alerts: Alert[] = [];
  if (r.ffwDays >= 5) {
    alerts.push({ type: 'FFW inactivity', severity: 'amber', status: 'active', date: daysAgo(0), detail: `No Fast ForWord login in ${r.ffwDays} days` });
  }
  if (r.mastery < 50) {
    alerts.push({ type: 'Clear Math mastery critical', severity: 'red', status: 'active', date: daysAgo(1), detail: `Concept mastery at ${r.mastery}% (below 50%)` });
  } else if (r.mastery < 60) {
    alerts.push({ type: 'Clear Math mastery drop', severity: 'amber', status: 'active', date: daysAgo(1), detail: `Concept mastery at ${r.mastery}% (below 60%)` });
  }
  if (r.attendance < 70) {
    alerts.push({ type: 'Attendance threshold', severity: 'amber', status: 'active', date: daysAgo(2), detail: `Attendance rate ${r.attendance}% (below 70%)` });
  }
  return alerts;
}

function makeTrend(mastery: number): number[] {
  // 6 weekly points easing up toward the current mastery value.
  return Array.from({ length: 6 }, (_, i) => clamp(mastery - (5 - i) * 2 + (i % 2)));
}

function buildStudent(id: number, zlcId: string, schoolId: number, r: Raw): Student {
  return {
    id,
    zlcId,
    firstName: r.first,
    lastName: r.last,
    schoolId,
    grade: 7,
    readingBand: r.band,
    rpiPre: r.rpiPre,
    rpiCurrent: r.rpiCur,
    rpiTarget: r.rpiTgt,
    ffwProtocol: r.protocol,
    ffwCompletionPct: r.ffw,
    ffwLastLogin: daysAgo(r.ffwDays),
    mathMastery: r.mastery,
    mathLastActivity: daysAgo(r.mathDays),
    classroomMathAvg: r.classAvg,
    attendanceRate: r.attendance,
    attendanceStreak: r.streak,
    riskStatus: computeRisk(r.ffw, r.mastery, r.attendance),
    marks: makeMarks(r),
    attendance: makeAttendance(r),
    alerts: makeAlerts(r),
    masteryTrend: makeTrend(r.mastery),
  };
}

// The teacher's hand-crafted Holy Trinity cohort (school id 1).
export const MOCK_STUDENTS: Student[] = RAW.map((r, i) =>
  buildStudent(i + 1, `ZLC-HTHS-${String(101 + i)}`, 1, r),
);

// Deterministic generator for the other three schools so the Administrator
// cross-school views have real spread to render.
const FIRST = ['Jamal', 'Keisha', 'Dwayne', 'Latoya', 'Omar', 'Nadia', 'Kemar', 'Simone', 'Rohan', 'Aaliyah', 'Tevin', 'Renae', 'Damion', 'Shanté'];
const LAST = ['Bailey', 'Ferguson', 'Gordon', 'Henry', 'Palmer', 'Blake', 'Wright', 'Morgan', 'Dixon', 'Foster', 'Bryan', 'Chin', 'Watson', 'Rose'];
const PROTOCOLS = ['Reading', 'Language', 'Literacy'];

function seeded(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function bandFor(rpi: number): ReadingBand {
  if (rpi < 50) return 'Below';
  if (rpi < 62) return 'Approaching';
  if (rpi < 75) return 'At';
  return 'Above';
}

function genCohort(schoolId: number, code: string, count: number, seed: number): Student[] {
  const rnd = seeded(seed);
  return Array.from({ length: count }, (_, i) => {
    const ffw = Math.round(42 + rnd() * 56);
    const mastery = Math.round(42 + rnd() * 56);
    const attendance = Math.round(66 + rnd() * 33);
    const rpiCur = Math.round(46 + rnd() * 40);
    const r: Raw = {
      first: FIRST[(i + seed) % FIRST.length],
      last: LAST[(i * 3 + seed) % LAST.length],
      band: bandFor(rpiCur),
      rpiPre: Math.max(35, rpiCur - Math.round(10 + rnd() * 8)),
      rpiCur,
      rpiTgt: Math.min(95, rpiCur + Math.round(6 + rnd() * 10)),
      protocol: PROTOCOLS[i % PROTOCOLS.length],
      ffw,
      ffwDays: Math.round(rnd() * 13),
      mastery,
      mathDays: Math.round(rnd() * 13),
      classAvg: Math.max(0, Math.min(100, mastery + Math.round(rnd() * 10 - 5))),
      attendance,
      streak: Math.round(rnd() * 14),
    };
    return buildStudent(schoolId * 100 + i, `ZLC-${code}-${String(101 + i)}`, schoolId, r);
  });
}

// Full population across all four schools (used by the Administrator dashboard).
export const ALL_STUDENTS: Student[] = [
  ...MOCK_STUDENTS,
  ...genCohort(2, 'NHS', 10, 71),
  ...genCohort(3, 'SMC', 9, 137),
  ...genCohort(4, 'PHHS', 11, 211),
];

export const DEMO_ADMIN: CurrentUser = {
  email: 'admin@demo.zlc',
  name: 'Dr. Faith Alexander',
  role: 'instructional_leader',
  schoolId: 0,
  cohortName: 'All Schools',
};

// Class-average Clear Math mastery per week (spec §6 math tracker line chart),
// derived from the cohort's weekly trend, against a flat grade-level benchmark.
export const CLASS_MASTERY_TREND = Array.from({ length: 6 }, (_, w) => {
  const avg = MOCK_STUDENTS.reduce((s, st) => s + st.masteryTrend[w], 0) / MOCK_STUDENTS.length;
  return { week: `Wk ${w + 1}`, classAvg: Math.round(avg), benchmark: 70 };
});
