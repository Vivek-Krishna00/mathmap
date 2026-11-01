import { Link } from 'react-router-dom';
import { Icon } from './icons.jsx';
import { BRANCH_ICONS } from './icons.jsx';

export default function BranchCard({ branch, index = 0 }) {
  const iconName = BRANCH_ICONS[index % BRANCH_ICONS.length];
  return (
    <Link to={`/branches/${branch.slug}`} className="card card-hover p-5 flex flex-col group">
      <div className="flex items-start justify-between">
        <span
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: `${branch.color}1f`, color: branch.color }}
        >
          <Icon name={iconName} size={22} />
        </span>
        <Icon name="arrowRight" size={18} className="text-muted group-hover:text-brand-500 group-hover:translate-x-0.5 transition" />
      </div>
      <h3 className="font-semibold text-lg mt-4">{branch.name}</h3>
      <p className="text-sm text-muted mt-1 flex-1">{branch.tagline}</p>
      <div className="flex flex-wrap gap-2 mt-4">
        <span className="badge bg-sunken text-muted">{branch.topic_count} topics</span>
        <span className="badge bg-sunken text-muted">{branch.resource_count} resources</span>
      </div>
    </Link>
  );
}
