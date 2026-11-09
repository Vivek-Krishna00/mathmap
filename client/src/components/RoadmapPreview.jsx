/**
 * Compact, illustrative preview of a generated roadmap. Static on purpose: the
 * home page is anonymous, so this shows the shape of the output rather than
 * anyone's real data.
 */
const ROWS = [
  { title: 'Vectors', state: 'completed' },
  { title: 'Matrices & matrix operations', state: 'in_progress' },
  { title: 'Eigenvalues & eigenvectors', state: 'not_started' },
];

const STATE = {
  completed: { dot: 'bg-teal-600', label: 'Done', tone: 'text-teal-700 dark:text-teal-300' },
  in_progress: { dot: 'bg-accent-500', label: 'In progress', tone: 'text-accent-700 dark:text-accent-300' },
  not_started: { dot: 'bg-line', label: 'Next', tone: 'text-muted' },
};

export default function RoadmapPreview({ className = '' }) {
  return (
    <div className={`card p-4 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Your roadmap</span>
        <span className="text-xs text-muted">Linear Algebra</span>
      </div>

      <ul className="mt-3 space-y-2">
        {ROWS.map((row, index) => {
          const state = STATE[row.state];
          return (
            <li key={row.title} className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-md bg-sunken flex items-center justify-center text-[11px] font-bold shrink-0">
                {index + 1}
              </span>
              <span className="flex-1 min-w-0 text-xs truncate">{row.title}</span>
              <span className="inline-flex items-center gap-1 text-[11px] shrink-0">
                <span className={`w-1.5 h-1.5 rounded-full ${state.dot}`} aria-hidden="true" />
                <span className={state.tone}>{state.label}</span>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 pt-3 border-t border-line">
        <div className="h-1.5 rounded-full bg-sunken overflow-hidden">
          <div className="h-full w-1/5 rounded-full bg-brand-600" />
        </div>
        <p className="text-[11px] text-muted mt-1.5">3 of 15 topics complete</p>
      </div>
    </div>
  );
}
