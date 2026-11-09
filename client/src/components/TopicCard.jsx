import { Link } from 'react-router-dom';
import { Icon } from './icons.jsx';
import { DifficultyPill } from './ui.jsx';

export default function TopicCard({ topic, footer }) {
  const color = topic.branch_color || '#6366f1';
  return (
    <Link to={`/topics/${topic.slug}`} className="card card-hover p-5 flex flex-col h-full group">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-xs font-medium text-muted">
          <span className="w-2 h-2 rounded-full" style={{ background: color }} aria-hidden="true" />
          {topic.branch_name}
        </span>
        <DifficultyPill level={topic.difficulty_level} />
      </div>

      <h3 className="font-semibold text-base mt-3 group-hover:text-brand-600 dark:group-hover:text-brand-300 transition">
        {topic.title}
      </h3>
      <p className="text-sm text-muted mt-1.5 flex-1 line-clamp-2">{topic.summary}</p>

      {topic.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {topic.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="badge bg-sunken text-muted text-[11px]">#{tag}</span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-line text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="layers" size={14} /> {topic.resource_count ?? 0} resource{topic.resource_count === 1 ? '' : 's'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Icon name="puzzle" size={14} /> {topic.problem_count ?? 0} problem{topic.problem_count === 1 ? '' : 's'}
        </span>
        {footer && <span className="ml-auto">{footer}</span>}
      </div>
    </Link>
  );
}
