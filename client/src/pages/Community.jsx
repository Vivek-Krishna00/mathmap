import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useFetch } from '../hooks/useFetch.js';
import { Icon } from '../components/icons.jsx';
import { Button, EmptyState, ErrorState, Loading } from '../components/ui.jsx';
import { LEVELS } from '../lib/format.js';

const LEVEL_LABEL = Object.fromEntries(LEVELS.map((l) => [l.value, l.label]));

export default function Community() {
  const { data, loading, error, reload } = useFetch(() => api('/shared'), []);
  const roadmaps = data?.roadmaps || [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <header className="mb-8">
        <h1 className="section-title">Community roadmaps</h1>
        <p className="text-muted mt-2 max-w-2xl">
          Paths other learners built and chose to share. Read-only — open one to see the full sequence and
          its resources, or build your own.
        </p>
      </header>

      {loading && <Loading label="Loading shared roadmaps" />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && roadmaps.length === 0 && (
        <EmptyState
          icon="route"
          title="No shared roadmaps yet"
          message="When someone shares a roadmap it appears here. Be the first."
          action={<Button as={Link} to="/roadmaps/new">Build a roadmap</Button>}
        />
      )}

      {!loading && !error && roadmaps.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
          {roadmaps.map((roadmap) => (
            <Link
              key={roadmap.share_token}
              to={`/shared/${roadmap.share_token}`}
              className="card card-hover p-5 flex flex-col group"
            >
              <div className="flex items-center justify-between">
                <span className="badge bg-brand-600/10 text-brand-700 dark:text-brand-300">
                  {LEVEL_LABEL[roadmap.level] || roadmap.level}
                </span>
                <Icon name="external" size={16} className="text-muted group-hover:text-brand-500 transition" />
              </div>
              <h3 className="font-semibold mt-3 group-hover:text-brand-600 dark:group-hover:text-brand-300">
                {roadmap.title}
              </h3>
              {roadmap.goal && <p className="text-sm text-muted mt-1 flex-1 line-clamp-2">{roadmap.goal}</p>}
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="badge bg-sunken text-muted">{roadmap.topic_count} topics</span>
                <span className="badge bg-sunken text-muted">by {roadmap.owner_name}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
