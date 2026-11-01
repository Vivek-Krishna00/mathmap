import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useFetch } from '../hooks/useFetch.js';
import RoadmapTimeline from '../components/RoadmapTimeline.jsx';
import { Icon } from '../components/icons.jsx';
import { Button, ErrorState, Loading, ProgressBar } from '../components/ui.jsx';
import { LEVELS, formatDate, formatMinutes } from '../lib/format.js';

const LEVEL_LABEL = Object.fromEntries(LEVELS.map((l) => [l.value, l.label]));

export default function SharedRoadmap() {
  const { token } = useParams();
  const { data, loading, error, reload } = useFetch(() => api(`/shared/${token}`), [token]);

  if (loading) return <Loading label="Loading shared roadmap" />;
  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <ErrorState error={error} onRetry={reload} />
        <p className="text-xs text-muted mt-2 max-w-md mx-auto">
          Share links are stored in the database. If the demo data was re-seeded, links created
          beforehand stop working and the owner needs to share again.
        </p>
        <Button as={Link} to="/roadmaps/new" className="mt-4">Build your own roadmap</Button>
      </div>
    );
  }

  const { roadmap, items, progress } = data;
  const totalMinutes = items.reduce((acc, item) => acc + Number(item.est_minutes || 0), 0);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-4">
        <span className="badge bg-brand-600/10 text-brand-700 dark:text-brand-300">
          <Icon name="globe" size={13} /> Shared roadmap
        </span>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Icon name="doc" size={15} /> Print / save as PDF
          </Button>
          <Button size="sm" as={Link} to="/roadmaps/new">Build your own</Button>
        </div>
      </div>

      <header className="card p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold">{roadmap.title}</h1>
        {roadmap.goal && <p className="text-muted mt-2 max-w-2xl">{roadmap.goal}</p>}
        <div className="flex flex-wrap gap-2 mt-4 text-xs">
          <span className="badge bg-brand-600/10 text-brand-700 dark:text-brand-300 capitalize">
            {LEVEL_LABEL[roadmap.level] || roadmap.level}
          </span>
          <span className="badge bg-sunken text-muted">{items.length} topics</span>
          <span className="badge bg-sunken text-muted">{formatMinutes(totalMinutes)} of material</span>
          <span className="badge bg-sunken text-muted">by {roadmap.owner_name}</span>
          <span className="badge bg-sunken text-muted">Created {formatDate(roadmap.created_at)}</span>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium">Owner&apos;s progress</span>
            <span className="text-muted">{progress.completed} / {progress.total} · {progress.percent}%</span>
          </div>
          <ProgressBar value={progress.percent} tone={progress.percent === 100 ? 'bg-teal-600' : 'bg-brand-600'} />
        </div>
      </header>

      <div className="mt-8">
        <RoadmapTimeline items={items} />
      </div>

      <p className="text-xs text-muted mt-8">
        Shared from MathMap. This is a read-only view — progress belongs to the owner.
      </p>
    </div>
  );
}
