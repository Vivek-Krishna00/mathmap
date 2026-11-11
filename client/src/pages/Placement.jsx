import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useFetch } from '../hooks/useFetch.js';
import { Icon } from '../components/icons.jsx';
import { Button, Card, ErrorState, Loading, ProgressBar, cx } from '../components/ui.jsx';
import { LEVELS } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';

const LEVEL_LABEL = Object.fromEntries(LEVELS.map((l) => [l.value, l.label]));

export default function Placement() {
  const navigate = useNavigate();
  const { error: toastError } = useToast();
  const { data, loading, error, reload } = useFetch(() => api('/placement/questions'), []);

  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);

  const questions = data?.questions || [];

  const grouped = useMemo(() => {
    const map = new Map();
    for (const q of questions) {
      if (!map.has(q.branch_slug)) {
        map.set(q.branch_slug, { slug: q.branch_slug, name: q.branch_name, items: [] });
      }
      map.get(q.branch_slug).items.push(q);
    }
    return [...map.values()];
  }, [questions]);

  const answered = Object.keys(answers).length;
  const total = questions.length;

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload = Object.entries(answers).map(([questionId, choiceIndex]) => ({
        questionId: Number(questionId),
        choiceIndex,
      }));
      const data = await api('/placement/score', { method: 'POST', body: { answers: payload } });
      setResult(data.result);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (err) {
      toastError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const buildRoadmap = () => {
    navigate('/roadmaps/new', {
      state: {
        placement: {
          advisedLevel: result.advisedLevel,
          suggestedBranchIds: result.suggestedBranchIds,
          suggestedTags: result.suggestedTags,
          correct: result.totalCorrect,
          total: result.totalAnswered,
        },
      },
    });
  };

  if (loading) return <Loading label="Loading the self-check" />;
  if (error) return <div className="mx-auto max-w-3xl px-4 py-16"><ErrorState error={error} onRetry={reload} /></div>;

  if (result) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10" ref={resultRef}>
        <h1 className="section-title">Your starting point</h1>
        <p className="text-muted mt-2">
          You answered {result.totalCorrect} of {result.totalAnswered} correctly, which puts you at{' '}
          <strong className="text-ink">{LEVEL_LABEL[result.advisedLevel]}</strong> overall.
        </p>

        <Card className="p-6 mt-6">
          <h2 className="font-semibold">By branch</h2>
          <ul className="mt-4 space-y-3">
            {result.branches.map((b) => (
              <li key={b.slug} className="flex flex-wrap items-center gap-3">
                <span className="flex-1 min-w-[10rem] text-sm">{b.name}</span>
                <span className="text-xs text-muted tabular-nums">{b.correct}/{b.total}</span>
                <span className="badge bg-brand-600/10 text-brand-700 dark:text-brand-300">{LEVEL_LABEL[b.advisedLevel]}</span>
              </li>
            ))}
          </ul>

          {result.suggestedTags.length > 0 && (
            <div className="mt-6 pt-5 border-t border-line">
              <h3 className="text-sm font-semibold">Suggested starting interests</h3>
              <div className="flex flex-wrap gap-2 mt-2.5">
                {result.suggestedTags.map((tag) => <span key={tag} className="badge bg-sunken text-muted">#{tag}</span>)}
              </div>
            </div>
          )}
        </Card>

        <div className="flex flex-wrap gap-3 mt-6">
          <Button onClick={buildRoadmap}>
            <Icon name="route" size={17} /> Build a roadmap from this
          </Button>
          <Button variant="secondary" onClick={() => { setResult(null); setAnswers({}); }}>
            Retake the check
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <header className="mb-6">
        <h1 className="section-title">Where are you starting from?</h1>
        <p className="text-muted mt-2">
          A few quick questions so your roadmap is built from what you actually know, rather than a guess.
          Skip anything you are unsure about — unanswered questions simply count as not yet covered.
        </p>
      </header>

      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium">Answered</span>
          <span className="text-muted">{answered} / {total}</span>
        </div>
        <ProgressBar value={total ? (answered / total) * 100 : 0} label="Questions answered" />
      </div>

      <div className="space-y-6">
        {grouped.map((branch) => (
          <Card key={branch.slug} className="p-6">
            <h2 className="font-semibold">{branch.name}</h2>
            <div className="mt-4 space-y-5">
              {branch.items.map((q) => (
                <fieldset key={q.id}>
                  <legend className="text-sm font-medium">{q.prompt}</legend>
                  <div className="mt-2 grid sm:grid-cols-2 gap-2">
                    {q.options.map((option, index) => {
                      const checked = answers[q.id] === index;
                      return (
                        <label
                          key={`${q.id}-${index}`}
                          className={cx(
                            'flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm cursor-pointer transition',
                            checked ? 'border-brand-500 bg-brand-600/5' : 'border-line hover:border-brand-400/60',
                          )}
                        >
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            checked={checked}
                            onChange={() => setAnswers((a) => ({ ...a, [q.id]: index }))}
                            className="accent-brand-600"
                          />
                          {option}
                        </label>
                      );
                    })}
                  </div>
                  {answers[q.id] !== undefined && (
                    <button
                      type="button"
                      onClick={() => setAnswers((a) => { const next = { ...a }; delete next[q.id]; return next; })}
                      className="text-xs text-muted hover:text-ink mt-2"
                    >
                      Clear this answer
                    </button>
                  )}
                </fieldset>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-8">
        <Button onClick={submit} disabled={submitting || answered === 0}>
          {submitting ? 'Scoring…' : `See my level${answered ? ` (${answered} answered)` : ''}`}
        </Button>
        <Link to="/roadmaps/new" className="text-sm text-muted hover:text-ink">
          Skip — I already know my level
        </Link>
      </div>
    </div>
  );
}
