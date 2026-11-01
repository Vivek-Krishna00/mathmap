import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useFetch } from '../hooks/useFetch.js';
import RoadmapTimeline from '../components/RoadmapTimeline.jsx';
import { Icon } from '../components/icons.jsx';
import { Button, ErrorState, Input, Loading, Modal, ProgressBar } from '../components/ui.jsx';
import { formatDate, formatMinutes } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';

export default function RoadmapView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const { data, loading, error, reload, setData } = useFetch(() => api(`/roadmaps/${id}`), [id]);
  const [busyId, setBusyId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [sharing, setSharing] = useState(false);

  const shareUrl = data?.roadmap?.share_token
    ? `${window.location.origin}/shared/${data.roadmap.share_token}`
    : '';

  const createShare = async () => {
    setSharing(true);
    try {
      const { share } = await api(`/roadmaps/${id}/share`, { method: 'POST' });
      setData((prev) => ({
        ...prev,
        roadmap: { ...prev.roadmap, share_token: share.shareToken, is_public: share.isPublic },
      }));
      success('Public link created.');
    } catch (err) {
      toastError(err.message);
    } finally {
      setSharing(false);
    }
  };

  const revokeShare = async () => {
    setSharing(true);
    try {
      await api(`/roadmaps/${id}/share`, { method: 'DELETE' });
      setData((prev) => ({
        ...prev,
        roadmap: { ...prev.roadmap, share_token: null, is_public: false },
      }));
      success('Sharing stopped. The old link no longer works.');
    } catch (err) {
      toastError(err.message);
    } finally {
      setSharing(false);
    }
  };

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      success('Link copied to clipboard.');
    } catch {
      toastError('Could not copy automatically — select the link and copy it manually.');
    }
  };

  if (loading) return <Loading label="Loading your roadmap" />;
  if (error) return <div className="mx-auto max-w-3xl px-4 py-16"><ErrorState error={error} onRetry={reload} /></div>;

  const { roadmap, items, progress } = data;
  const isOwner = Boolean(roadmap.is_owner);

  const updateStatus = async (itemId, status) => {
    setBusyId(itemId);
    try {
      await api(`/roadmaps/${id}/items/${itemId}`, { method: 'PATCH', body: { status } });
      setData((prev) => {
        const nextItems = prev.items.map((it) => (it.item_id === itemId ? { ...it, status } : it));
        const completed = nextItems.filter((it) => it.status === 'completed').length;
        return {
          ...prev,
          items: nextItems,
          progress: { ...prev.progress, completed, percent: Math.round((completed / nextItems.length) * 100) },
        };
      });
      if (status === 'completed') success('Topic marked complete. Keep going!');
    } catch (err) {
      toastError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await api(`/roadmaps/${id}`, { method: 'DELETE' });
      success('Roadmap deleted.');
      navigate('/dashboard');
    } catch (err) {
      toastError(err.message);
      setDeleting(false);
    }
  };

  const totalMinutes = items.reduce((acc, it) => acc + Number(it.est_minutes || 0), 0);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <Icon name="arrowLeft" size={16} /> Dashboard
      </Link>

      <header className="card p-6 sm:p-8 mt-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold">{roadmap.title}</h1>
            {roadmap.goal && <p className="text-muted mt-2 max-w-2xl">{roadmap.goal}</p>}
            <div className="flex flex-wrap gap-2 mt-4 text-xs">
              <span className="badge bg-brand-500/10 text-brand-600 dark:text-brand-300 capitalize">{roadmap.level}</span>
              <span className="badge bg-sunken text-muted">{items.length} topics</span>
              <span className="badge bg-sunken text-muted">{formatMinutes(totalMinutes)} of material</span>
              <span className="badge bg-sunken text-muted">Created {formatDate(roadmap.created_at)}</span>
            </div>
          </div>
          {isOwner ? (
            <div className="flex items-center gap-1">
              <Button variant="secondary" size="sm" onClick={() => setShareOpen(true)}>
                <Icon name="globe" size={15} /> Share
              </Button>
              <Button variant="ghost" size="sm" className="text-rose-600 dark:text-rose-400" onClick={() => setConfirmOpen(true)}>
                <Icon name="trash" size={15} /> Delete
              </Button>
            </div>
          ) : (
            <span className="badge bg-sunken text-muted">
              <Icon name="user" size={12} /> Read-only
            </span>
          )}
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium">Progress</span>
            <span className="text-muted">{progress.completed} / {progress.total} completed · {progress.percent}%</span>
          </div>
          <ProgressBar value={progress.percent} tone={progress.percent === 100 ? 'bg-teal-600' : 'bg-brand-600'} />
        </div>
      </header>

      <div className="mt-8">
        <RoadmapTimeline items={items} onStatusChange={isOwner ? updateStatus : undefined} busyId={busyId} />
      </div>

      <Modal open={shareOpen} onClose={() => setShareOpen(false)} title="Share this roadmap">
        {data.roadmap.is_public && shareUrl ? (
          <>
            <p className="text-sm text-muted">
              Anyone with this link can view a read-only copy. It is not listed anywhere public, and you can
              revoke it at any time.
            </p>
            <div className="flex gap-2 mt-4">
              <Input
                readOnly
                value={shareUrl}
                aria-label="Share link"
                onFocus={(e) => e.target.select()}
              />
              <Button variant="secondary" onClick={copyShare} className="shrink-0">Copy</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="secondary" size="sm" as={Link} to={`/shared/${data.roadmap.share_token}`}>
                <Icon name="external" size={15} /> Open shared view
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-rose-600 dark:text-rose-400"
                onClick={revokeShare}
                disabled={sharing}
              >
                Stop sharing
              </Button>
            </div>
            <p className="text-xs text-muted mt-4">
              Tip: open the shared view and use Print → Save as PDF to attach the roadmap to a report.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">
              Create a read-only link you can send to a classmate, embed in a report, or print as a PDF. It shows
              the roadmap and its resources — not your account or your progress controls.
            </p>
            <Button className="mt-4" onClick={createShare} disabled={sharing}>
              {sharing ? 'Creating…' : 'Create public link'}
            </Button>
          </>
        )}
      </Modal>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete this roadmap?"
        footer={(
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button variant="danger" disabled={deleting} onClick={remove}>
              {deleting ? 'Deleting…' : 'Delete roadmap'}
            </Button>
          </>
        )}
      >
        <p className="text-sm text-muted">
          This permanently removes the roadmap and your progress on it. Resources and topics are unaffected.
        </p>
      </Modal>
    </div>
  );
}
