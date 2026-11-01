import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useFetch } from '../hooks/useFetch.js';
import { Icon } from '../components/icons.jsx';
import { Button, Card, DifficultyPill, EmptyState, ErrorState, Loading } from '../components/ui.jsx';
import { formatDate } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';

export default function Review() {
  const { success, error: toastError } = useToast();
  const { data, loading, error, reload } = useFetch(() => api('/review'), []);
  const [busy, setBusy] = useState(null);

  const markReviewed = async (itemId) => {
    setBusy(itemId);
    try {
      await api(`/review/${itemId}`, { method: 'POST' });
      success('Marked as reviewed — it will come back later.');
      await reload();
    } catch (err) {
      toastError(err.message);
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <Loading label="Loading your review queue" />;
  if (error) {
    return <div className="mx-auto max-w-3xl px-4 py-16"><ErrorState error={error} onRetry={reload} /></div>;
  }

  const due = data.due || [];

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <header className="mb-6">
        <h1 className="section-title">Review queue</h1>
        <p className="text-muted mt-2">
          Topics you have completed return on a widening schedule — 3, 7, 16, then 35 days. Marking one
          reviewed pushes it further out.
        </p>
      </header>

      {due.length === 0 ? (
        <EmptyState
          icon="checkCircle"
          title="Nothing due"
          message="Everything you have completed is still fresh. Come back in a few days."
          action={<Button variant="secondary" as={Link} to="/dashboard">Back to dashboard</Button>}
        />
      ) : (
        <div className="space-y-3 stagger">
          {due.map((item) => (
            <Card key={item.item_id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to={`/topics/${item.slug}`}
                    className="font-semibold hover:text-brand-600 dark:hover:text-brand-300"
                  >
                    {item.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                      <span className="w-2 h-2 rounded-full" style={{ background: item.branch_color }} aria-hidden="true" />
                      {item.branch_name}
                    </span>
                    <DifficultyPill level={item.difficulty_level} />
                    <span className="badge bg-sunken text-muted">
                      {item.review_count === 0 ? 'first review' : `reviewed ${item.review_count}×`}
                    </span>
                    <span className="badge bg-sunken text-muted">next in {item.interval_days}d</span>
                  </div>
                  {item.completed_at && (
                    <p className="text-xs text-muted mt-2">Completed {formatDate(item.completed_at)}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" as={Link} to={`/topics/${item.slug}`}>Revisit</Button>
                  <Button size="sm" onClick={() => markReviewed(item.item_id)} disabled={busy === item.item_id}>
                    <Icon name="check" size={15} />
                    {busy === item.item_id ? 'Saving…' : 'Mark reviewed'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
