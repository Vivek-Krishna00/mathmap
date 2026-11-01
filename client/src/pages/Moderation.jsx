import { useState } from 'react';
import { api } from '../api/client.js';
import { useFetch } from '../hooks/useFetch.js';
import { Icon } from '../components/icons.jsx';
import { Button, Card, EmptyState, ErrorState, Loading, Modal, Tabs, Textarea, TypeBadge } from '../components/ui.jsx';
import { DIFFICULTY_LABELS, formatDate } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';

export default function Moderation() {
  const { success, error: toastError } = useToast();
  const [tab, setTab] = useState('resources');
  const [busy, setBusy] = useState(null);
  const [rejecting, setRejecting] = useState(null); // { type, id, title }
  const [reason, setReason] = useState('');

  const queue = useFetch(() => api('/moderation/queue'), []);
  const log = useFetch(() => api('/moderation/log'), []);

  const decide = async (type, id, action, why = '') => {
    setBusy(`${type}-${id}`);
    try {
      await api(`/moderation/${type}/${id}/${action}`, { method: 'POST', body: { reason: why } });
      success(`${action === 'approve' ? 'Approved' : 'Rejected'} successfully.`);
      await queue.reload();
      await log.reload();
    } catch (err) {
      toastError(err.message);
    } finally {
      setBusy(null);
      setRejecting(null);
      setReason('');
    }
  };

  const counts = queue.data?.counts || { resources: 0, problems: 0, total: 0 };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <header className="mb-6">
        <h1 className="section-title flex items-center gap-3">
          <Icon name="shield" size={28} className="text-brand-500" /> Moderation
        </h1>
        <p className="text-muted mt-2">
          {counts.total === 0 ? 'The queue is empty - nice work.' : `${counts.total} item${counts.total === 1 ? '' : 's'} awaiting review.`}
        </p>
      </header>

      <Tabs
        tabs={[
          { value: 'resources', label: 'Resources', icon: 'layers', count: counts.resources },
          { value: 'problems', label: 'Problems', icon: 'puzzle', count: counts.problems },
          { value: 'log', label: 'History', icon: 'clock' },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-6"
      />

      {queue.loading && <Loading label="Loading queue" />}
      {queue.error && <ErrorState error={queue.error} onRetry={queue.reload} />}

      {!queue.loading && !queue.error && tab === 'resources' && (
        queue.data.resources.length === 0 ? (
          <EmptyState icon="checkCircle" title="No resources pending" message="All submitted resources have been reviewed." />
        ) : (
          <div className="space-y-4 stagger">
            {queue.data.resources.map((r) => (
              <Card key={r.id} className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <TypeBadge type={r.type} />
                  {r.provider && <span className="text-xs text-muted">{r.provider}</span>}
                  <span className="badge bg-sunken text-muted ml-auto">by {r.submitted_by_name || 'unknown'} · {formatDate(r.created_at)}</span>
                </div>
                <h3 className="font-semibold mt-2">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="hover:text-brand-600 dark:hover:text-brand-300 inline-flex items-center gap-1.5">
                    {r.title} <Icon name="external" size={14} className="text-muted" />
                  </a>
                </h3>
                <p className="text-xs text-muted mt-1 break-all">{r.url}</p>
                {r.description && <p className="text-sm text-muted mt-2">{r.description}</p>}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(r.topic_titles || r.topic_slugs).map((label) => (
                    <span key={label} className="badge bg-sunken text-muted">{label}</span>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" disabled={busy === `resource-${r.id}`} onClick={() => decide('resource', r.id, 'approve')}>
                    <Icon name="check" size={15} /> Approve
                  </Button>
                  <Button size="sm" variant="secondary" className="text-rose-600 dark:text-rose-400" onClick={() => setRejecting({ type: 'resource', id: r.id, title: r.title })}>
                    <Icon name="close" size={15} /> Reject
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {!queue.loading && !queue.error && tab === 'problems' && (
        queue.data.problems.length === 0 ? (
          <EmptyState icon="checkCircle" title="No problems pending" message="All submitted problems have been reviewed." />
        ) : (
          <div className="space-y-4 stagger">
            {queue.data.problems.map((p) => (
              <Card key={p.id} className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge bg-brand-500/10 text-brand-600 dark:text-brand-300">{p.topic_title}</span>
                  <span className="badge bg-sunken text-muted">{DIFFICULTY_LABELS[p.difficulty_level]}</span>
                  <span className="badge bg-sunken text-muted ml-auto">by {p.submitted_by_name || 'unknown'}</span>
                </div>
                <h3 className="font-semibold mt-2">{p.title}</h3>
                <p className="text-sm text-muted mt-2 whitespace-pre-line">{p.statement}</p>
                {p.solution && (
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer text-muted">Solution</summary>
                    <p className="mt-2 whitespace-pre-line">{p.solution}</p>
                  </details>
                )}
                <div className="flex gap-2 mt-4">
                  <Button size="sm" disabled={busy === `problem-${p.id}`} onClick={() => decide('problem', p.id, 'approve')}>
                    <Icon name="check" size={15} /> Approve
                  </Button>
                  <Button size="sm" variant="secondary" className="text-rose-600 dark:text-rose-400" onClick={() => setRejecting({ type: 'problem', id: p.id, title: p.title })}>
                    <Icon name="close" size={15} /> Reject
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      )}

      {!queue.loading && !queue.error && tab === 'log' && (
        log.loading ? <Loading label="Loading history" /> : (
          <Card className="divide-line-y">
            {log.data.log.length === 0 ? (
              <p className="p-5 text-sm text-muted">No moderation activity yet.</p>
            ) : (
              log.data.log.map((entry) => (
                <div key={entry.id} className="p-4 flex items-center gap-3 text-sm">
                  <span className={`badge ${entry.action === 'approve' ? 'bg-teal-600/12 text-teal-700 dark:text-teal-300' : 'bg-rose-700/12 text-rose-800 dark:text-rose-300'}`}>
                    {entry.action}
                  </span>
                  <span className="text-muted">{entry.entity_type} #{entry.entity_id}</span>
                  <span className="flex-1" />
                  <span className="text-xs text-muted">{entry.moderator_name || 'system'} · {formatDate(entry.created_at)}</span>
                </div>
              ))
            )}
          </Card>
        )
      )}

      <Modal
        open={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        title="Reject submission"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setRejecting(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => decide(rejecting.type, rejecting.id, 'reject', reason)}>Reject</Button>
          </>
        )}
      >
        <p className="text-sm text-muted">Rejecting <span className="font-medium text-ink">{rejecting?.title}</span>. Add an optional reason for the audit log.</p>
        <Textarea className="mt-3" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. duplicate of an existing resource" maxLength={500} />
      </Modal>
    </div>
  );
}
