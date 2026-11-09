import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './icons.jsx';
import MathText from './MathText.jsx';
import { DifficultyPill, cx } from './ui.jsx';

export default function ProblemCard({ problem, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [showSolution, setShowSolution] = useState(false);

  return (
    <article className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-left font-semibold hover:text-brand-600 dark:hover:text-brand-300 inline-flex items-center gap-2"
          >
            <Icon name={open ? 'chevronDown' : 'chevronRight'} size={16} className="text-muted shrink-0" />
            {problem.title}
          </button>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <DifficultyPill level={problem.difficulty_level} />
            {problem.topic_slug && (
              <Link to={`/topics/${problem.topic_slug}`} className="badge bg-sunken text-muted hover:text-brand-600">
                {problem.topic_title || problem.topic_slug.replace(/-/g, ' ')}
              </Link>
            )}
          </div>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-3 animate-fade-up">
          <p className="text-sm text-ink/90 whitespace-pre-line leading-relaxed"><MathText>{problem.statement}</MathText></p>

          {problem.hint && (
            <details className="rounded-xl bg-sunken/60 px-3.5 py-2.5">
              <summary className="cursor-pointer text-sm font-medium text-accent-700 dark:text-accent-300">Show hint</summary>
              <p className="text-sm text-muted mt-2 whitespace-pre-line"><MathText>{problem.hint}</MathText></p>
            </details>
          )}

          {problem.solution && (
            <div>
              <button
                type="button"
                onClick={() => setShowSolution((s) => !s)}
                className={cx('btn btn-sm', showSolution ? 'btn-secondary' : 'btn-primary')}
              >
                <Icon name={showSolution ? 'close' : 'checkCircle'} size={15} />
                {showSolution ? 'Hide solution' : 'Reveal solution'}
              </button>
              {showSolution && (
                <div className="mt-3 rounded-xl border border-teal-600/30 bg-teal-600/5 px-3.5 py-3 animate-fade-up">
                  <p className="text-sm whitespace-pre-line leading-relaxed"><MathText>{problem.solution}</MathText></p>
                </div>
              )}
            </div>
          )}

          {problem.source_url && (
            <a href={problem.source_url} target="_blank" rel="noopener noreferrer" className="link text-sm inline-flex items-center gap-1.5">
              View source <Icon name="external" size={13} />
            </a>
          )}
        </div>
      )}
    </article>
  );
}
