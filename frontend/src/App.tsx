import { useEffect, useState } from 'react';
import type { CurrentUser } from './lib/types';
import { isAdminRole, getCurrentUser, onSignedOut } from './lib/dataClient';
import { GREEN } from './lib/theme';
import Login from './components/Login';
import TeacherDashboard from './components/TeacherDashboard';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    getCurrentUser().then(setUser).finally(() => setCheckingSession(false));
    return onSignedOut(() => setUser(null));
  }, []);

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: GREEN }}>
        <p className="text-white text-sm">Loading…</p>
      </div>
    );
  }

  if (!user) return <Login onLogin={setUser} />;
  // Routed by role (spec §3): admin roles land on the cross-school dashboard.
  return isAdminRole(user.role)
    ? <AdminDashboard user={user} onLogout={() => setUser(null)} />
    : <TeacherDashboard user={user} onLogout={() => setUser(null)} />;
}
