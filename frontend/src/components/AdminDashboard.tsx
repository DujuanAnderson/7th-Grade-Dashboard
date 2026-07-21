import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Cell, LabelList,
} from 'recharts';
import type { CurrentUser, Student, School, RiskStatus } from '../lib/types';
import { getAllStudents, getSchools, logout } from '../lib/dataClient';
import { computeRisk } from '../lib/compute';
import { NAVY, TEAL, GOLD, STATUS, GRID, AXIS, INK_MUTED, schoolColor } from '../lib/theme';
import StudentProfileCard from './StudentProfileCard';
import ManageUsers from './ManageUsers';
import NotificationBell from './NotificationBell';
import { evaluateAlerts } from '../lib/alerts';
import { exportRosterXlsx, printCrossSchoolReport } from '../lib/exports';

const axisTick = { fontSize: 12, fill: INK_MUTED };

interface Kpis {
  enrolled: number;
  literacyBenchmarkPct: number;
  ffwAvg: number;
  masteryAvg: number;
  attendanceAvg: number;
  risk: RiskStatus;
}

function avg(nums: number[]): number {
  return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
}

function schoolKpis(students: Student[]): Kpis {
  const enrolled = students.length;
  const atOrAbove = students.filter((s) => s.readingBand === 'At' || s.readingBand === 'Above').length;
  const ffwAvg = avg(students.map((s) => s.ffwCompletionPct));
  const masteryAvg = avg(students.map((s) => s.mathMastery));
  const attendanceAvg = avg(students.map((s) => s.attendanceRate));
  return {
    enrolled,
    literacyBenchmarkPct: enrolled ? Math.round((atOrAbove / enrolled) * 100) : 0,
    ffwAvg, masteryAvg, attendanceAvg,
    risk: computeRisk(ffwAvg, masteryAvg, attendanceAvg),
  };
}

function RiskBadge({ status }: { status: RiskStatus }) {
  const s = STATUS[status];
  return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap" style={{ background: s.bg, color: s.fg }}>{status}</span>;
}

type SortKey = 'code' | 'enrolled' | 'literacyBenchmarkPct' | 'ffwAvg' | 'masteryAvg' | 'attendanceAvg';

export default function AdminDashboard({ user, onLogout }: { user: CurrentUser; onLogout: () => void }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolFilter, setSchoolFilter] = useState(0); // 0 = all
  const [riskFilter, setRiskFilter] = useState<'All' | RiskStatus>('All');
  const [selected, setSelected] = useState<Student | null>(null);
  const [manageUsers, setManageUsers] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('code');
  const [sortAsc, setSortAsc] = useState(true);
  const [acked, setAcked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const alerts = useMemo(() => evaluateAlerts(students), [students]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [st, sc] = await Promise.all([getAllStudents(), getSchools()]);
      setStudents(st);
      setSchools(sc);
    } catch (e: any) {
      setError(e?.message ?? 'Could not load cross-school data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const perSchool = useMemo(
    () => schools.map((sc) => ({ school: sc, kpis: schoolKpis(students.filter((s) => s.schoolId === sc.id)) })),
    [schools, students],
  );

  const benchmarkData = perSchool.map((p) => ({ code: p.school.code, id: p.school.id, value: p.kpis.literacyBenchmarkPct }));
  const kpiBySchool = perSchool.map((p) => ({ code: p.school.code, FFW: p.kpis.ffwAvg, Mastery: p.kpis.masteryAvg }));
  const scatterBySchool = schools.map((sc) => ({
    school: sc,
    points: students.filter((s) => s.schoolId === sc.id).map((s) => ({ ffw: s.ffwCompletionPct, gain: s.rpiCurrent - s.rpiPre })),
  }));

  const inScope = useMemo(
    () => students.filter((s) => (schoolFilter === 0 || s.schoolId === schoolFilter) && (riskFilter === 'All' || s.riskStatus === riskFilter)),
    [students, schoolFilter, riskFilter],
  );
  const inactivity = useMemo(() => {
    const now = new Date('2026-07-15').getTime();
    return inScope
      .filter((s) => (now - new Date(s.ffwLastLogin).getTime()) / 86400000 >= 5)
      .sort((a, b) => a.ffwLastLogin.localeCompare(b.ffwLastLogin));
  }, [inScope]);
  const belowMastery = useMemo(() => inScope.filter((s) => s.mathMastery < 70).sort((a, b) => a.mathMastery - b.mathMastery), [inScope]);

  const sortedTable = useMemo(() => {
    const rows = [...perSchool];
    rows.sort((a, b) => {
      const av = sortKey === 'code' ? a.school.code : (a.kpis as any)[sortKey];
      const bv = sortKey === 'code' ? b.school.code : (b.kpis as any)[sortKey];
      const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
      return sortAsc ? cmp : -cmp;
    });
    return rows;
  }, [perSchool, sortKey, sortAsc]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortAsc((a) => !a);
    else { setSortKey(k); setSortAsc(true); }
  };

  const schoolOf = (id: number) => schools.find((s) => s.id === id);
  const handleLogout = async () => { await logout(); onLogout(); };

  return (
    <div className="min-h-screen">
      <header className="text-white" style={{ background: NAVY }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold" style={{ background: TEAL }}>ZLC</div>
            <span className="font-semibold">7th Grade Academy — Administrator</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <NotificationBell
              alerts={alerts}
              acknowledged={acked}
              onAcknowledge={(k) => setAcked((prev) => new Set(prev).add(k))}
              onOpen={(id) => setSelected(students.find((s) => s.id === id) ?? null)}
            />
            <span className="hidden sm:inline opacity-80">{user.name}</span>
            <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: GOLD, color: NAVY }}>{user.role.replace(/_/g, ' ')}</span>
            <button onClick={() => setManageUsers(true)} className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded">Manage Users</button>
            <button onClick={handleLogout} className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {loading && (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">
            Loading cross-school data…
          </div>
        )}
        {error && (
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: '#f0c0c0' }}>
            <p className="font-medium mb-1" style={{ color: '#c62828' }}>Couldn’t load data</p>
            <p className="text-sm text-gray-600 mb-3">{error}</p>
            <button onClick={load} className="text-sm text-white px-3 py-1.5 rounded-lg" style={{ background: NAVY }}>
              Retry
            </button>
          </div>
        )}
        {!loading && !error && students.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <p className="font-medium mb-1" style={{ color: NAVY }}>No data to display</p>
            <p className="text-sm text-gray-500">
              No student records are visible for your account yet. Once schools load their
              cohorts into the database they will appear here automatically.
            </p>
          </div>
        )}

        {!loading && !error && students.length > 0 && (
        <>
        {/* Global filter bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap items-center gap-3">
          <select value={schoolFilter} onChange={(e) => setSchoolFilter(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
            <option value={0}>All Schools</option>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-500" defaultValue="all" title="Programme (demo)">
            <option value="all">All Programmes</option><option>Fast ForWord</option><option>Clear Math</option><option>Classroom</option><option>RPI / IDRI</option>
          </select>
          <select className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-500" defaultValue="term" title="Date range (demo)">
            <option value="week">Current Week</option><option value="month">Current Month</option><option value="term">Current Term</option><option value="year">Full Academic Year</option>
          </select>
          <span className="text-xs text-gray-400 ml-auto">{inScope.length} students in scope</span>
        </div>

        {/* School summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {perSchool.map(({ school, kpis }) => (
            <button
              key={school.id}
              onClick={() => setSchoolFilter((cur) => (cur === school.id ? 0 : school.id))}
              className="text-left bg-white rounded-xl border p-4 transition-shadow hover:shadow-md"
              style={{ borderColor: schoolFilter === school.id ? TEAL : '#e5e7eb', borderWidth: schoolFilter === school.id ? 2 : 1 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-2.5 h-8 rounded" style={{ background: schoolColor(school.id) }} />
                <RiskBadge status={kpis.risk} />
              </div>
              <div className="font-semibold text-sm" style={{ color: NAVY }}>{school.name}</div>
              <div className="text-xs text-gray-400 mb-3">{school.code} · {kpis.enrolled} students</div>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <div><div className="text-gray-400 text-xs">Literacy benchmark</div><div className="font-semibold">{kpis.literacyBenchmarkPct}%</div></div>
                <div><div className="text-gray-400 text-xs">Attendance</div><div className="font-semibold">{kpis.attendanceAvg}%</div></div>
                <div><div className="text-gray-400 text-xs">FFW completion</div><div className="font-semibold">{kpis.ffwAvg}%</div></div>
                <div><div className="text-gray-400 text-xs">Math mastery</div><div className="font-semibold">{kpis.masteryAvg}%</div></div>
              </div>
            </button>
          ))}
        </div>

        {/* Cross-school comparison */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-semibold mb-1" style={{ color: NAVY }}>Literacy Benchmark Attainment by School</h2>
            <p className="text-xs text-gray-400 mb-2">% of students at or above grade level</p>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={benchmarkData} margin={{ top: 20, right: 12, left: 0, bottom: 4 }} barCategoryGap="45%">
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="code" tick={axisTick} tickLine={false} axisLine={{ stroke: AXIS }} />
                <YAxis domain={[0, 100]} width={30} tick={axisTick} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgba(30,58,95,0.05)' }} formatter={(v: number) => [`${v}%`, 'Benchmark']} contentStyle={{ borderRadius: 8, border: `1px solid ${AXIS}`, fontSize: 13 }} />
                <Bar dataKey="value" barSize={18} maxBarSize={20} radius={[4, 4, 0, 0]}>
                  {benchmarkData.map((d) => <Cell key={d.code} fill={schoolColor(d.id)} />)}
                  <LabelList dataKey="value" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 12, fill: INK_MUTED }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-semibold mb-1" style={{ color: NAVY }}>Programme KPIs by School</h2>
            <p className="text-xs text-gray-400 mb-2">Average FFW completion vs. Clear Math mastery</p>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={kpiBySchool} margin={{ top: 12, right: 12, left: 0, bottom: 4 }} barCategoryGap="30%" barGap={2}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="code" tick={axisTick} tickLine={false} axisLine={{ stroke: AXIS }} />
                <YAxis domain={[0, 100]} width={30} tick={axisTick} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgba(30,58,95,0.05)' }} formatter={(v: number) => [`${v}%`, '']} contentStyle={{ borderRadius: 8, border: `1px solid ${AXIS}`, fontSize: 13 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="FFW" name="FFW completion" fill={TEAL} barSize={12} maxBarSize={14} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Mastery" name="Math mastery" fill={NAVY} barSize={12} maxBarSize={14} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Scatter */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold mb-1" style={{ color: NAVY }}>FFW Completion vs. Reading-Level Gain</h2>
          <p className="text-xs text-gray-400 mb-2">One dot per student, coloured by school</p>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid stroke={GRID} />
              <XAxis type="number" dataKey="ffw" name="FFW %" domain={[0, 100]} tick={axisTick} tickLine={false} axisLine={{ stroke: AXIS }} label={{ value: 'FFW completion %', position: 'insideBottom', offset: -4, fontSize: 12, fill: INK_MUTED }} />
              <YAxis type="number" dataKey="gain" name="Reading gain" tick={axisTick} tickLine={false} axisLine={false} width={34} label={{ value: 'RPI gain', angle: -90, position: 'insideLeft', fontSize: 12, fill: INK_MUTED }} />
              <ZAxis range={[55, 55]} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} formatter={(v: number, n: string) => [n === 'FFW %' ? `${v}%` : `+${v}`, n]} contentStyle={{ borderRadius: 8, border: `1px solid ${AXIS}`, fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {scatterBySchool.map(({ school, points }) => (
                <Scatter key={school.id} name={school.code} data={points} fill={schoolColor(school.id)} fillOpacity={0.8} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Sortable KPI table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100"><h2 className="font-semibold" style={{ color: NAVY }}>All Schools — KPI Summary</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100" style={{ background: '#fafbfc' }}>
                  {([['code', 'School'], ['enrolled', 'Students'], ['literacyBenchmarkPct', 'Literacy %'], ['ffwAvg', 'FFW %'], ['masteryAvg', 'Mastery %'], ['attendanceAvg', 'Attendance %']] as [SortKey, string][]).map(
                    ([k, label]) => (
                      <th key={k} onClick={() => toggleSort(k)} className="py-2.5 px-4 cursor-pointer select-none text-gray-500 hover:text-gray-700">
                        {label}{sortKey === k ? (sortAsc ? ' ▲' : ' ▼') : ''}
                      </th>
                    ),
                  )}
                  <th className="py-2.5 px-4 text-gray-500">Risk</th>
                </tr>
              </thead>
              <tbody>
                {sortedTable.map(({ school, kpis }) => (
                  <tr key={school.id} className="border-b border-gray-50">
                    <td className="py-2.5 px-4 font-medium" style={{ color: NAVY }}>
                      <span className="inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: schoolColor(school.id) }} />{school.name}</span>
                    </td>
                    <td className="py-2.5 px-4">{kpis.enrolled}</td>
                    <td className="py-2.5 px-4">{kpis.literacyBenchmarkPct}%</td>
                    <td className="py-2.5 px-4">{kpis.ffwAvg}%</td>
                    <td className="py-2.5 px-4">{kpis.masteryAvg}%</td>
                    <td className="py-2.5 px-4">{kpis.attendanceAvg}%</td>
                    <td className="py-2.5 px-4"><RiskBadge status={kpis.risk} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Programme alert lists */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-semibold mb-1" style={{ color: NAVY }}>FFW Inactivity (5+ days)</h2>
            <p className="text-xs text-gray-400 mb-3">{inactivity.length} student(s) in scope</p>
            <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
              {inactivity.length === 0 && <p className="text-sm text-gray-400">None.</p>}
              {inactivity.map((s) => (
                <button key={s.id} onClick={() => setSelected(s)} className="w-full text-left py-2 flex justify-between hover:bg-gray-50 rounded px-1">
                  <span>{s.firstName} {s.lastName} <span className="text-xs text-gray-400">· {schoolOf(s.schoolId)?.code}</span></span>
                  <span className="text-sm" style={{ color: STATUS['Needs Attention'].fg }}>last login {s.ffwLastLogin}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-semibold mb-1" style={{ color: NAVY }}>Clear Math Below 70% Mastery</h2>
            <p className="text-xs text-gray-400 mb-3">{belowMastery.length} student(s) in scope</p>
            <div className="max-h-56 overflow-y-auto divide-y divide-gray-50">
              {belowMastery.length === 0 && <p className="text-sm text-gray-400">None.</p>}
              {belowMastery.map((s) => (
                <button key={s.id} onClick={() => setSelected(s)} className="w-full text-left py-2 flex justify-between hover:bg-gray-50 rounded px-1">
                  <span>{s.firstName} {s.lastName} <span className="text-xs text-gray-400">· {schoolOf(s.schoolId)?.code}</span></span>
                  <span className="text-sm" style={{ color: s.mathMastery < 50 ? STATUS['At Risk'].fg : STATUS['Needs Attention'].fg }}>{s.mathMastery}%</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reports & Export */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-semibold mb-1" style={{ color: NAVY }}>Reports &amp; Export</h2>
          <p className="text-xs text-gray-400 mb-3">Generate branded reports or export the data in scope.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => printCrossSchoolReport(students, schools)} className="px-3 py-2 rounded-lg text-sm text-white font-medium" style={{ background: NAVY }}>
              Cross-School Report (PDF)
            </button>
            <button onClick={() => exportRosterXlsx(inScope, schools, 'zlc-raw-data.xlsx')} className="px-3 py-2 rounded-lg text-sm font-medium border" style={{ color: NAVY, borderColor: '#d1d5db' }}>
              Raw Data Export (Excel)
            </button>
          </div>
        </div>

        {/* Student drill-down */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100">
            <h2 className="font-semibold" style={{ color: NAVY }}>Student Roster</h2>
            <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value as any)} className="text-sm border border-gray-300 rounded-lg px-3 py-1.5">
              <option value="All">All risk</option><option>On Track</option><option>Needs Attention</option><option>At Risk</option>
            </select>
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="sticky top-0" style={{ background: '#fafbfc' }}>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="py-2.5 px-4">Student</th><th className="py-2.5 px-4">School</th><th className="py-2.5 px-4">Literacy</th>
                  <th className="py-2.5 px-4">FFW %</th><th className="py-2.5 px-4">Mastery %</th><th className="py-2.5 px-4">Attend. %</th><th className="py-2.5 px-4">Risk</th>
                </tr>
              </thead>
              <tbody>
                {inScope.map((s) => (
                  <tr key={s.id} onClick={() => setSelected(s)} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
                    <td className="py-2.5 px-4 font-medium" style={{ color: NAVY }}>{s.firstName} {s.lastName}</td>
                    <td className="py-2.5 px-4 text-gray-500">{schoolOf(s.schoolId)?.code}</td>
                    <td className="py-2.5 px-4">{s.readingBand}</td>
                    <td className="py-2.5 px-4">{s.ffwCompletionPct}%</td>
                    <td className="py-2.5 px-4">{s.mathMastery}%</td>
                    <td className="py-2.5 px-4">{s.attendanceRate}%</td>
                    <td className="py-2.5 px-4"><RiskBadge status={s.riskStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}
      </main>

      {selected && <StudentProfileCard student={selected} school={schoolOf(selected.schoolId)} onClose={() => setSelected(null)} />}
      {manageUsers && <ManageUsers user={user} schools={schools} onClose={() => setManageUsers(false)} />}
    </div>
  );
}
