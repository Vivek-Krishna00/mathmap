import { Link } from 'react-router-dom';
import { Icon } from './icons.jsx';
import { DifficultyPill, cx } from './ui.jsx';
import { ITEM_STATUS, RESOURCE_TYPE_ICON, RESOURCE_TYPE_LABELS, RESOURCE_TYPE_VERB, formatMinutes } from '../lib/format.js';

const STATUS_TONE = {
  not_started: { dot: 'bg-sunken border-line text-muted', chip: '' },
  in_progress: { dot: 'bg-accent-500/15 border-accent-500/50 text-accent-700 dark:text-accent-300', chip: 'border-accent-500/50 text-accent-700 dark:text-accent-300' },
  completed: { dot: 'bg-teal-600/15 border-teal-600/50 text-teal-700 dark:text-teal-300', chip: 'border-teal-600/50 text-teal-700 dark:text-teal-300' },
};

function ResourceRow({ resource }) {
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-sunken transition group"
    >
      <span className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-300 flex items-center justify-center shrink-0">
        <Icon name={RESOURCE_TYPE_ICON[resource.type] || 'doc'} size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium leading-snug group-hover:text-brand-600 dark:group-hover:text-brand-300">
          {resource.title}
        </span>
        <span className="block text-xs text-muted mt-0.5">
          {RESOURCE_TYPE_VERB[resource.type] || RESOURCE_TYPE_LABELS[resource.type]}
          {resource.provider ? ` · ${resource.provider}` : ''}
          {resource.net_votes > 0 ? ` · ▲ ${resource.net_votes}` : ''}
        </span>
      </span>
      <Icon name="external" size={14} className="text-muted mt-1.5 shrink-0" />
    </a>
  );
}

export default function RoadmapTimeline({ items = [], onStatusChange, busyId }) {
  if (!items.length) return null;

  return (
    <ol className="relative space-y-4">
      {items.map((item, index) => {
        const tone = STATUS_TONE[item.status] || STATUS_TONE.not_started;
        const grouped = item.resources || [];
        return (
          <li key={item.item_id ?? item.id} className="relative pl-12 sm:pl-14">
            {/* connector */}
            {index < items.length - 1 && (
              <span className="absolute left-[19px] sm:left-[23px] top-11 bottom-[-1rem] w-px bg-line" aria-hidden="true" />
            )}
            {/* keyed on status so the marker replays its animation when progress changes */}
            <span
              key={item.status}
              className={cx(
                'absolute left-0 top-0 w-10 h-10 sm:w-12 sm:h-12 rounded-2xl border flex items-center justify-center font-display font-bold',
                tone.dot,
                item.status === 'completed' && 'mm-pop',
              )}
            >
              {item.status === 'completed' ? <Icon name="check" size={20} strokeWidth={2.4} /> : item.order_index ?? index + 1}
            </span>

            <div className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to={`/topics/${item.slug}`}
                    className="font-semibold text-lg hover:text-brand-600 dark:hover:text-brand-300"
                  >
                    {item.title}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
                      <span className="w-2 h-2 rounded-full" style={{ background: item.branch_color }} aria-hidden="true" />
                      {item.branch_name}
                    </span>
                    <DifficultyPill level={item.difficulty_level} />
                    {item.est_minutes ? (
                      <span className="badge bg-sunken text-muted">
                        <Icon name="clock" size={12} /> {formatMinutes(item.est_minutes)}
                      </span>
                    ) : null}
                  </div>
                </div>

                {onStatusChange && (
                  <div className="flex rounded-xl border border-line overflow-hidden shrink-0" role="group" aria-label="Progress">
                    {ITEM_STATUS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        disabled={busyId === item.item_id}
                        onClick={() => onStatusChange(item.item_id, s.value)}
                        className={cx(
                          'px-3 py-2 text-xs font-medium transition disabled:opacity-60',
                          item.status === s.value ? 'bg-brand-500 text-white' : 'text-muted hover:bg-sunken',
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {item.summary && <p className="text-sm text-muted mt-3">{item.summary}</p>}

              {item.reasons?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {item.reasons.map((r) => (
                    <span key={r} className="badge bg-brand-500/10 text-brand-700 dark:text-brand-300 text-[11px]">
                      <Icon name="sparkles" size={11} /> {r}
                    </span>
                  ))}
                </div>
              )}

              {grouped.length > 0 && (
                <div className="mt-4 pt-3 border-t border-line">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted mb-1.5">Resources</h4>
                  <div className="-mx-1 divide-y divide-line/60">
                    {grouped.map((r) => <ResourceRow key={r.id} resource={r} />)}
                  </div>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
