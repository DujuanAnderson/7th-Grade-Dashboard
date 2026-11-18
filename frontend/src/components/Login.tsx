import { useState } from 'react';
import { login } from '../lib/dataClient';
import type { CurrentUser } from '../lib/types';
import { GREEN, ACCENT, ACCENT_LIGHT } from '../lib/theme';
import { MailIcon, LockIcon, GraduationCapIcon, CheckCircleIcon, RefreshIcon } from './Icons';

const HIGHLIGHTS = [
  'Track literacy bands & Clear Math mastery',
  'Spot at-risk students before they fall behind',
  'Branded reports, exported in one click',
];

export default function Login({ onLogin }: { onLogin: (u: CurrentUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      onLogin(await login(email, password));
    } catch (err: any) {
      setError(err?.message ?? 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f4f9f6' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row">
        {/* Brand panel */}
        <div
          className="hidden md:flex md:w-2/5 flex-col justify-between p-10 text-white relative overflow-hidden"
          style={{ background: GREEN }}
        >
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-20" style={{ background: ACCENT_LIGHT }} />
          <div className="absolute bottom-10 -left-12 w-40 h-40 rounded-full opacity-10" style={{ background: ACCENT }} />
          <GraduationCapIcon size={140} className="absolute -bottom-8 -right-8 opacity-10" />

          <div className="relative z-10">
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-xl font-bold mb-6"
              style={{ background: ACCENT }}
            >
              ZLC
            </div>
            <h1 className="text-2xl font-bold leading-snug">7th Grade Academy</h1>
            <p className="text-sm opacity-80 mt-1">Data Dashboard</p>
          </div>

          <ul className="relative z-10 space-y-3 text-sm opacity-90">
            {HIGHLIGHTS.map((h) => (
              <li key={h} className="flex items-start gap-2">
                <CheckCircleIcon size={16} className="mt-0.5 flex-shrink-0" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Form panel */}
        <div className="flex-1 p-8 sm:p-10 flex flex-col justify-center">
          <div className="md:hidden text-center mb-6">
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-xl text-white font-bold mb-3"
              style={{ background: ACCENT }}
            >
              ZLC
            </div>
            <h1 className="text-xl font-bold" style={{ color: GREEN }}>7th Grade Academy</h1>
          </div>

          <h2 className="text-2xl font-bold" style={{ color: GREEN }}>Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6">Sign in to continue to your dashboard.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
              <div className="relative">
                <MailIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className={`w-full p-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[${ACCENT}] transition-shadow`}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
              <div className="relative">
                <LockIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className={`w-full p-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[${ACCENT}] transition-shadow`}
                  required
                />
              </div>
            </div>
            {error && <p className="text-sm text-center" style={{ color: '#c62828' }}>{error}</p>}
            <button
              type="submit" disabled={busy}
              className="w-full text-white p-3 rounded-lg font-semibold disabled:opacity-60 hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2"
              style={{ background: GREEN }}
            >
              {busy && <RefreshIcon size={16} className="animate-spin" />}
              {busy ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
