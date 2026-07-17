import { useRef, useState } from 'react';
import type { Student } from '../lib/types';
import { parseUpload, applyUpload, type Programme, type ParseResult } from '../lib/parsers';
import { NAVY, TEAL, STATUS, INK_MUTED } from '../lib/theme';

interface HistoryItem {
  fileName: string;
  programme: Programme;
  date: string;
  matched: number;
  status: string;
}

export default function UploadCentre({
  students, onApply, user,
}: {
  students: Student[];
  onApply: (next: Student[]) => void;
  user: string;
}) {
  const [programme, setProgramme] = useState<Programme>('ffw');
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError('');
    setResult(null);
    const name = file.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx')) {
      setError('File must be CSV or XLSX format.');
      return;
    }
    try {
      setResult(await parseUpload(file, programme, students));
    } catch (e: any) {
      setError(e?.message ?? 'Could not parse file.');
    }
  };

  const confirm = () => {
    if (!result) return;
    onApply(applyUpload(students, result));
    setHistory((h) => [
      {
        fileName: result.fileName,
        programme: result.programme,
        date: new Date().toISOString().slice(0, 16).replace('T', ' '),
        matched: result.matchedCount,
        status: 'Applied',
      },
      ...h,
    ]);
    setResult(null);
  };

  const chip = (label: string, n: number, tone: keyof typeof STATUS) => (
    <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: STATUS[tone].bg, color: STATUS[tone].fg }}>
      {label}: {n}
    </span>
  );

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold mb-1" style={{ color: NAVY }}>Upload Centre</h2>
        <p className="text-xs text-gray-400 mb-4">
          Upload Fast ForWord or Clear Math exports (CSV / XLSX). Files are parsed and validated before anything is applied.
        </p>

        <div className="flex items-center gap-2 mb-4">
          {(['ffw', 'clearmath'] as Programme[]).map((p) => (
            <button
              key={p}
              onClick={() => { setProgramme(p); setResult(null); }}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border"
              style={programme === p
                ? { background: NAVY, color: 'white', borderColor: NAVY }
                : { color: NAVY, borderColor: '#d1d5db' }}
            >
              {p === 'ffw' ? 'Fast ForWord' : 'Clear Math'}
            </button>
          ))}
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault(); setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors"
          style={{ borderColor: dragOver ? TEAL : '#d1d5db', background: dragOver ? '#f0faf9' : '#fafbfc' }}
        >
          <p className="text-sm" style={{ color: INK_MUTED }}>
            <strong>Drag &amp; drop</strong> a {programme === 'ffw' ? 'Fast ForWord' : 'Clear Math'} export here, or click to browse
          </p>
          <p className="text-xs text-gray-400 mt-1">Accepts .csv and .xlsx</p>
          <input
            ref={inputRef} type="file" accept=".csv,.xlsx" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          />
        </div>

        {error && <p className="text-sm mt-3" style={{ color: STATUS['At Risk'].fg }}>{error}</p>}

        {result && (
          <div className="mt-5 border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <span className="text-sm font-medium" style={{ color: NAVY }}>
                  {result.fileName} — {result.total} rows
                </span>
                <div className="flex gap-2">
                  {chip('Matched', result.matchedCount, 'On Track')}
                  {chip('Duplicates', result.duplicateCount, 'Needs Attention')}
                  {chip('Unmatched', result.unmatchedCount, 'At Risk')}
                </div>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-2 px-3">Row</th>
                    <th className="py-2 px-3">File identifier</th>
                    <th className="py-2 px-3">Matched student</th>
                    <th className="py-2 px-3">Key value</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r) => {
                    const tone = r.status === 'matched' ? 'On Track' : r.status === 'duplicate' ? 'Needs Attention' : 'At Risk';
                    const keyVal = result.programme === 'ffw' ? `${r.mapped.completionPct}% compl.` : `${r.mapped.masteryPct}% mastery`;
                    return (
                      <tr key={r.rowNum} className="border-b border-gray-50">
                        <td className="py-1.5 px-3 text-gray-400">{r.rowNum}</td>
                        <td className="py-1.5 px-3">{r.studentKey || <em className="text-gray-400">(blank)</em>}</td>
                        <td className="py-1.5 px-3">{r.matchedName ?? <span className="text-gray-400">—</span>}</td>
                        <td className="py-1.5 px-3 text-gray-500">{keyVal}</td>
                        <td className="py-1.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: STATUS[tone].bg, color: STATUS[tone].fg }}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Only the {result.matchedCount} matched row(s) will be applied. Unmatched rows are skipped for you to resolve.
              </span>
              <div className="flex gap-2">
                <button onClick={() => setResult(null)} className="px-3 py-1.5 rounded-lg text-sm border border-gray-300">Cancel</button>
                <button
                  onClick={confirm}
                  disabled={result.matchedCount === 0}
                  className="px-3 py-1.5 rounded-lg text-sm text-white font-medium disabled:opacity-50"
                  style={{ background: TEAL }}
                >
                  Confirm &amp; apply {result.matchedCount} row(s)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold mb-3" style={{ color: NAVY }}>Upload History</h3>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400">No uploads yet this session.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">File</th><th className="py-2">Programme</th>
                <th className="py-2">When</th><th className="py-2">Uploaded by</th>
                <th className="py-2">Matched</th><th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-2">{h.fileName}</td>
                  <td className="py-2">{h.programme === 'ffw' ? 'Fast ForWord' : 'Clear Math'}</td>
                  <td className="py-2 text-gray-500">{h.date}</td>
                  <td className="py-2 text-gray-500">{user}</td>
                  <td className="py-2">{h.matched}</td>
                  <td className="py-2">{h.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
