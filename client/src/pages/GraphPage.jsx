import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, qs } from '../api/client.js';
import { useFetch } from '../hooks/useFetch.js';
import ConceptGraph from '../components/ConceptGraph.jsx';
import GraphList from '../components/GraphList.jsx';
import { Icon } from '../components/icons.jsx';
import { Button, Card, EmptyState, ErrorState, Loading, cx } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function Segmented({ label, options, value, onChange }) {
  return (
    <div className="flex rounded-xl border border-line overflow-hidden" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cx(
            'px-3 py-1.5 text-xs font-medium transition',
            value === option.value ? 'bg-brand-600 text-white' : 'text-muted hover:bg-sunken',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Tile({ label, value, tone = 'text-ink' }) {
  return (
    <Card className="p-4">
      <div className={cx('text-xl font-bold font-display leading-none tabular-nums', tone)}>{value}</div>
      <div className="text-xs text-muted mt-1">{label}</div>
    </Card>
  );
}

export default function GraphPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [selected, setSelected] = useState(() => (params.get('branches') || '').split(',').filter(Boolean));
  const [view, setView] = useState(params.get('view') === 'list' ? 'list' : 'graph');
  const [mode, setMode] = useState(params.get('mode') === 'progress' ? 'progress' : 'curriculum');

  const { data: branchData } = useFetch(() => api('/branches'), []);
  const branches = branchData?.branches || [];

  const query = useMemo(() => qs({ branches: selected.join(',') }), [selected]);
  const { data, loading, error, reload } = useFetch(() => api(`/graph${query}`), [query]);

  const showProgress = mode === 'progress' && isAuthenticated;
  const progressQuery = useFetch(
    () => (showProgress ? api('/insights/graph') : Promise.resolve(null)),
    [showProgress],
  );
  const progress = showProgress ? progressQuery.data : null;

  const toggle = (slug) => setSelected((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug]));

  const titleById = useMemo(
    () => new Map((data?.nodes || []).map((node) => [node.id, node.title])),
    [data],
  );

  const summary = progress?.summary;
  // Nothing to overlay yet: either no roadmap items at all, or none started.
  const nothingYet = Boolean(
    showProgress && summary && summary.completed === 0 && summary.inProgress === 0,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <header className="mb-6">
        <h1 className="section-title">The mathematics concept map</h1>
        <p className="text-muted mt-2 max-w-3xl">
          Every node is a concept; every arrow points from a prerequisite to what it unlocks.
          {showProgress
            ? ' In progress mode the map is coloured by what you have actually done, and arrows you crossed out of order are marked in red.'
            : ' Hover to trace connections and click a node to open it.'}
        </p>
      </header>

      <Card className="p-4 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted mr-1">Filter</span>
          <button type="button" onClick={() => setSelected([])} className={cx('chip', selected.length === 0 && 'chip-active')}>
            All branches
          </button>
          {branches.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => toggle(b.slug)}
              className={cx('chip', selected.includes(b.slug) && 'chip-active')}
              style={selected.includes(b.slug) ? { borderColor: b.color } : undefined}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: b.color }} />
              {b.name}
            </button>
          ))}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {data && (
              <span className="text-xs text-muted">
                {data.nodes.length} concepts · {data.edges.length} prerequisites
              </span>
            )}
            {/* What the map shows and how it is laid out are independent choices. */}
            {isAuthenticated && (
              <Segmented
                label="Data shown"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'curriculum', label: 'Curriculum' },
                  { value: 'progress', label: 'My progress' },
                ]}
              />
            )}
            <Segmented
              label="View mode"
              value={view}
              onChange={setView}
              options={[
                { value: 'graph', label: 'Graph' },
                { value: 'list', label: 'List' },
              ]}
            />
          </div>
        </div>
      </Card>

      {showProgress && progressQuery.loading && <Loading label="Working out your path" />}
      {showProgress && progressQuery.error && (
        <ErrorState error={progressQuery.error} onRetry={progressQuery.reload} />
      )}

      {showProgress && summary && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            <Tile label="Topics completed" value={summary.completed} />
            <Tile label="In progress" value={summary.inProgress} />
            <Tile
              label="Studied in recommended order"
              value={progress.adherencePercent === null ? '—' : `${progress.adherencePercent}%`}
              tone={progress.adherencePercent === 100 ? 'text-teal-700 dark:text-teal-300' : 'text-ink'}
            />
            <Tile
              label="Out of order"
              value={summary.violating}
              tone={summary.violating > 0 ? 'text-rose-700 dark:text-rose-300' : 'text-ink'}
            />
          </div>

          {nothingYet ? (
            <EmptyState
              icon="route"
              title="No progress to show yet"
              message="Complete a topic on one of your roadmaps and your path will appear on the map."
              action={<Button as={Link} to="/roadmaps/new">Build a roadmap</Button>}
            />
          ) : progress.violations.length > 0 ? (
            <Card className="p-4 mb-5">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Icon name="alert" size={16} className="text-rose-600 dark:text-rose-400" />
                Studied out of order
              </h2>
              <ul className="mt-2 space-y-1.5">
                {progress.violations.map((violation) => (
                  <li key={violation.topicId} className="text-sm text-muted">
                    <span className="text-ink">{titleById.get(violation.topicId) || `Topic ${violation.topicId}`}</span>
                    {' was completed before '}
                    {violation.missing.map((id) => titleById.get(id) || `topic ${id}`).join(' and ')}.
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </>
      )}

      {loading && <Loading label="Laying out the graph" />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && !nothingYet && (view === 'graph' ? (
        <ConceptGraph
          nodes={data.nodes}
          edges={data.edges}
          progress={progress}
          onSelect={(slug) => navigate(`/topics/${slug}`)}
        />
      ) : (
        <GraphList nodes={data.nodes} edges={data.edges} progress={progress} />
      ))}

      <div className="flex flex-wrap items-center gap-4 mt-5 text-sm text-muted">
        {showProgress ? (
          <>
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded" style={{ background: 'rgba(23,127,115,0.35)' }} aria-hidden="true" />
              Completed — the number is the step in your path
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded" style={{ background: 'rgba(180,118,26,0.35)' }} aria-hidden="true" />
              In progress, or due for review
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-0.5 rounded" style={{ background: '#B5495B' }} aria-hidden="true" />
              Prerequisite crossed out of order
            </span>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-2">
              <Icon name="info" size={16} /> Node colour = branch, L1–L5 = difficulty level
            </span>
            <span className="inline-flex items-center gap-2">
              <Icon name="arrowRight" size={16} /> Arrow = prerequisite direction
            </span>
            {!isAuthenticated && (
              <Link to="/login" className="link">Sign in to compare the map with your progress</Link>
            )}
          </>
        )}
        <Button variant="ghost" size="sm" onClick={() => setView(view === 'graph' ? 'list' : 'graph')}>
          {view === 'graph' ? 'Switch to list view' : 'Switch to graph view'}
        </Button>
      </div>
    </div>
  );
}
