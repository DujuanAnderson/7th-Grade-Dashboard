import * as XLSX from 'xlsx';
import type { Student } from './types';
import { computeRisk } from './mockData';

export type Programme = 'ffw' | 'clearmath';

export interface ParsedRow {
  rowNum: number;
  studentKey: string;
  matchedId: number | null;
  matchedName: string | null;
  status: 'matched' | 'unmatched' | 'duplicate';
  mapped: Record<string, string | number>;
}

export interface ParseResult {
  programme: Programme;
  fileName: string;
  total: number;
  matchedCount: number;
  unmatchedCount: number;
  duplicateCount: number;
  rows: ParsedRow[];
}

const norm = (s: string) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

function num(v: unknown): number {
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

// Locate a column value by fuzzy header keywords (all fragments must appear).
function field(row: Record<string, unknown>, normMap: Record<string, string>, needles: string[]): unknown {
  for (const [n, orig] of Object.entries(normMap)) {
    if (needles.every((k) => n.includes(k))) return row[orig];
  }
  return undefined;
}

function matchStudent(key: string, students: Student[]): Student | undefined {
  const k = norm(key);
  if (!k) return undefined;
  // 1) exact ZLC id, 2) exact full name, 3) fuzzy contains.
  return (
    students.find((s) => norm(s.zlcId) === k) ||
    students.find((s) => norm(`${s.firstName}${s.lastName}`) === k) ||
    students.find((s) => {
      const full = norm(`${s.firstName}${s.lastName}`);
      return full.includes(k) || k.includes(full);
    })
  );
}

export async function parseUpload(
  file: File,
  programme: Programme,
  students: Student[],
): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

  const seen = new Set<number>();
  const rows: ParsedRow[] = raw.map((r, i) => {
    const normMap: Record<string, string> = {};
    for (const key of Object.keys(r)) normMap[norm(key)] = key;

    const studentKey = String(field(r, normMap, ['student']) ?? '').trim();

    const mapped: Record<string, string | number> =
      programme === 'ffw'
        ? {
            protocol: String(field(r, normMap, ['protocol']) ?? ''),
            completionPct: num(field(r, normMap, ['completion'])),
            points: num(field(r, normMap, ['points'])),
            sessions: num(field(r, normMap, ['session'])),
            lastLogin: String(field(r, normMap, ['login']) ?? ''),
            levelGain: num(field(r, normMap, ['gain'])),
          }
        : {
            topic: String(field(r, normMap, ['topic']) ?? field(r, normMap, ['assignment']) ?? ''),
            scorePct: num(field(r, normMap, ['score'])),
            masteryPct: num(field(r, normMap, ['mastery'])),
            completionPct: num(field(r, normMap, ['completion'])),
            lastActivity: String(field(r, normMap, ['activity']) ?? ''),
            timeMinutes: num(field(r, normMap, ['time'])),
          };

    const match = matchStudent(studentKey, students);
    let status: ParsedRow['status'];
    if (!match) status = 'unmatched';
    else if (seen.has(match.id)) status = 'duplicate';
    else {
      status = 'matched';
      seen.add(match.id);
    }

    return {
      rowNum: i + 2, // +1 header, +1 to 1-index
      studentKey,
      matchedId: match?.id ?? null,
      matchedName: match ? `${match.firstName} ${match.lastName}` : null,
      status,
      mapped,
    };
  });

  return {
    programme,
    fileName: file.name,
    total: rows.length,
    matchedCount: rows.filter((r) => r.status === 'matched').length,
    unmatchedCount: rows.filter((r) => r.status === 'unmatched').length,
    duplicateCount: rows.filter((r) => r.status === 'duplicate').length,
    rows,
  };
}

// Apply only the matched rows to the cohort (partial upload). Returns a new array.
export function applyUpload(students: Student[], result: ParseResult): Student[] {
  const byId = new Map(result.rows.filter((r) => r.status === 'matched').map((r) => [r.matchedId!, r]));
  return students.map((s) => {
    const row = byId.get(s.id);
    if (!row) return s;
    const next = { ...s };
    if (result.programme === 'ffw') {
      next.ffwCompletionPct = row.mapped.completionPct as number;
      next.ffwProtocol = (row.mapped.protocol as string) || s.ffwProtocol;
      if (row.mapped.lastLogin) next.ffwLastLogin = String(row.mapped.lastLogin);
    } else {
      next.mathMastery = row.mapped.masteryPct as number;
      if (row.mapped.lastActivity) next.mathLastActivity = String(row.mapped.lastActivity);
    }
    next.riskStatus = computeRisk(next.ffwCompletionPct, next.mathMastery, next.attendanceRate);
    return next;
  });
}
