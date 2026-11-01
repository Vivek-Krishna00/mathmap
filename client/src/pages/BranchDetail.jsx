import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useFetch } from '../hooks/useFetch.js';
import TopicCard from '../components/TopicCard.jsx';
import { Icon } from '../components/icons.jsx';
import { Button, ErrorState, Loading, Stat } from '../components/ui.jsx';

export default function BranchDetail() {
  const { slug } = useParams();
  const { data, loading, error, reload } = useFetch(() => api(`/branches/${slug}`), [slug]);

  if (loading) return <Loading label="Loading branch" />;
  if (error) return <div className="mx-auto max-w-3xl px-4 py-16"><ErrorState error={error} onRetry={reload} /></div>;

  const branch = data.branch;
  const resources = branch.topics.reduce((acc, t) => acc + Number(t.resource_count || 0), 0);
  const problems = branch.topics.reduce((acc, t) => acc + Number(t.problem_count || 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <div className="card p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: branch.color }} />
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <span
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: `${branch.color}1f`, color: branch.color }}
          >
            <Icon name="sigma" size={28} />
          </span>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{branch.name}</h1>
            <p className="text-muted mt-2 max-w-3xl">{branch.description}</p>
            <div className="flex flex-wrap gap-3 mt-5">
              <Button as={Link} to="/roadmaps/new">
                <Icon name="route" size={17} /> Build a {branch.name} roadmap
              </Button>
              <Button variant="secondary" as={Link} to={`/graph?branches=${branch.slug}`}>
                <Icon name="nodes" size={17} /> View concept map
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-8">
          <Stat label="Topics" value={branch.topic_count} icon="nodes" />
          <Stat label="Resources" value={resources} icon="layers" />
          <Stat label="Problems" value={problems} icon="puzzle" />
        </div>
      </div>

      <h2 className="section-title mt-12 mb-6">Concepts in {branch.name}</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
        {branch.topics.map((topic) => (
          <TopicCard
            key={topic.id}
            topic={{ ...topic, branch_name: branch.name, branch_color: branch.color }}
          />
        ))}
      </div>
    </div>
  );
}
