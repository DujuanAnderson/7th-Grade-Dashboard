import { useState } from 'react';
import type { CurrentUser } from './lib/types';
import { isAdminRole } from './lib/dataClient';
import Login from './components/Login';
import TeacherDashboard from './components/TeacherDashboard';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [user, setUser] = useState<CurrentUser | null>(null);

  if (!user) return <Login onLogin={setUser} />;
  // Routed by role (spec §3): admin roles land on the cross-school dashboard.
  return isAdminRole(user.role)
    ? <AdminDashboard user={user} onLogout={() => setUser(null)} />
    : <TeacherDashboard user={user} onLogout={() => setUser(null)} />;
}
