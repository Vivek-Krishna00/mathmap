import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useFetch } from '../hooks/useFetch.js';
import ProblemCard from '../components/ProblemCard.jsx';
import { Icon } from '../components/icons.jsx';
import { Button, EmptyState, ErrorState, Input, Loading, Select, cx } from '../components/ui.jsx';
import { DIFFICULTY_LABELS } from '../lib/format.js';

export default function Problems() {
  // Filters live in the URL so a filtered view can be linked and shared.
  const [params, setParams] = useSearchParams();
  const difficulty = params.get('difficulty') || '';
  const branch = params.get('branch') || '';
  const search = params.get('search') || '';

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const { data, loading, error, reload } = useFetch(() => api('/problems?limit=200'), []);
  const { data: branchData } = useFetch(() => api('/branches'), []);

  const problems = data?.problems || [];
  const branches = branchData?.branches || [];

  const branchBySlug = useMemo(() => {
    const map = new Map();
    for (const b of branches) map.set(b.name, b.slug);
    return map;
  }, [branches]);

  const filtered = problems.filter((p) => {
    if (difficulty && String(p.difficulty_level) !== difficulty) return false;
    if (branch && branchBySlug.get(p.branch_name) !== branch) return false;
    if (search) {
      const haystack = `${p.title} ${p.statement} ${p.topic_title}`.toLowerCase();
      if (!haystack.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <header className="mb-8">
        <h1 className="section-title">Problem bank</h1>
        <p className="text-muted mt-2">
          Thought-provoking problems contributed by the community. Reveal hints and solutions when you&apos;re ready.
        </p>
      </header>

      <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input className="pl-10" placeholder="Search problems…" value={search} onChange={(e) => setParam('search', e.target.value)} />
        </div>
        <Select value={branch} onChange={(e) => setParam('branch', e.target.value)} className="sm:w-52" aria-label="Filter by branch">
          <option value="">All branches</option>
          {branches.map((b) => <option key={b.id} value={b.slug}>{b.name}</option>)}
        </Select>
        <Select value={difficulty} onChange={(e) => setParam('difficulty', e.target.value)} className="sm:w-44" aria-label="Filter by difficulty">
          <option value="">Any difficulty</option>
          {Object.entries(DIFFICULTY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </div>

      {loading && <Loading label="Loading problems" />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {!loading && !error && filtered.length === 0 && (
        <EmptyState
          icon="puzzle"
          title="No problems match"
          message="Try loosening the filters or contribute one yourself."
          action={<Button variant="secondary" onClick={() => setParams(new URLSearchParams(), { replace: true })}>Clear filters</Button>}
        />
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          <p className="text-sm text-muted mb-4">{filtered.length} problem{filtered.length === 1 ? '' : 's'}</p>
          <div className={cx('space-y-3 stagger')}>
            {filtered.map((p, i) => <ProblemCard key={p.id} problem={p} defaultOpen={i === 0} />)}
          </div>
        </>
      )}
    </div>
  );
}
