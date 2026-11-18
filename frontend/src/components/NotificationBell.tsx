import { useState } from 'react';
import type { EngineAlert } from '../lib/alerts';
import { GREEN, ACCENT, STATUS } from '../lib/theme';
import { XIcon, CheckCircleIcon, AlertTriangleIcon, AlertOctagonIcon, ChevronDownIcon, ChevronUpIcon } from './Icons';

export default function NotificationBell({
  alerts, acknowledged, onAcknowledge, onUnacknowledge, onOpen,
}: {
  alerts: EngineAlert[];
  acknowledged: Set<string>;
  onAcknowledge: (key: string) => void;
  onUnacknowledge: (key: string) => void;
  onOpen: (studentId: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showAcked, setShowAcked] = useState(false);

  const active = alerts.filter((a) => !acknowledged.has(a.key));
  const acked = alerts.filter((a) => acknowledged.has(a.key));
  const critical = active.filter((a) => a.severity === 'red');
  const attention = active.filter((a) => a.severity === 'amber');
  const badgeColor = critical.length > 0 ? STATUS['At Risk'].dot : STATUS['Needs Attention'].dot;

  const close = () => setOpen(false);
  const ackAll = () => active.forEach((a) => onAcknowledge(a.key));

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative bg-white/10 hover:bg-white/20 rounded px-2.5 py-1.5"
        aria-label="Notifications"
        title="Alerts"
      >
        <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 1 1 12 0c0 3.2 1.2 5.3 2 6.5.4.6 0 1.5-.8 1.5H4.8c-.8 0-1.2-.9-.8-1.5.8-1.2 2-3.3 2-6.5Z" />
          <path d="M9.5 19a2.5 2.5 0 0 0 5 0" />
        </svg>
        {active.length > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-bold flex items-center justify-center text-white"
            style={{ background: badgeColor }}
          >
            {active.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div className="absolute right-0 mt-2 w-96 max-h-[75vh] overflow-y-auto bg-white rounded-xl shadow-2xl border border-gray-200 z-50 text-gray-800">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <div className="font-semibold" style={{ color: GREEN }}>Notification Centre</div>
                <div className="text-xs text-gray-400">
                  {active.length === 0 ? "You're all caught up" : `${active.length} active`}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {active.length > 0 && (
                  <button onClick={ackAll} className="text-xs font-medium hover:underline whitespace-nowrap" style={{ color: ACCENT }}>
                    Acknowledge all
                  </button>
                )}
                <button onClick={close} className="text-gray-400 hover:text-gray-600" aria-label="Close notifications">
                  <XIcon size={16} />
                </button>
              </div>
            </div>

            {alerts.length === 0 && (
              <div className="p-6 text-center">
                <CheckCircleIcon size={28} className="mx-auto mb-2" style={{ color: STATUS['On Track'].dot }} />
                <p className="text-sm text-gray-500">No alerts right now — you're all caught up.</p>
              </div>
            )}

            {alerts.length > 0 && active.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-500 border-b border-gray-50 flex items-center gap-2">
                <CheckCircleIcon size={16} style={{ color: STATUS['On Track'].dot }} />
                No active alerts.
              </div>
            )}

            {critical.length > 0 && (
              <AlertGroup
                label="Critical"
                alerts={critical}
                onOpen={onOpen}
                onClosePanel={close}
                action={(a) => <AckButton onClick={() => onAcknowledge(a.key)} />}
              />
            )}
            {attention.length > 0 && (
              <AlertGroup
                label="Needs attention"
                alerts={attention}
                onOpen={onOpen}
                onClosePanel={close}
                action={(a) => <AckButton onClick={() => onAcknowledge(a.key)} />}
              />
            )}

            {acked.length > 0 && (
              <div>
                <button
                  onClick={() => setShowAcked((v) => !v)}
                  className="w-full px-4 py-2.5 text-xs font-medium text-gray-500 hover:bg-gray-50 flex items-center justify-between"
                >
                  <span>Acknowledged ({acked.length})</span>
                  {showAcked ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
                </button>
                {showAcked && (
                  <AlertGroup
                    alerts={acked}
                    onOpen={onOpen}
                    onClosePanel={close}
                    dimmed
                    action={(a) => (
                      <button
                        onClick={() => onUnacknowledge(a.key)}
                        className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 whitespace-nowrap"
                        title="Move this alert back to active"
                      >
                        Undo
                      </button>
                    )}
                  />
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function AckButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 inline-flex items-center gap-1 whitespace-nowrap">
      <CheckCircleIcon size={12} /> Acknowledge
    </button>
  );
}

function AlertGroup({
  label, alerts, onOpen, onClosePanel, action, dimmed,
}: {
  label?: string;
  alerts: EngineAlert[];
  onOpen: (id: number) => void;
  onClosePanel: () => void;
  action: (a: EngineAlert) => React.ReactNode;
  dimmed?: boolean;
}) {
  return (
    <div>
      {label && (
        <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      )}
      <ul>
        {alerts.map((a) => {
          const SeverityIcon = a.severity === 'red' ? AlertOctagonIcon : AlertTriangleIcon;
          const color = a.severity === 'red' ? STATUS['At Risk'].dot : STATUS['Needs Attention'].dot;
          return (
            <li key={a.key} className="px-4 py-3 border-b border-gray-50" style={{ opacity: dimmed ? 0.6 : 1 }}>
              <div className="flex items-start gap-2">
                <SeverityIcon size={16} className="mt-0.5 flex-shrink-0" style={{ color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{a.type}</div>
                  <button className="text-xs underline" style={{ color: GREEN }} onClick={() => { onOpen(a.studentId); onClosePanel(); }}>
                    {a.studentName}
                  </button>
                  <div className="text-xs text-gray-500">{a.detail}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">To: {a.recipients}</div>
                </div>
                {action(a)}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
