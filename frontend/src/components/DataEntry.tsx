import { useState } from 'react';
import type { Student, AttendanceEntry } from '../lib/types';
import { computeRisk } from '../lib/compute';
import { NAVY, TEAL, STATUS } from '../lib/theme';

const SUBJECTS = [
  'English Language Arts', 'Mathematics', 'General Science',
  'Social Studies', 'Religious Education', 'Food & Nutrition', 'Physical Education',
];
const TODAY = '2026-07-15';

function recomputeAttendance(entries: AttendanceEntry[]): number {
  if (entries.length === 0) return 0;
  const present = entries.filter((e) => e.status === 'present').length;
  return Math.round((present / entries.length) * 100);
}

export default function DataEntry({
  students, onUpdate,
}: {
  students: Student[];
  onUpdate: (next: Student[]) => void;
}) {
  // ---- Mark entry state ----
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [assessment, setAssessment] = useState('');
  const [markDate, setMarkDate] = useState(TODAY);
  const [scores, setScores] = useState<Record<number, string>>({});
  const [markMsg, setMarkMsg] = useState('');

  // ---- Attendance state ----
  const [attDate, setAttDate] = useState(TODAY);
  const [att, setAtt] = useState<Record<number, AttendanceEntry['status']>>({});
  const [attMsg, setAttMsg] = useState('');

  const saveMarks = () => {
    const entered = Object.entries(scores).filter(([, v]) => v !== '' && !Number.isNaN(Number(v)));
    if (!assessment.trim() || entered.length === 0) {
      setMarkMsg('Enter an assessment name and at least one score.');
      return;
    }
    const map = new Map(entered.map(([id, v]) => [Number(id), Math.max(0, Math.min(100, Number(v)))]));
    const next = students.map((s) => {
      if (!map.has(s.id)) return s;
      const score = map.get(s.id)!;
      const marks = [...s.marks, { subject, assessment: assessment.trim(), date: markDate, score }];
      const upd = { ...s, marks };
      if (subject === 'Mathematics') {
        const mathMarks = marks.filter((m) => m.subject === 'Mathematics');
        upd.classroomMathAvg = Math.round(mathMarks.reduce((a, m) => a + m.score, 0) / mathMarks.length);
      }
      return upd;
    });
    onUpdate(next);
    setScores({});
    setAssessment('');
    setMarkMsg(`Saved ${entered.length} mark(s) for "${subject}".`);
  };

  const saveAttendance = () => {
    const entered = Object.entries(att);
    if (entered.length === 0) {
      setAttMsg('Mark at least one student.');
      return;
    }
    const map = new Map(entered.map(([id, st]) => [Number(id), st]));
    const next = students.map((s) => {
      const st = map.get(s.id);
      if (!st) return s;
      const attendance = [{ date: attDate, status: st, engagement: st === 'present' ? 3 : null }, ...s.attendance];
      const attendanceRate = recomputeAttendance(attendance);
      return {
        ...s, attendance, attendanceRate,
        riskStatus: computeRisk(s.ffwCompletionPct, s.mathMastery, attendanceRate),
      };
    });
    onUpdate(next);
    setAtt({});
    setAttMsg(`Recorded attendance for ${entered.length} student(s) on ${attDate}.`);
  };

  return (
    <div className="space-y-5">
      {/* Subject / mark bulk entry */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold mb-1" style={{ color: NAVY }}>Subject Area Entry — Bulk Marks</h2>
        <p className="text-xs text-gray-400 mb-4">One row per student. Leave a score blank to skip that student.</p>

        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Subject</label>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Assessment name</label>
            <input value={assessment} onChange={(e) => setAssessment(e.target.value)} placeholder="e.g. Unit 3 Quiz" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date</label>
            <input type="date" value={markDate} onChange={(e) => setMarkDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto border border-gray-100 rounded-lg">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="text-left text-gray-500"><th className="py-2 px-3">Student</th><th className="py-2 px-3 w-32">Score (0–100)</th></tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-t border-gray-50">
                  <td className="py-1.5 px-3">{s.firstName} {s.lastName}</td>
                  <td className="py-1.5 px-3">
                    <input
                      type="number" min={0} max={100} value={scores[s.id] ?? ''}
                      onChange={(e) => setScores((p) => ({ ...p, [s.id]: e.target.value }))}
                      className="w-24 border border-gray-300 rounded px-2 py-1 text-sm"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-3 mt-3">
          <button onClick={saveMarks} className="px-4 py-2 rounded-lg text-sm text-white font-medium" style={{ background: NAVY }}>Save marks</button>
          {markMsg && <span className="text-sm" style={{ color: TEAL }}>{markMsg}</span>}
        </div>
      </div>

      {/* Attendance & engagement */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold" style={{ color: NAVY }}>Attendance &amp; Engagement Log</h2>
            <p className="text-xs text-gray-400">Mark each student for the session.</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Session date</label>
            <input type="date" value={attDate} onChange={(e) => setAttDate(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto border border-gray-100 rounded-lg">
          <table className="w-full text-sm">
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-t border-gray-50">
                  <td className="py-1.5 px-3">{s.firstName} {s.lastName}</td>
                  <td className="py-1.5 px-3">
                    <div className="flex gap-1.5 justify-end">
                      {(['present', 'late', 'absent'] as const).map((st) => {
                        const tone = st === 'present' ? 'On Track' : st === 'late' ? 'Needs Attention' : 'At Risk';
                        const active = att[s.id] === st;
                        return (
                          <button
                            key={st}
                            onClick={() => setAtt((p) => ({ ...p, [s.id]: st }))}
                            className="px-2.5 py-1 rounded text-xs font-medium border"
                            style={active
                              ? { background: STATUS[tone].dot, color: 'white', borderColor: STATUS[tone].dot }
                              : { color: STATUS[tone].fg, borderColor: '#e5e7eb' }}
                          >
                            {st[0].toUpperCase() + st.slice(1)}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-3 mt-3">
          <button onClick={saveAttendance} className="px-4 py-2 rounded-lg text-sm text-white font-medium" style={{ background: NAVY }}>Save attendance</button>
          {attMsg && <span className="text-sm" style={{ color: TEAL }}>{attMsg}</span>}
        </div>
      </div>
    </div>
  );
}
