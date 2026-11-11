import { useState } from 'react';
import { api } from '../api/client.js';
import { useFetch } from '../hooks/useFetch.js';
import { Icon } from '../components/icons.jsx';
import { Avatar, Button, Card, EmptyState, ErrorState, Loading, Select, Tabs, cx } from '../components/ui.jsx';
import { ROLE_LABELS, ROLE_TONE, formatDate } from '../lib/format.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

const ROLES = ['learner', 'contributor', 'moderator', 'admin'];
const STATUSES = ['pending', 'approved', 'rejected'];

export default function Admin() {
  const { user: me } = useAuth();
  const { success, error: toastError } = useToast();
  const [tab, setTab] = useState('users');
  const [status, setStatus] = useState('pending');
  const [busy, setBusy] = useState(null);

  const users = useFetch(() => api('/admin/users'), []);
  const content = useFetch(() => api(`/admin/content?status=${status}`), [status]);

  const changeRole = async (user, role) => {
    setBusy(`role-${user.id}`);
    try {
      await api(`/admin/users/${user.id}/role`, { method: 'PATCH', body: { role } });
      success(`${user.name} is now a ${ROLE_LABELS[role].toLowerCase()}.`);
      await users.reload();
    } catch (err) {
      toastError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async (type, id, title) => {
    setBusy(`${type}-${id}`);
    try {
      await api(`/admin/${type}/${id}`, { method: 'DELETE' });
      success(`Deleted “${title}”.`);
      await content.reload();
    } catch (err) {
      toastError(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      <header className="mb-6">
        <h1 className="section-title flex items-center gap-3">
          <Icon name="users" size={28} className="text-brand-500" /> Administration
        </h1>
        <p className="text-muted mt-2">Manage roles and review or remove any content on the platform.</p>
      </header>

      <Tabs
        tabs={[
          { value: 'users', label: 'Members', icon: 'users', count: users.data?.users?.length },
          { value: 'content', label: 'Content', icon: 'layers' },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-6"
      />

      {tab === 'users' && (
        <>
          {users.loading && <Loading label="Loading members" />}
          {users.error && <ErrorState error={users.error} onRetry={users.reload} />}
          {!users.loading && !users.error && (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-sunken text-muted">
                    <tr>
                      <th className="text-left font-medium px-4 py-3">Member</th>
                      <th className="text-left font-medium px-4 py-3">Role</th>
                      <th className="text-left font-medium px-4 py-3">Roadmaps</th>
                      <th className="text-left font-medium px-4 py-3">Contributions</th>
                      <th className="text-left font-medium px-4 py-3">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {users.data.users.map((u) => (
                      <tr key={u.id} className="hover:bg-sunken/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={u.name} size={32} />
                            <div className="min-w-0">
                              <div className="font-medium truncate flex items-center gap-2">
                                {u.name}
                                {u.id === me.id && <span className="badge bg-brand-500/10 text-brand-600 dark:text-brand-300">you</span>}
                              </div>
                              <div className="text-xs text-muted truncate">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={cx('badge', ROLE_TONE[u.role])}>{ROLE_LABELS[u.role]}</span>
                            <Select
                              value={u.role}
                              disabled={busy === `role-${u.id}` || u.id === me.id}
                              onChange={(e) => changeRole(u, e.target.value)}
                              className="w-36 py-1.5 text-xs"
                              aria-label={`Role for ${u.name}`}
                            >
                              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                            </Select>
                          </div>
                        </td>
                        <td className="px-4 py-3 tabular-nums">{u.roadmap_count}</td>
                        <td className="px-4 py-3 tabular-nums">{u.resource_count}</td>
                        <td className="px-4 py-3 text-muted">{formatDate(u.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      {tab === 'content' && (
        <>
          <div className="mb-4">
            <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-48">
              {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
            </Select>
          </div>

          {content.loading && <Loading label="Loading content" />}
          {content.error && <ErrorState error={content.error} onRetry={content.reload} />}
          {!content.loading && !content.error && (
            content.data.resources.length === 0 && content.data.problems.length === 0 ? (
              <EmptyState icon="layers" title={`No ${status} content`} message="Nothing matches this status filter." />
            ) : (
              <div className="space-y-3">
                {content.data.resources.map((r) => (
                  <Card key={`res-${r.id}`} className="p-4 flex flex-wrap items-center gap-3">
                    <span className="badge bg-sunken text-muted">resource</span>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium flex-1 min-w-[12rem] truncate hover:text-brand-600 dark:hover:text-brand-300">{r.title}</a>
                    <span className="text-xs text-muted">{r.submitted_by_name || 'seed'}</span>
                    <Button size="sm" variant="ghost" className="text-rose-600 dark:text-rose-400" disabled={busy === `resource-${r.id}`} onClick={() => remove('resource', r.id, r.title)}>
                      <Icon name="trash" size={15} /> Delete
                    </Button>
                  </Card>
                ))}
                {content.data.problems.map((p) => (
                  <Card key={`prob-${p.id}`} className="p-4 flex flex-wrap items-center gap-3">
                    <span className="badge bg-sunken text-muted">problem</span>
                    <span className="font-medium flex-1 min-w-[12rem] truncate">{p.title}</span>
                    <span className="text-xs text-muted">{p.submitted_by_name || 'seed'}</span>
                    <Button size="sm" variant="ghost" className="text-rose-600 dark:text-rose-400" disabled={busy === `problem-${p.id}`} onClick={() => remove('problem', p.id, p.title)}>
                      <Icon name="trash" size={15} /> Delete
                    </Button>
                  </Card>
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
