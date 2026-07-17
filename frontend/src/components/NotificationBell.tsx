import { useState } from 'react';
import type { EngineAlert } from '../lib/alerts';
import { NAVY, STATUS } from '../lib/theme';

export default function NotificationBell({
  alerts, acknowledged, onAcknowledge, onOpen,
}: {
  alerts: EngineAlert[];
  acknowledged: Set<string>;
  onAcknowledge: (key: string) => void;
  onOpen: (studentId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = alerts.filter((a) => !acknowledged.has(a.key));

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative bg-white/10 hover:bg-white/20 rounded px-2.5 py-1.5"
        aria-label="Notifications"
        title="Alerts"
      >
        <span aria-hidden>🔔</span>
        {active.length > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-bold flex items-center justify-center text-white"
            style={{ background: STATUS['At Risk'].dot }}
          >
            {active.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-96 max-h-[70vh] overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-200 z-50 text-gray-800">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="font-semibold" style={{ color: NAVY }}>Notification Centre</span>
              <span className="text-xs text-gray-400">{active.length} active</span>
            </div>
            {alerts.length === 0 && <p className="p-4 text-sm text-gray-400">No alerts triggered.</p>}
            <ul>
              {alerts.map((a) => {
                const ack = acknowledged.has(a.key);
                const c = a.severity === 'red' ? STATUS['At Risk'] : STATUS['Needs Attention'];
                return (
                  <li key={a.key} className="px-4 py-3 border-b border-gray-50" style={{ opacity: ack ? 0.55 : 1 }}>
                    <div className="flex items-start gap-2">
                      <span className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.dot }} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{a.type}</div>
                        <button className="text-xs underline" style={{ color: NAVY }} onClick={() => { onOpen(a.studentId); setOpen(false); }}>
                          {a.studentName}
                        </button>
                        <div className="text-xs text-gray-500">{a.detail}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">To: {a.recipients}</div>
                      </div>
                      {!ack && (
                        <button onClick={() => onAcknowledge(a.key)} className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50">
                          Ack
                        </button>
                      )}
                      {ack && <span className="text-[11px] text-gray-400">Acknowledged</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
