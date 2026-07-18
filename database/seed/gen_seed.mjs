// Generates per-table seed SQL from the SAME deterministic logic as
// frontend/src/lib/mockData.ts, so the DB rows reconstruct into the exact
// Student shape the dashboard expects. Run: node gen_seed.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const OUT = process.argv[2];
mkdirSync(OUT, { recursive: true });

// ---- ported verbatim from mockData.ts ------------------------------------
const TODAY = new Date('2026-07-15');
function daysAgo(n) {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));

const RAW = [
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

function makeMarks(r) {
  const marks = [];
  for (const subject of SUBJECTS) {
    const base = subject === 'Mathematics' ? r.classAvg : r.rpiCur;
    marks.push({ subject, assessment: 'Unit 2 Quiz', date: daysAgo(20), score: clamp(base - 4) });
    marks.push({ subject, assessment: 'Term Test',    date: daysAgo(6),  score: clamp(base + 3) });
  }
  return marks;
}
function makeAttendance(r) {
  const sessions = 8;
  const presentCount = Math.round((r.attendance / 100) * sessions);
  const out = [];
  for (let i = 0; i < sessions; i++) {
    const present = i < presentCount;
    const status = present ? 'present' : i % 2 === 0 ? 'late' : 'absent';
    out.push({ date: daysAgo(i * 2), status, engagement: present ? (i % 3 === 0 ? 2 : 3) : null });
  }
  return out;
}
function makeAlerts(r) {
  const alerts = [];
  if (r.ffwDays >= 5) alerts.push({ type: 'FFW inactivity', severity: 'amber', status: 'active', date: daysAgo(0), detail: `No Fast ForWord login in ${r.ffwDays} days` });
  if (r.mastery < 50) alerts.push({ type: 'Clear Math mastery critical', severity: 'red', status: 'active', date: daysAgo(1), detail: `Concept mastery at ${r.mastery}% (below 50%)` });
  else if (r.mastery < 60) alerts.push({ type: 'Clear Math mastery drop', severity: 'amber', status: 'active', date: daysAgo(1), detail: `Concept mastery at ${r.mastery}% (below 60%)` });
  if (r.attendance < 70) alerts.push({ type: 'Attendance threshold', severity: 'amber', status: 'active', date: daysAgo(2), detail: `Attendance rate ${r.attendance}% (below 70%)` });
  return alerts;
}
function makeTrend(mastery) {
  return Array.from({ length: 6 }, (_, i) => clamp(mastery - (5 - i) * 2 + (i % 2)));
}

const FIRST = ['Jamal', 'Keisha', 'Dwayne', 'Latoya', 'Omar', 'Nadia', 'Kemar', 'Simone', 'Rohan', 'Aaliyah', 'Tevin', 'Renae', 'Damion', 'Shanté'];
const LAST  = ['Bailey', 'Ferguson', 'Gordon', 'Henry', 'Palmer', 'Blake', 'Wright', 'Morgan', 'Dixon', 'Foster', 'Bryan', 'Chin', 'Watson', 'Rose'];
const PROTOCOLS = ['Reading', 'Language', 'Literacy'];
function seeded(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
function bandFor(rpi) {
  if (rpi < 50) return 'Below';
  if (rpi < 62) return 'Approaching';
  if (rpi < 75) return 'At';
  return 'Above';
}
function genCohort(schoolId, code, count, seed) {
  const rnd = seeded(seed);
  return Array.from({ length: count }, (_, i) => {
    const ffw = Math.round(42 + rnd() * 56);
    const mastery = Math.round(42 + rnd() * 56);
    const attendance = Math.round(66 + rnd() * 33);
    const rpiCur = Math.round(46 + rnd() * 40);
    const r = {
      first: FIRST[(i + seed) % FIRST.length],
      last: LAST[(i * 3 + seed) % LAST.length],
      band: bandFor(rpiCur),
      rpiPre: Math.max(35, rpiCur - Math.round(10 + rnd() * 8)),
      rpiCur,
      rpiTgt: Math.min(95, rpiCur + Math.round(6 + rnd() * 10)),
      protocol: PROTOCOLS[i % PROTOCOLS.length],
      ffw, ffwDays: Math.round(rnd() * 13),
      mastery, mathDays: Math.round(rnd() * 13),
      classAvg: Math.max(0, Math.min(100, mastery + Math.round(rnd() * 10 - 5))),
      attendance, streak: Math.round(rnd() * 14),
    };
    return { id: schoolId * 100 + i, zlcId: `ZLC-${code}-${String(101 + i)}`, schoolId, r };
  });
}

// Full population: HTHS hand-crafted (ids 1..11) + generated cohorts.
const students = [
  ...RAW.map((r, i) => ({ id: i + 1, zlcId: `ZLC-HTHS-${String(101 + i)}`, schoolId: 1, r })),
  ...genCohort(2, 'NHS', 10, 71),
  ...genCohort(3, 'SMC', 9, 137),
  ...genCohort(4, 'PHHS', 11, 211),
];

// ---- SQL helpers ----------------------------------------------------------
const q = (v) => v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`;
const n = (v) => v === null || v === undefined ? 'NULL' : String(v);
const header = (title) => `-- 7th Grade Academy — seed data: ${title}\n-- Auto-generated to mirror frontend/src/lib/mockData.ts. Safe to re-run after a\n-- truncate. Run AFTER schema.sql (schools + students must exist first).\n\n`;
function block(rows) { return rows.length ? rows.join(',\n') + ';\n' : '-- (no rows)\n'; }

// 1) students -------------------------------------------------------------
{
  const rows = students.map(({ id, zlcId, schoolId, r }) =>
    `  (${id}, ${q(r.first)}, ${q(r.last)}, ${schoolId}, NULL, 7, ${q(zlcId)})`);
  const sql = header('students') +
    'INSERT INTO students (id, first_name, last_name, school_id, teacher_id, grade, zlc_id) VALUES\n' +
    block(rows) +
    "\n-- Keep the SERIAL sequence ahead of the explicit ids we inserted.\n" +
    "SELECT setval('students_id_seq', (SELECT MAX(id) FROM students));\n";
  writeFileSync(`${OUT}/010_seed_students.sql`, sql);
}

// 2) ffw_uploads (latest login per student) -------------------------------
{
  const rows = students.map(({ id, r }) => {
    const points = clamp(r.ffw) * 12;
    const sessions = 8 + (r.ffw % 7);
    const levelGain = (r.ffw / 40).toFixed(2);
    return `  (${id}, ${q(daysAgo(r.ffwDays))}, NULL, ${q(r.protocol)}, ${r.ffw}, ${points}, ${sessions}, ${q(daysAgo(r.ffwDays))}, ${levelGain})`;
  });
  const sql = header('ffw_uploads (Fast ForWord)') +
    'INSERT INTO ffw_uploads (student_id, upload_date, uploaded_by, protocol, completion_pct, points, sessions, last_login, level_gain) VALUES\n' +
    block(rows);
  writeFileSync(`${OUT}/020_seed_ffw_uploads.sql`, sql);
}

// 3) clearmath_uploads (6 weekly mastery points -> masteryTrend) ----------
{
  const rows = [];
  for (const { id, r } of students) {
    const trend = makeTrend(r.mastery);
    trend.forEach((m, w) => {
      const isLatest = w === trend.length - 1;
      const upload = daysAgo((trend.length - 1 - w) * 7);
      const lastActivity = isLatest ? daysAgo(r.mathDays) : upload;
      rows.push(`  (${id}, ${q(upload)}, NULL, ${q('Concept ' + (w + 1))}, ${clamp(m + 2)}, ${m}, ${clamp(m + 5)}, ${q(lastActivity)})`);
    });
  }
  const sql = header('clearmath_uploads (Clear Math)') +
    'INSERT INTO clearmath_uploads (student_id, upload_date, uploaded_by, topic, score_pct, mastery_pct, completion_pct, last_activity) VALUES\n' +
    block(rows);
  writeFileSync(`${OUT}/030_seed_clearmath_uploads.sql`, sql);
}

// 4) teacher_marks (4 subjects x 2 assessments) ---------------------------
{
  const rows = [];
  for (const { id, r } of students)
    for (const m of makeMarks(r))
      rows.push(`  (${id}, NULL, ${q(m.subject)}, ${q(m.assessment)}, ${q(m.date)}, ${m.score}, NULL)`);
  const sql = header('teacher_marks') +
    'INSERT INTO teacher_marks (student_id, teacher_id, subject, assessment_name, date, score, notes) VALUES\n' +
    block(rows);
  writeFileSync(`${OUT}/040_seed_teacher_marks.sql`, sql);
}

// 5) attendance_log (8 sessions) ------------------------------------------
{
  const rows = [];
  for (const { id, r } of students)
    for (const a of makeAttendance(r))
      rows.push(`  (${id}, NULL, ${q(a.date)}, ${q(a.status)}, ${n(a.engagement)}, NULL)`);
  const sql = header('attendance_log') +
    'INSERT INTO attendance_log (student_id, teacher_id, session_date, status, engagement_rating, notes) VALUES\n' +
    block(rows);
  writeFileSync(`${OUT}/050_seed_attendance_log.sql`, sql);
}

// 6) assessments (RPI pre/current/target) ---------------------------------
{
  const rows = students.map(({ id, r }) =>
    `  (${id}, ${q('RPI')}, ${r.rpiPre}, ${r.rpiCur}, ${r.rpiTgt}, ${q(daysAgo(30))})`);
  const sql = header('assessments (RPI reading index)') +
    'INSERT INTO assessments (student_id, tool_name, pre_score, current_score, target_score, assessment_date) VALUES\n' +
    block(rows);
  writeFileSync(`${OUT}/060_seed_assessments.sql`, sql);
}

// 7) alerts (threshold-triggered) -----------------------------------------
{
  const rows = [];
  for (const { id, r } of students)
    for (const a of makeAlerts(r))
      rows.push(`  (${id}, ${q(a.type)}, ${q(a.detail)}, ${q(a.severity)}, ${q(a.status)}, ${q(a.date)}, NULL)`);
  const sql = header('alerts') +
    'INSERT INTO alerts (student_id, alert_type, trigger_value, severity, status, created_at, resolved_at) VALUES\n' +
    block(rows);
  writeFileSync(`${OUT}/070_seed_alerts.sql`, sql);
}

console.log(`Wrote 7 seed files for ${students.length} students to ${OUT}`);
