import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CurrentUser, School, UserProfile, UserRole } from '../lib/types';
import { USER_ROLES, SCHOOL_SCOPED_ROLES, roleLabel } from '../lib/types';
import { getUsers, updateUser, deleteUser, createUser } from '../lib/dataClient';
import { NAVY, TEAL, GOLD, INK_MUTED, schoolColor } from '../lib/theme';

function RolePill({ role }: { role: UserRole }) {
  const allSchool = !SCHOOL_SCOPED_ROLES.includes(role);
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ background: allSchool ? '#eef2f7' : '#f4f6f8', color: allSchool ? NAVY : INK_MUTED }}
    >
      {roleLabel(role)}
    </span>
  );
}

export default function ManageUsers({
  user, schools, onClose,
}: {
  user: CurrentUser; schools: School[]; onClose: () => void;
}) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<UserProfile | null>(null);

  // Add-user form state.
  const [showAdd, setShowAdd] = useState(false);
  const [nEmail, setNEmail] = useState('');
  const [nPassword, setNPassword] = useState('');
  const [nRole, setNRole] = useState<UserRole>('teacher');
  const [nSchool, setNSchool] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addNotice, setAddNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await getUsers());
    } catch (e: any) {
      setError(e?.message ?? 'Could not load user accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const schoolName = (id: number | null) =>
    id == null ? '—' : (schools.find((s) => s.id === id)?.name ?? `School ${id}`);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        roleLabel(u.role).toLowerCase().includes(q) ||
        schoolName(u.schoolId).toLowerCase().includes(q),
    );
  }, [users, query, schools]);

  const patch = async (u: UserProfile, changes: { role?: UserRole; schoolId?: number | null }) => {
    setSavingId(u.id);
    setRowError((p) => { const n = { ...p }; delete n[u.id]; return n; });
    try {
      const saved = await updateUser(u.id, changes);
      setUsers((prev) => prev.map((x) => (x.id === u.id ? saved : x)));
    } catch (e: any) {
      setRowError((p) => ({ ...p, [u.id]: e?.message ?? 'Update failed.' }));
    } finally {
      setSavingId(null);
    }
  };

  const changeRole = (u: UserProfile, role: UserRole) => {
    // Moving to a school-scoped role with no school set → default to the first
    // school so the account isn't left unscoped. All-school roles clear it.
    const nextSchool = SCHOOL_SCOPED_ROLES.includes(role)
      ? (u.schoolId ?? schools[0]?.id ?? null)
      : null;
    patch(u, { role, schoolId: nextSchool });
  };

  const remove = async (u: UserProfile) => {
    setSavingId(u.id);
    setRowError((p) => { const n = { ...p }; delete n[u.id]; return n; });
    try {
      await deleteUser(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      setConfirmDelete(null);
    } catch (e: any) {
      setRowError((p) => ({ ...p, [u.id]: e?.message ?? 'Remove failed.' }));
    } finally {
      setSavingId(null);
    }
  };

  const nScoped = SCHOOL_SCOPED_ROLES.includes(nRole);

  const resetAdd = () => {
    setNEmail(''); setNPassword(''); setNRole('teacher'); setNSchool(null);
    setAddError(null); setAddNotice(null);
  };

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null); setAddNotice(null);
    const email = nEmail.trim();
    if (!email || nPassword.length < 8) {
      setAddError('Enter an email and a password of at least 8 characters.');
      return;
    }
    const schoolId = nScoped ? (nSchool ?? schools[0]?.id ?? null) : null;
    if (nScoped && schoolId == null) {
      setAddError('Select a school for this role.');
      return;
    }
    setCreating(true);
    try {
      const created = await createUser({ email, password: nPassword, role: nRole, schoolId });
      setUsers((prev) => [created, ...prev]);
      resetAdd();
      setShowAdd(false);
      setAddNotice(`Created ${created.email}.`);
    } catch (err: any) {
      setAddError(err?.message ?? 'Could not create the account.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4"
      style={{ background: 'rgba(21,43,70,0.55)' }}
      onClick={onClose}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-6" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 rounded-t-2xl text-white flex justify-between items-start" style={{ background: NAVY }}>
          <div>
            <h2 className="text-2xl font-bold">Manage Users</h2>
            <p className="text-sm opacity-80">
              Assign roles and school scope, or remove accounts. {users.length} account{users.length === 1 ? '' : 's'}.
            </p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white text-2xl leading-none" aria-label="Close">×</button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by email, role or school…"
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[200px]"
            />
            <button
              onClick={load}
              className="text-sm px-3 py-1.5 rounded-lg border font-medium"
              style={{ color: NAVY, borderColor: '#d1d5db' }}
            >
              Refresh
            </button>
            <button
              onClick={() => { setShowAdd((v) => !v); setAddError(null); setAddNotice(null); }}
              className="text-sm px-3 py-1.5 rounded-lg text-white font-medium"
              style={{ background: TEAL }}
            >
              {showAdd ? 'Close' : '+ Add User'}
            </button>
          </div>

          {addNotice && !showAdd && (
            <p className="text-sm" style={{ color: TEAL }}>{addNotice}</p>
          )}

          {showAdd && (
            <form onSubmit={submitAdd} className="rounded-xl border border-gray-200 p-4 space-y-3" style={{ background: '#fafbfc' }}>
              <div className="font-semibold text-sm" style={{ color: NAVY }}>New account</div>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-gray-500">Email</span>
                  <input
                    type="email" value={nEmail} onChange={(e) => setNEmail(e.target.value)}
                    placeholder="name@zlc.demo" autoComplete="off"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">Temporary password (min 8 chars)</span>
                  <input
                    type="text" value={nPassword} onChange={(e) => setNPassword(e.target.value)}
                    placeholder="set an initial password" autoComplete="new-password"
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">Role</span>
                  <select
                    value={nRole}
                    onChange={(e) => {
                      const r = e.target.value as UserRole;
                      setNRole(r);
                      if (SCHOOL_SCOPED_ROLES.includes(r) && nSchool == null) setNSchool(schools[0]?.id ?? null);
                    }}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                  >
                    {USER_ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-gray-500">School</span>
                  {nScoped ? (
                    <select
                      value={nSchool ?? ''}
                      onChange={(e) => setNSchool(Number(e.target.value))}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                    >
                      {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  ) : (
                    <div className="mt-1 px-3 py-1.5 text-sm text-gray-400 border border-transparent">All schools (role is cross-school)</div>
                  )}
                </label>
              </div>
              {addError && <p className="text-sm" style={{ color: '#c62828' }}>{addError}</p>}
              <div className="flex items-center gap-2">
                <button
                  type="submit" disabled={creating}
                  className="text-sm px-3 py-1.5 rounded-lg text-white font-medium disabled:opacity-60"
                  style={{ background: NAVY }}
                >
                  {creating ? 'Creating…' : 'Create account'}
                </button>
                <button type="button" onClick={() => { resetAdd(); setShowAdd(false); }} className="text-sm px-3 py-1.5 rounded-lg border">
                  Cancel
                </button>
                <span className="text-xs text-gray-400">The user signs in with this email &amp; password; they can change it later.</span>
              </div>
            </form>
          )}

          <p className="text-xs text-gray-400">
            New sign-ins are provisioned server-side (they require a Supabase auth user). Roles determine
            access: <span style={{ color: NAVY }}>all-school</span> roles see every school; School Admin and
            Teacher are scoped to one school.
          </p>

          {loading && <div className="p-8 text-center text-gray-500 text-sm">Loading accounts…</div>}

          {error && !loading && (
            <div className="rounded-lg border p-4" style={{ borderColor: '#f0c0c0' }}>
              <p className="text-sm font-medium mb-2" style={{ color: '#c62828' }}>{error}</p>
              <button onClick={load} className="text-sm text-white px-3 py-1.5 rounded-lg" style={{ background: NAVY }}>Retry</button>
            </div>
          )}

          {!loading && !error && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto max-h-[52vh]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0" style={{ background: '#fafbfc' }}>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="py-2.5 px-4">Account</th>
                      <th className="py-2.5 px-4">Role</th>
                      <th className="py-2.5 px-4">School</th>
                      <th className="py-2.5 px-4">Last login</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr><td colSpan={5} className="py-8 px-4 text-center text-gray-400">No matching accounts.</td></tr>
                    )}
                    {filtered.map((u) => {
                      const isSelf = u.email.toLowerCase() === user.email.toLowerCase();
                      const scoped = SCHOOL_SCOPED_ROLES.includes(u.role);
                      const busy = savingId === u.id;
                      return (
                        <tr key={u.id} className="border-b border-gray-50 align-top">
                          <td className="py-2.5 px-4">
                            <div className="font-medium" style={{ color: NAVY }}>
                              {u.email || '(no email)'}
                              {isSelf && <span className="ml-2 text-xs" style={{ color: TEAL }}>you</span>}
                            </div>
                            <div className="mt-1"><RolePill role={u.role} /></div>
                            {rowError[u.id] && <div className="text-xs mt-1" style={{ color: '#c62828' }}>{rowError[u.id]}</div>}
                          </td>
                          <td className="py-2.5 px-4">
                            <select
                              value={u.role}
                              disabled={busy}
                              onChange={(e) => changeRole(u, e.target.value as UserRole)}
                              className="border border-gray-300 rounded-lg px-2 py-1 text-sm disabled:opacity-50"
                            >
                              {USER_ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                            </select>
                          </td>
                          <td className="py-2.5 px-4">
                            {scoped ? (
                              <div className="inline-flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: schoolColor(u.schoolId ?? 1) }} />
                                <select
                                  value={u.schoolId ?? ''}
                                  disabled={busy}
                                  onChange={(e) => patch(u, { schoolId: Number(e.target.value) })}
                                  className="border border-gray-300 rounded-lg px-2 py-1 text-sm disabled:opacity-50"
                                >
                                  {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                              </div>
                            ) : (
                              <span className="text-gray-400">All schools</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-gray-500 whitespace-nowrap">
                            {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never'}
                          </td>
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            {confirmDelete?.id === u.id ? (
                              <span className="inline-flex items-center gap-2">
                                <span className="text-xs text-gray-500">Remove?</span>
                                <button
                                  onClick={() => remove(u)}
                                  disabled={busy}
                                  className="text-xs px-2 py-1 rounded text-white font-medium disabled:opacity-50"
                                  style={{ background: '#c62828' }}
                                >
                                  {busy ? '…' : 'Confirm'}
                                </button>
                                <button onClick={() => setConfirmDelete(null)} className="text-xs px-2 py-1 rounded border">Cancel</button>
                              </span>
                            ) : (
                              <button
                                onClick={() => setConfirmDelete(u)}
                                disabled={busy || isSelf}
                                title={isSelf ? 'You cannot remove your own account' : 'Remove account'}
                                className="text-xs px-2 py-1 rounded border font-medium disabled:opacity-40"
                                style={{ color: '#c62828', borderColor: '#e6c3c3' }}
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="text-sm text-white px-4 py-2 rounded-lg font-medium" style={{ background: GOLD, color: NAVY }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
