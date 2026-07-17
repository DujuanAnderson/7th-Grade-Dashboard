import { useState } from 'react';
import { login, DEMO_MODE, type DemoRole } from '../lib/dataClient';
import type { CurrentUser } from '../lib/types';
import { NAVY, TEAL, GOLD } from '../lib/theme';

export default function Login({ onLogin }: { onLogin: (u: CurrentUser) => void }) {
  const [email, setEmail] = useState(DEMO_MODE ? 'teacher@demo.zlc' : '');
  const [password, setPassword] = useState(DEMO_MODE ? 'demo' : '');
  const [demoRole, setDemoRole] = useState<DemoRole>('teacher');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      onLogin(await login(email, password, demoRole));
    } catch (err: any) {
      setError(err?.message ?? 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: NAVY }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="h-2" style={{ background: GOLD }} />
        <div className="p-8">
          <div className="text-center mb-6">
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-xl text-white font-bold mb-3"
              style={{ background: TEAL }}
            >
              ZLC
            </div>
            <h1 className="text-2xl font-bold" style={{ color: NAVY }}>7th Grade Academy</h1>
            <p className="text-sm text-gray-500">Data Dashboard</p>
          </div>

          {DEMO_MODE && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">Sign in as (demo)</label>
              <div className="grid grid-cols-2 gap-2">
                {([['teacher', 'Teacher'], ['admin', 'Administrator']] as [DemoRole, string][]).map(([r, label]) => (
                  <button
                    key={r} type="button" onClick={() => setDemoRole(r)}
                    className="px-3 py-2 rounded-lg text-sm font-medium border"
                    style={demoRole === r ? { background: NAVY, color: 'white', borderColor: NAVY } : { color: NAVY, borderColor: '#d1d5db' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                style={{ outlineColor: TEAL }} required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2" required
              />
            </div>
            {error && <p className="text-sm text-center" style={{ color: '#c62828' }}>{error}</p>}
            <button
              type="submit" disabled={busy}
              className="w-full text-white p-3 rounded-lg font-semibold disabled:opacity-60"
              style={{ background: NAVY }}
            >
              {busy ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {DEMO_MODE && (
            <div className="mt-6 text-xs text-center text-gray-500 bg-gray-50 rounded-lg p-3">
              <strong>Demo mode</strong> — no Supabase configured. Any email/password
              works and loads a sample cohort.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
