import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, qs } from '../api/client.js';
import { useDebounced, useFetch } from '../hooks/useFetch.js';
import TopicCard from '../components/TopicCard.jsx';
import { Icon } from '../components/icons.jsx';
import { Button, EmptyState, ErrorState, Input, Loading, Select, cx } from '../components/ui.jsx';
import { DIFFICULTY_LABELS } from '../lib/format.js';

const PAGE_SIZE = 24;

export default function Explore() {
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') || '');
  const [branch, setBranch] = useState(params.get('branch') || '');
  const [difficulty, setDifficulty] = useState(params.get('difficulty') || '');
  const [tag, setTag] = useState(params.get('tag') || '');
  const [page, setPage] = useState(1);

  const debounced = useDebounced(search, 320);

  const { data: branchData } = useFetch(() => api('/branches'), []);
  const { data: tagData } = useFetch(() => api('/topics/tags'), []);

  const query = useMemo(
    () => qs({ branch, search: debounced, difficulty, tag, page, limit: PAGE_SIZE }),
    [branch, debounced, difficulty, tag, page],
  );

  const { data, loading, error, reload } = useFetch(() => api(`/topics${query}`), [query]);

  const topics = data?.topics || [];
  const total = data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const resetTo = (fn) => { fn(); setPage(1); };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <header className="mb-8">
        <h1 className="section-title">Explore topics</h1>
        <p className="text-muted mt-2">
          {loading ? 'Searching…' : `${total} concept${total === 1 ? '' : 's'} across six branches.`}
        </p>
      </header>

      <div className="card p-4 mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              className="pl-10"
              placeholder="Search topics, e.g. eigenvalues, Bayes, induction…"
              value={search}
              onChange={(e) => resetTo(() => setSearch(e.target.value))}
            />
          </div>
          <Select value={branch} onChange={(e) => resetTo(() => setBranch(e.target.value))} className="sm:w-56" aria-label="Filter by branch">
            <option value="">All branches</option>
            {(branchData?.branches || []).map((b) => (
              <option key={b.id} value={b.slug}>{b.name}</option>
            ))}
          </Select>
          <Select value={difficulty} onChange={(e) => resetTo(() => setDifficulty(e.target.value))} className="sm:w-48" aria-label="Filter by difficulty">
            <option value="">Any level</option>
            {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </div>

        {tagData?.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tag && (
              <button type="button" className="chip chip-active" onClick={() => resetTo(() => setTag(''))}>
                <Icon name="close" size={12} /> clear tag
              </button>
            )}
            {tagData.tags.slice(0, 16).map((t) => (
              <button
                key={t.tag}
                type="button"
                className={cx('chip', tag === t.tag && 'chip-active')}
                onClick={() => resetTo(() => setTag(tag === t.tag ? '' : t.tag))}
              >
                #{t.tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <Loading label="Loading topics" />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && topics.length === 0 && (
        <EmptyState
          icon="search"
          title="No topics matched"
          message="Try a different search term or clear the filters."
          action={<Button variant="secondary" onClick={() => resetTo(() => { setSearch(''); setBranch(''); setDifficulty(''); setTag(''); })}>Clear filters</Button>}
        />
      )}

      {!loading && !error && topics.length > 0 && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
            {topics.map((topic) => <TopicCard key={topic.id} topic={topic} />)}
          </div>

          {pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-10">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <Icon name="chevronLeft" size={16} /> Previous
              </Button>
              <span className="text-sm text-muted">Page {page} of {pages}</span>
              <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                Next <Icon name="chevronRight" size={16} />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
