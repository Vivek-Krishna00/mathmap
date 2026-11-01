import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useFetch } from '../hooks/useFetch.js';
import { Icon } from '../components/icons.jsx';
import { Button, Card, Field, Input, Loading, Select, Tabs, Textarea, cx } from '../components/ui.jsx';
import { DIFFICULTY_LABELS, RESOURCE_TYPES, RESOURCE_TYPE_LABELS } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';

function TopicPicker({ topics, value, onChange, multiple = true, max = 6 }) {
  const [filter, setFilter] = useState('');
  const filtered = topics.filter((t) => t.title.toLowerCase().includes(filter.toLowerCase())).slice(0, 40);

  const toggle = (slug) => {
    if (!multiple) return onChange([slug]);
    if (value.includes(slug)) onChange(value.filter((s) => s !== slug));
    else if (value.length < max) onChange([...value, slug]);
  };

  return (
    <div>
      <Input placeholder="Filter topics…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-line divide-y divide-line">
        {filtered.map((t) => {
          const active = value.includes(t.slug);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.slug)}
              className={cx('w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-sm transition', active ? 'bg-brand-500/5' : 'hover:bg-sunken')}
            >
              <span className={cx('w-4 h-4 rounded border flex items-center justify-center shrink-0', active ? 'bg-brand-600 border-brand-600 text-white' : 'border-line')}>
                {active && <Icon name="check" size={11} strokeWidth={3} />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block truncate">{t.title}</span>
                <span className="block text-xs text-muted">{t.branch_name} · L{t.difficulty_level}</span>
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && <p className="px-3.5 py-3 text-sm text-muted">No topics match.</p>}
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {value.map((slug) => (
            <span key={slug} className="badge bg-brand-500/10 text-brand-600 dark:text-brand-300">
              {slug.replace(/-/g, ' ')}
              <button type="button" onClick={() => toggle(slug)} className="ml-1 hover:text-rose-500"><Icon name="close" size={11} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Contribute() {
  const [params] = useSearchParams();
  const { success, error: toastError } = useToast();
  const [tab, setTab] = useState(params.get('tab') === 'problem' ? 'problem' : 'resource');
  const presetTopic = params.get('topic');

  const { data: topicData, loading } = useFetch(() => api('/topics?limit=200'), []);
  const topics = topicData?.topics || [];

  const [resource, setResource] = useState({ title: '', url: '', type: 'video', provider: '', description: '', topics: presetTopic ? [presetTopic] : [] });
  const [problem, setProblem] = useState({ topic: presetTopic || '', title: '', statement: '', hint: '', solution: '', difficulty: '3' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (presetTopic) {
      setResource((r) => (r.topics.length ? r : { ...r, topics: [presetTopic] }));
      setProblem((p) => (p.topic ? p : { ...p, topic: presetTopic }));
    }
  }, [presetTopic]);

  const submitResource = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api('/resources', { method: 'POST', body: resource });
      success('Your resource is pending moderator review. Thank you!');
      setResource({ title: '', url: '', type: 'video', provider: '', description: '', topics: presetTopic ? [presetTopic] : [] });
    } catch (err) {
      toastError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitProblem = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api('/problems', { method: 'POST', body: { ...problem, difficulty: Number(problem.difficulty) } });
      success('Your problem is pending moderator review. Thank you!');
      setProblem({ topic: presetTopic || '', title: '', statement: '', hint: '', solution: '', difficulty: '3' });
    } catch (err) {
      toastError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const topicName = useMemo(() => {
    const map = new Map(topics.map((t) => [t.slug, t.title]));
    return (slug) => map.get(slug) || slug;
  }, [topics]);

  if (loading) return <Loading label="Loading topics" />;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <header className="mb-6">
        <h1 className="section-title">Contribute to the community</h1>
        <p className="text-muted mt-2">
          Everything you submit goes to a moderator for review before it appears publicly.
        </p>
      </header>

      <Tabs
        tabs={[
          { value: 'resource', label: 'Learning resource', icon: 'layers' },
          { value: 'problem', label: 'Problem', icon: 'puzzle' },
        ]}
        active={tab}
        onChange={setTab}
        className="mb-6"
      />

      {tab === 'resource' && (
        <Card className="p-6 animate-fade-up">
          <form onSubmit={submitResource} className="space-y-5">
            <Field label="Title">
              <Input required minLength={3} maxLength={200} value={resource.title} onChange={(e) => setResource({ ...resource, title: e.target.value })} placeholder="e.g. Eigenvectors and eigenvalues, visually" />
            </Field>
            <Field label="URL">
              <Input required type="url" value={resource.url} onChange={(e) => setResource({ ...resource, url: e.target.value })} placeholder="https://…" />
            </Field>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Type">
                <Select value={resource.type} onChange={(e) => setResource({ ...resource, type: e.target.value })}>
                  {RESOURCE_TYPES.map((t) => <option key={t} value={t}>{RESOURCE_TYPE_LABELS[t]}</option>)}
                </Select>
              </Field>
              <Field label="Provider / author" hint="Optional">
                <Input value={resource.provider} onChange={(e) => setResource({ ...resource, provider: e.target.value })} placeholder="3Blue1Brown, Khan Academy…" />
              </Field>
            </div>
            <Field label="Why is it good?" hint="Optional, but helps moderators and other learners">
              <Textarea maxLength={1000} value={resource.description} onChange={(e) => setResource({ ...resource, description: e.target.value })} placeholder="A short description of what the resource covers." />
            </Field>
            <Field label="Topics" hint="Pick up to 6 concepts this resource teaches">
              <TopicPicker topics={topics} value={resource.topics} onChange={(v) => setResource({ ...resource, topics: v })} />
            </Field>
            <Button type="submit" disabled={submitting || resource.topics.length === 0}>
              {submitting ? 'Submitting…' : 'Submit for review'}
              <Icon name="arrowRight" size={16} />
            </Button>
          </form>
        </Card>
      )}

      {tab === 'problem' && (
        <Card className="p-6 animate-fade-up">
          <form onSubmit={submitProblem} className="space-y-5">
            <Field label="Topic">
              <Input
                value={problem.topic ? topicName(problem.topic) : ''}
                readOnly
                placeholder="Choose a topic below"
                className={problem.topic ? '' : 'text-muted'}
              />
            </Field>
            <TopicPicker topics={topics} value={problem.topic ? [problem.topic] : []} onChange={(v) => setProblem({ ...problem, topic: v[0] || '' })} multiple={false} />
            <Field label="Title">
              <Input required minLength={3} maxLength={200} value={problem.title} onChange={(e) => setProblem({ ...problem, title: e.target.value })} placeholder="Short descriptive title" />
            </Field>
            <Field label="Problem statement">
              <Textarea required minLength={10} maxLength={4000} value={problem.statement} onChange={(e) => setProblem({ ...problem, statement: e.target.value })} placeholder="State the problem clearly." />
            </Field>
            <div className="grid sm:grid-cols-2 gap-5">
              <Field label="Hint" hint="Optional">
                <Textarea maxLength={1000} value={problem.hint} onChange={(e) => setProblem({ ...problem, hint: e.target.value })} />
              </Field>
              <Field label="Solution" hint="Optional">
                <Textarea maxLength={4000} value={problem.solution} onChange={(e) => setProblem({ ...problem, solution: e.target.value })} />
              </Field>
            </div>
            <Field label="Difficulty">
              <Select value={problem.difficulty} onChange={(e) => setProblem({ ...problem, difficulty: e.target.value })}>
                {Object.entries(DIFFICULTY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            </Field>
            <Button type="submit" disabled={submitting || !problem.topic}>
              {submitting ? 'Submitting…' : 'Submit for review'}
              <Icon name="arrowRight" size={16} />
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
