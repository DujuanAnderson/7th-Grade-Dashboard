import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CurrentUser, Student, School, RiskStatus } from '../lib/types';
import { getStudents, getSchools, logout } from '../lib/dataClient';
import { classMasteryTrend } from '../lib/compute';
import { NAVY, GOLD, TEAL, STATUS, BAND_COLOR, INK_MUTED } from '../lib/theme';
import { ReadingBandChart, MasteryTrendChart } from './Charts';
import StudentProfileCard from './StudentProfileCard';
import UploadCentre from './UploadCentre';
import DataEntry from './DataEntry';
import NotificationBell from './NotificationBell';
import { evaluateAlerts } from '../lib/alerts';
import { exportRosterXlsx } from '../lib/exports';

type Tab = 'overview' | 'upload' | 'entry';

const BANDS = ['Below', 'Approaching', 'At', 'Above'] as const;
const RISKS: RiskStatus[] = ['On Track', 'Needs Attention', 'At Risk'];

function RiskBadge({ status }: { status: RiskStatus }) {
  const s = STATUS[status];
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap" style={{ background: s.bg, color: s.fg }}>
      {status}
    </span>
  );
}

export default function TeacherDashboard({ user, onLogout }: { user: CurrentUser; onLogout: () => void }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selected, setSelected] = useState<Student | null>(null);
  const [riskFilter, setRiskFilter] = useState<'All' | RiskStatus>('All');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [acked, setAcked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const alerts = useMemo(() => evaluateAlerts(students), [students]);
  const openStudent = (id: number) => setSelected(students.find((s) => s.id === id) ?? null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [st, sc] = await Promise.all([getStudents(), getSchools()]);
      setStudents(st);
      setSchools(sc);
    } catch (e: any) {
      setError(e?.message ?? 'Could not load your cohort.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const masteryTrend = useMemo(() => classMasteryTrend(students), [students]);
  const school = schools.find((s) => s.id === user.schoolId);

  const counts = useMemo(() => {
    const c: Record<RiskStatus, number> = { 'On Track': 0, 'Needs Attention': 0, 'At Risk': 0 };
    students.forEach((s) => (c[s.riskStatus] += 1));
    return c;
  }, [students]);

  const bandData = useMemo(
    () => BANDS.map((band) => ({ band, count: students.filter((s) => s.readingBand === band).length })),
    [students],
  );

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (riskFilter !== 'All' && s.riskStatus !== riskFilter) return false;
      if (query && !`${s.firstName} ${s.lastName}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [students, riskFilter, query]);

  const handleLogout = async () => {
    await logout();
    onLogout();
  };

  return (
    <div className="min-h-screen">
      {/* Top nav */}
      <header className="text-white" style={{ background: NAVY }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold" style={{ background: TEAL }}>ZLC</div>
            <span className="font-semibold">7th Grade Academy</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <NotificationBell
              alerts={alerts}
              acknowledged={acked}
              onAcknowledge={(k) => setAcked((prev) => new Set(prev).add(k))}
              onOpen={openStudent}
            />
            <span className="hidden sm:inline opacity-80">{user.name}</span>
            <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: GOLD, color: NAVY }}>
              {user.role.replace(/_/g, ' ')}
            </span>
            <button onClick={handleLogout} className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Cohort header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: NAVY }}>My Cohort at a Glance</h1>
            <p className="text-gray-500 text-sm">
              {user.name} · {school?.name} ({school?.code}) · {user.cohortName} · {students.length} students
            </p>
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">
            Loading your cohort…
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
            <p className="font-medium mb-1" style={{ color: NAVY }}>No students to display</p>
            <p className="text-sm text-gray-500">
              No records are visible for your account yet. Once your cohort is loaded into the
              database it will appear here automatically.
            </p>
          </div>
        )}

        {!loading && !error && students.length > 0 && (
        <>
        {/* Tabs */}
        <div className="border-b border-gray-200 flex gap-1">
          {([['overview', 'Overview'], ['upload', 'Upload Centre'], ['entry', 'Data Entry']] as [Tab, string][]).map(
            ([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="px-4 py-2 text-sm font-medium -mb-px border-b-2"
                style={tab === key
                  ? { color: NAVY, borderColor: TEAL }
                  : { color: INK_MUTED, borderColor: 'transparent' }}
              >
                {label}
              </button>
            ),
          )}
        </div>

        {tab === 'overview' && (
        <>
        {/* Quick stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {RISKS.map((r) => (
            <div key={r} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">{r}</div>
                <div className="text-3xl font-bold" style={{ color: STATUS[r].fg }}>{counts[r]}</div>
              </div>
              <span className="w-3 h-3 rounded-full" style={{ background: STATUS[r].dot }} />
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-semibold mb-1" style={{ color: NAVY }}>Reading Level Band Distribution</h2>
            <p className="text-xs text-gray-400 mb-2">Students in each literacy band</p>
            <ReadingBandChart data={bandData} />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="font-semibold mb-1" style={{ color: NAVY }}>Class Mastery vs. Benchmark</h2>
            <p className="text-xs text-gray-400 mb-2">Clear Math concept mastery, rolling 6 weeks</p>
            <MasteryTrendChart data={masteryTrend} />
          </div>
        </div>

        {/* Roster */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100">
            <h2 className="font-semibold" style={{ color: NAVY }}>My Students' Roster</h2>
            <div className="flex gap-2">
              <input
                placeholder="Search name…" value={query} onChange={(e) => setQuery(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 w-40"
              />
              <select
                value={riskFilter} onChange={(e) => setRiskFilter(e.target.value as any)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
              >
                <option value="All">All risk</option>
                {RISKS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <button
                onClick={() => exportRosterXlsx(filtered, schools, `${school?.code ?? 'cohort'}-roster.xlsx`)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50"
                title="Download the current roster as an Excel file"
              >
                Export Excel
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100" style={{ background: '#fafbfc' }}>
                  <th className="py-2.5 px-4">Student</th>
                  <th className="py-2.5 px-4">Literacy Band</th>
                  <th className="py-2.5 px-4">FFW %</th>
                  <th className="py-2.5 px-4">Last Math Activity</th>
                  <th className="py-2.5 px-4">Attend. Streak</th>
                  <th className="py-2.5 px-4">Risk</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr
                    key={s.id} onClick={() => setSelected(s)}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="py-2.5 px-4 font-medium" style={{ color: NAVY }}>{s.firstName} {s.lastName}</td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: BAND_COLOR[s.readingBand] }} />
                        {s.readingBand}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">{s.ffwCompletionPct}%</td>
                    <td className="py-2.5 px-4 text-gray-500">{s.mathLastActivity}</td>
                    <td className="py-2.5 px-4">{s.attendanceStreak}</td>
                    <td className="py-2.5 px-4"><RiskBadge status={s.riskStatus} /></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="py-6 text-center text-gray-400">No students match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}

        {tab === 'upload' && (
          <UploadCentre students={students} onApply={setStudents} user={user.name} />
        )}
        {tab === 'entry' && (
          <DataEntry students={students} onUpdate={setStudents} />
        )}
        </>
        )}
      </main>

      {selected && (
        <StudentProfileCard
          student={students.find((s) => s.id === selected.id) ?? selected}
          school={school}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
