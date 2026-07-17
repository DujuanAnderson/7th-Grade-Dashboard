import * as XLSX from 'xlsx';
import type { Student, School } from './types';

const NAVY = '#1e3a5f';
const TEAL = '#2a9d8f';
const GOLD = '#e9c46a';

const codeOf = (schools: School[], id: number) => schools.find((s) => s.id === id)?.code ?? '';

// ---------- Excel exports (spec §9: Raw Data Export / roster export) ----------

export function exportRosterXlsx(students: Student[], schools: School[], filename = 'roster.xlsx') {
  const rows = students.map((s) => ({
    'ZLC ID': s.zlcId,
    'First Name': s.firstName,
    'Last Name': s.lastName,
    School: codeOf(schools, s.schoolId),
    'Literacy Band': s.readingBand,
    'RPI Current': s.rpiCurrent,
    'FFW %': s.ffwCompletionPct,
    'Math Mastery %': s.mathMastery,
    'Classroom Math Avg': s.classroomMathAvg,
    'Attendance %': s.attendanceRate,
    'Risk Status': s.riskStatus,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Roster');
  XLSX.writeFile(wb, filename);
}

// ---------- Branded printable PDF (via the browser print dialog) ----------

function openReport(title: string, bodyHtml: string) {
  const w = window.open('', '_blank');
  if (!w) {
    alert('Please allow pop-ups to generate the report.');
    return;
  }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; margin: 0; padding: 0 0 48px; font-size: 11pt; }
    .header { background: ${NAVY}; color: #fff; padding: 18px 32px; display: flex; align-items: center; gap: 14px; }
    .header .logo { width: 40px; height: 40px; border-radius: 8px; background: ${TEAL}; display: flex; align-items: center; justify-content: center; font-weight: bold; }
    .header h1 { font-size: 16pt; margin: 0; }
    .header p { margin: 2px 0 0; font-size: 10pt; opacity: .85; }
    .rule { height: 4px; background: ${GOLD}; }
    .content { padding: 24px 32px; }
    h2 { color: ${NAVY}; font-size: 12pt; border-bottom: 2px solid ${GOLD}; padding-bottom: 4px; margin-top: 22px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10pt; }
    th { background: ${NAVY}; color: #fff; text-align: left; padding: 6px 8px; }
    td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
    .kpi { display: inline-block; margin: 6px 18px 6px 0; }
    .kpi .v { font-size: 15pt; font-weight: bold; color: ${NAVY}; }
    .kpi .l { font-size: 8pt; color: #6b7280; text-transform: uppercase; letter-spacing: .04em; }
    .footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 8px 32px; font-size: 8pt; color: #6b7280; border-top: 1px solid #e5e7eb; background: #fff; }
    @media print { .noprint { display: none; } }
  </style></head><body>
    <div class="header"><div class="logo">ZLC</div><div><h1>${title}</h1><p>7th Grade Academy Data Dashboard</p></div></div>
    <div class="rule"></div>
    <div class="content">${bodyHtml}</div>
    <div class="footer">Zeal Learning Center | Confidential &nbsp;·&nbsp; Generated ${new Date().toISOString().slice(0, 10)}</div>
    <div class="noprint" style="padding:16px 32px;"><button onclick="window.print()" style="background:${NAVY};color:#fff;border:0;padding:10px 18px;border-radius:8px;font-size:11pt;cursor:pointer;">Print / Save as PDF</button></div>
  </body></html>`);
  w.document.close();
}

const esc = (s: unknown) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));

function avg(nums: number[]) {
  return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
}

export function printCrossSchoolReport(students: Student[], schools: School[]) {
  const rows = schools.map((sc) => {
    const list = students.filter((s) => s.schoolId === sc.id);
    const atOrAbove = list.filter((s) => s.readingBand === 'At' || s.readingBand === 'Above').length;
    return `<tr><td>${esc(sc.name)}</td><td>${list.length}</td>
      <td>${list.length ? Math.round((atOrAbove / list.length) * 100) : 0}%</td>
      <td>${avg(list.map((s) => s.ffwCompletionPct))}%</td>
      <td>${avg(list.map((s) => s.mathMastery))}%</td>
      <td>${avg(list.map((s) => s.attendanceRate))}%</td></tr>`;
  }).join('');
  const body = `
    <h2>All Schools — KPI Summary</h2>
    <table><thead><tr><th>School</th><th>Students</th><th>Literacy %</th><th>FFW %</th><th>Mastery %</th><th>Attendance %</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <p style="margin-top:14px;font-size:9pt;color:#6b7280;">Risk thresholds per Technical Specification v1.0 §5/§8.</p>`;
  openReport('Cross-School Comparison Report', body);
}

export function printStudentReport(student: Student, school?: School) {
  const marks = student.marks.map((m) => `<tr><td>${esc(m.subject)}</td><td>${esc(m.assessment)}</td><td>${m.date}</td><td>${m.score}</td></tr>`).join('');
  const alerts = student.alerts.length
    ? student.alerts.map((a) => `<li><strong>${esc(a.type)}</strong> — ${esc(a.detail)}</li>`).join('')
    : '<li>No active alerts.</li>';
  const body = `
    <h2>${esc(student.firstName)} ${esc(student.lastName)}</h2>
    <p style="color:#6b7280;">${esc(school?.name ?? '')} · Grade ${student.grade} · ${esc(student.zlcId)} · Risk: <strong>${esc(student.riskStatus)}</strong></p>
    <div>
      <div class="kpi"><div class="l">RPI (pre → current → target)</div><div class="v">${student.rpiPre} → ${student.rpiCurrent} → ${student.rpiTarget}</div></div>
      <div class="kpi"><div class="l">FFW ${esc(student.ffwProtocol)}</div><div class="v">${student.ffwCompletionPct}%</div></div>
      <div class="kpi"><div class="l">Math Mastery</div><div class="v">${student.mathMastery}%</div></div>
      <div class="kpi"><div class="l">Attendance</div><div class="v">${student.attendanceRate}%</div></div>
    </div>
    <h2>Subject Performance</h2>
    <table><thead><tr><th>Subject</th><th>Assessment</th><th>Date</th><th>Score</th></tr></thead><tbody>${marks}</tbody></table>
    <h2>Alerts &amp; Flags</h2>
    <ul>${alerts}</ul>`;
  openReport('Student Progress Report', body);
}
