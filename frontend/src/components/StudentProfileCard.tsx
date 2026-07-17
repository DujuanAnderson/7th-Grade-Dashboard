import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { Student, School } from '../lib/types';
import { NAVY, TEAL, STATUS, BAND_COLOR, GRID, AXIS, INK_MUTED } from '../lib/theme';
import { printStudentReport } from '../lib/exports';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-2 text-sm font-semibold text-white" style={{ background: NAVY }}>{title}</div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-400">{label}</div>
      <div className="text-lg font-semibold" style={{ color: NAVY }}>{value}</div>
    </div>
  );
}

export default function StudentProfileCard({
  student, school, onClose,
}: {
  student: Student; school?: School; onClose: () => void;
}) {
  const s = STATUS[student.riskStatus];
  const trend = student.masteryTrend.map((v, i) => ({ week: `Wk ${i + 1}`, mastery: v }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4"
      style={{ background: 'rgba(21,43,70,0.55)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 rounded-t-2xl text-white flex justify-between items-start" style={{ background: NAVY }}>
          <div>
            <h2 className="text-2xl font-bold">{student.firstName} {student.lastName}</h2>
            <p className="text-sm opacity-80">
              {school?.name} · Grade {student.grade} · {student.zlcId}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ background: s.bg, color: s.fg }}>
              {student.riskStatus}
            </span>
            <button
              onClick={() => printStudentReport(student, school)}
              className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded"
              title="Generate a printable PDF report"
            >
              Download report
            </button>
            <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none" aria-label="Close">×</button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <Section title="Literacy Overview">
              <div className="grid grid-cols-3 gap-3 mb-3">
                <Stat label="RPI Pre" value={student.rpiPre} />
                <Stat label="RPI Current" value={student.rpiCurrent} />
                <Stat label="RPI Target" value={student.rpiTarget} />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full" style={{ background: BAND_COLOR[student.readingBand] }} />
                <span>{student.readingBand} grade level</span>
              </div>
              <div className="text-sm text-gray-600 mt-2">
                FFW <strong>{student.ffwProtocol}</strong> — {student.ffwCompletionPct}% complete
              </div>
            </Section>

            <Section title="Mathematics Overview">
              <div className="grid grid-cols-3 gap-3">
                <Stat label="Mastery" value={`${student.mathMastery}%`} />
                <Stat label="Class Avg" value={`${student.classroomMathAvg}%`} />
                <Stat label="Attendance" value={`${student.attendanceRate}%`} />
              </div>
              <div className="text-sm text-gray-500 mt-3">Last Clear Math activity: {student.mathLastActivity}</div>
            </Section>
          </div>

          <Section title="Progress Over Time — Concept Mastery">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trend} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 12, fill: INK_MUTED }} tickLine={false} axisLine={{ stroke: AXIS }} />
                <YAxis domain={[0, 100]} width={30} tick={{ fontSize: 12, fill: INK_MUTED }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: number) => [`${v}%`, 'Mastery']} contentStyle={{ borderRadius: 8, border: `1px solid ${AXIS}`, fontSize: 13 }} />
                <Line type="monotone" dataKey="mastery" stroke={TEAL} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Section>

          <Section title="Subject Performance">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 pr-4">Subject</th>
                    <th className="py-2 pr-4">Assessment</th>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {student.marks.map((m, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 pr-4">{m.subject}</td>
                      <td className="py-2 pr-4">{m.assessment}</td>
                      <td className="py-2 pr-4 text-gray-500">{m.date}</td>
                      <td className="py-2 font-medium">{m.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <div className="grid md:grid-cols-2 gap-4">
            <Section title="Attendance (recent sessions)">
              <div className="flex flex-wrap gap-1.5">
                {student.attendance.map((a, i) => {
                  const c = a.status === 'present' ? STATUS['On Track'] : a.status === 'late' ? STATUS['Needs Attention'] : STATUS['At Risk'];
                  return (
                    <span key={i} title={`${a.date}: ${a.status}`} className="px-2 py-1 rounded text-xs font-medium" style={{ background: c.bg, color: c.fg }}>
                      {a.status[0].toUpperCase()}
                    </span>
                  );
                })}
              </div>
              <div className="text-sm text-gray-500 mt-3">Overall attendance: {student.attendanceRate}%</div>
            </Section>

            <Section title="Alerts & Flags">
              {student.alerts.length === 0 ? (
                <p className="text-sm text-gray-400">No active alerts.</p>
              ) : (
                <ul className="space-y-2">
                  {student.alerts.map((a, i) => {
                    const c = a.severity === 'red' ? STATUS['At Risk'] : STATUS['Needs Attention'];
                    return (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.dot }} />
                        <span><strong>{a.type}</strong> — {a.detail}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}
