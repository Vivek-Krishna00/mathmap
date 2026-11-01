import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useFetch } from '../hooks/useFetch.js';
import ResourceCard from '../components/ResourceCard.jsx';
import ProblemCard from '../components/ProblemCard.jsx';
import TopicNotes from '../components/TopicNotes.jsx';
import { Icon } from '../components/icons.jsx';
import { Button, DifficultyPill, EmptyState, ErrorState, Loading, Select, Tabs, cx } from '../components/ui.jsx';
import { formatMinutes } from '../lib/format.js';

const RESOURCE_FILTERS = [
  { value: 'all', label: 'All', types: null },
  { value: 'video', label: 'Videos', types: ['video'] },
  { value: 'article', label: 'Read', types: ['article', 'book'] },
  { value: 'interactive', label: 'Interactive', types: ['game', 'simulation'] },
  { value: 'practice', label: 'Practice', types: ['problem_set', 'application'] },
  { value: 'course', label: 'Courses', types: ['course'] },
];

export default function TopicDetail() {
  const { slug } = useParams();
  const { data, loading, error, reload, setData } = useFetch(() => api(`/topics/${slug}`), [slug]);
  const [tab, setTab] = useState('resources');
  const [filter, setFilter] = useState('all');

  // Keep the cached topic in step with a vote, and re-rank so the order on screen
  // matches the order the server would return.
  const handleVoteChange = (resourceId, vote) => {
    setData((prev) => {
      if (!prev?.topic) return prev;
      const resources = prev.topic.resources
        .map((r) => (r.id === resourceId
          ? { ...r, net_votes: vote.net_votes, vote_count: vote.vote_count, my_vote: vote.myVote }
          : r))
        .sort((a, b) => b.net_votes - a.net_votes || String(a.title).localeCompare(String(b.title)));
      return { ...prev, topic: { ...prev.topic, resources } };
    });
  };

  if (loading) return <Loading label="Loading topic" />;
  if (error) return <div className="mx-auto max-w-3xl px-4 py-16"><ErrorState error={error} onRetry={reload} /></div>;

  const topic = data.topic;
  const activeFilter = RESOURCE_FILTERS.find((f) => f.value === filter);
  const resources = (topic.resources || []).filter(
    (r) => !activeFilter.types || activeFilter.types.includes(r.type),
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <Link to={`/branches/${topic.branch_slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <Icon name="arrowLeft" size={16} /> {topic.branch_name}
      </Link>

      <header className="mt-4 flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-bold">{topic.title}</h1>
          <p className="text-muted mt-3 text-lg">{topic.summary}</p>
          <div className="flex flex-wrap items-center gap-2.5 mt-5">
            <DifficultyPill level={topic.difficulty_level} />
            {topic.est_minutes > 0 && (
              <span className="badge bg-sunken text-muted">
                <Icon name="clock" size={13} /> {formatMinutes(topic.est_minutes)}
              </span>
            )}
            {topic.tags?.map((t) => (
              <Link key={t} to={`/explore?tag=${t}`} className="badge bg-sunken text-muted hover:text-brand-600">#{t}</Link>
            ))}
          </div>
        </div>
        <Button as={Link} to={`/contribute?topic=${topic.slug}`} variant="secondary" className="shrink-0">
          <Icon name="plus" size={16} /> Add a resource
        </Button>
      </header>

      <div className="grid lg:grid-cols-[1fr_20rem] gap-8 mt-10">
        <div>
          <Tabs
            tabs={[
              { value: 'resources', label: 'Resources', icon: 'layers', count: topic.resources?.length || 0 },
              { value: 'problems', label: 'Problems', icon: 'puzzle', count: topic.problems?.length || 0 },
            ]}
            active={tab}
            onChange={setTab}
          />

          {tab === 'resources' && (
            <div className="mt-5">
              {/* one quiet control instead of a row of six filter chips */}
              <div className="flex items-center gap-2 mb-4">
                <label htmlFor="resource-type" className="text-xs text-muted">Type</label>
                <Select
                  id="resource-type"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-40 py-1.5 text-xs"
                >
                  {RESOURCE_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </Select>
              </div>
              {resources.length === 0 ? (
                <EmptyState
                  icon="layers"
                  title="No resources here yet"
                  message="Be the first to contribute a resource for this concept."
                  action={<Button as={Link} to={`/contribute?topic=${topic.slug}`}>Contribute a resource</Button>}
                />
              ) : (
                <div className="space-y-3 stagger">
                  {resources.map((r) => <ResourceCard key={r.id} resource={r} shownTopics={false} onChange={handleVoteChange} />)}
                </div>
              )}
            </div>
          )}

          {tab === 'problems' && (
            <div className="mt-5">
              {topic.problems?.length === 0 ? (
                <EmptyState
                  icon="puzzle"
                  title="No problems yet"
                  message="Share a problem that helped this concept click."
                  action={<Button as={Link} to={`/contribute?topic=${topic.slug}&tab=problem`}>Share a problem</Button>}
                />
              ) : (
                <div className="space-y-3 stagger">
                  {topic.problems.map((p) => <ProblemCard key={p.id} problem={p} />)}
                </div>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <TopicNotes slug={topic.slug} />

          <div className="card p-5">
            <h3 className="font-semibold">Connects to</h3>

            <div className="mt-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Needs first</h4>
              {topic.prerequisites.length === 0 ? (
                <p className="text-sm text-muted mt-1.5">Nothing — a good starting point.</p>
              ) : (
                <ul className="mt-1.5 space-y-0.5">
                  {topic.prerequisites.map((p) => (
                    <li key={p.id}>
                      <Link to={`/topics/${p.slug}`} className="flex items-center justify-between gap-2 text-sm rounded-lg px-2 py-1 hover:bg-sunken">
                        <span className="truncate">{p.title}</span>
                        <span className="text-xs text-muted shrink-0">L{p.difficulty_level}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {topic.dependents.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Unlocks</h4>
                <ul className="mt-1.5 space-y-0.5">
                  {topic.dependents.map((p) => (
                    <li key={p.id}>
                      <Link to={`/topics/${p.slug}`} className="flex items-center justify-between gap-2 text-sm rounded-lg px-2 py-1 hover:bg-sunken">
                        <span className="truncate">{p.title}</span>
                        <span className="text-xs text-muted shrink-0">L{p.difficulty_level}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Link to={`/graph?trace=${topic.slug}`} className="link text-sm inline-flex items-center gap-1.5 mt-4">
              <Icon name="route" size={14} /> Trace its prerequisites
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
