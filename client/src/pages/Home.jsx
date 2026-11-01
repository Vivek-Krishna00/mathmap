import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useFetch } from '../hooks/useFetch.js';
import { useReveal } from '../hooks/motion.js';
import BranchCard from '../components/BranchCard.jsx';
import { Icon } from '../components/icons.jsx';
import { Button, Card, Loading, Stat, TypeBadge, cx } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const STEPS = [
  { icon: 'target', title: 'Tell us your goal', body: 'Pick the branches you care about, your level and the ideas you find interesting.' },
  { icon: 'route', title: 'Get a personal roadmap', body: 'We order concepts by their prerequisites and attach a diverse mix of resources.' },
  { icon: 'sparkles', title: 'Learn and give back', body: 'Track progress, then contribute the resources and problems that helped you.' },
];

function Reveal({ children, className = '' }) {
  const { ref, shown } = useReveal();
  return (
    <div ref={ref} className={cx('reveal', shown && 'is-shown', className)}>
      {children}
    </div>
  );
}

function HeroPreview() {
  const rows = [
    { n: 1, title: 'Vectors', tone: 'text-teal-700 dark:text-teal-300', state: 'Completed' },
    { n: 2, title: 'Matrices & matrix operations', tone: 'text-accent-700 dark:text-accent-300', state: 'In progress' },
    { n: 3, title: 'Eigenvalues & eigenvectors', tone: 'text-muted', state: 'Next' },
  ];
  return (
    <Card className="p-5 w-full max-w-sm shadow-pop animate-fade-up">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">Your roadmap</span>
        <span className="badge bg-brand-600/10 text-brand-700 dark:text-brand-300">Linear Algebra</span>
      </div>
      <ul className="mt-4 space-y-3">
        {rows.map((r) => (
          <li key={r.n} className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-sunken flex items-center justify-center text-sm font-bold font-display">{r.n}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium truncate">{r.title}</span>
              <span className={`block text-xs ${r.tone}`}>{r.state}</span>
            </span>
            <Icon name="chevronRight" size={16} className="text-muted" />
          </li>
        ))}
      </ul>
      <div className="mt-4 pt-4 border-t border-line">
        <div className="h-2 rounded-full bg-sunken overflow-hidden">
          <div className="h-full w-1/3 rounded-full bg-brand-600" />
        </div>
        <p className="text-xs text-muted mt-2">3 of 15 topics complete</p>
      </div>
    </Card>
  );
}

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { data: branchData, loading: branchesLoading } = useFetch(() => api('/branches'), []);
  const { data: trackData } = useFetch(() => api('/tracks'), []);
  const { data: stats } = useFetch(() => api('/stats'), []);

  const branches = branchData?.branches || [];
  const tracks = trackData?.tracks || [];

  return (
    <div>
      {/* hero */}
      <section className="relative overflow-hidden border-b border-line bg-sunken/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-up">
            <span className="badge bg-brand-600/10 text-brand-700 dark:text-brand-300">
              <Icon name="sparkles" size={13} /> Community-driven mathematics
            </span>
            <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05]">
              Mathematics,
              <br />
              mapped to <span className="text-brand-600 dark:text-brand-400">you</span>.
            </h1>
            <p className="mt-5 text-lg text-muted max-w-xl">
              Stop hunting across a dozen sites. Tell MathMap what you want to learn and get a personalized
              roadmap - ordered by prerequisites, filled with videos, articles, interactive tools and problems.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" as={Link} to="/roadmaps/new">
                <Icon name="route" size={18} /> Build my roadmap
              </Button>
              <Button size="lg" variant="secondary" as={Link} to="/explore">
                <Icon name="compass" size={18} /> Explore topics
              </Button>
            </div>
            {!isAuthenticated && (
              <p className="text-sm text-muted mt-4">
                New here? <Link className="link" to="/register">Create a free account</Link> to save your roadmaps.
              </p>
            )}
          </div>
          <div className="flex justify-center lg:justify-end">
            <HeroPreview />
          </div>
        </div>
      </section>

      {/* stats */}
      {stats && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-12">
          <Reveal>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Concepts mapped" value={stats.topics} icon="nodes" />
              <Stat label="Curated resources" value={stats.resources} icon="layers" />
              <Stat label="Practice problems" value={stats.problems} icon="puzzle" />
              <Stat label="Community members" value={stats.members} icon="users" />
            </div>
          </Reveal>
        </section>
      )}

      {/* branches */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="section-title">Explore the six branches</h2>
            <p className="text-muted mt-2">Each branch is a graph of concepts connected by their prerequisites.</p>
          </div>
          <Link to="/graph" className="hidden sm:inline-flex link items-center gap-1.5">
            View concept map <Icon name="arrowRight" size={16} />
          </Link>
        </div>
        {branchesLoading ? (
          <Loading label="Loading branches" />
        ) : (
          <Reveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
              {branches.map((branch, i) => (
                <BranchCard key={branch.id} branch={branch} index={i} />
              ))}
            </div>
          </Reveal>
        )}
      </section>

      {/* goals */}
      {tracks.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-20">
          <div className="mb-8">
            <h2 className="section-title">What do you want to do?</h2>
            <p className="text-muted mt-2">
              Pick a destination, not a subject. Each goal maps onto the mathematics it actually needs.
            </p>
          </div>
          <Reveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
              {tracks.map((track) => (
                <Link
                  key={track.id}
                  to="/roadmaps/new"
                  state={{ trackSlug: track.slug }}
                  className="card card-hover p-5 flex flex-col group"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${track.color}1f`, color: track.color }}
                    >
                      <Icon name={track.icon || 'target'} size={20} />
                    </span>
                    <Icon name="arrowRight" size={18} className="text-muted group-hover:text-brand-500 group-hover:translate-x-0.5 transition" />
                  </div>
                  <h3 className="font-semibold mt-3 group-hover:text-brand-600 dark:group-hover:text-brand-300">{track.name}</h3>
                  <p className="text-sm text-muted mt-1 flex-1">{track.tagline}</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="badge bg-sunken text-muted">{track.topic_count} concepts</span>
                    <span className="badge bg-sunken text-muted">{track.branch_count} branches</span>
                  </div>
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* how it works */}
      <section className="border-y border-line bg-sunken/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
          <Reveal>
            <h2 className="section-title text-center">How MathMap works</h2>
            <div className="grid md:grid-cols-3 gap-6 mt-10">
              {STEPS.map((step, i) => (
                <Card key={step.title} className="p-6">
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 rounded-xl bg-brand-600/10 text-brand-700 dark:text-brand-300 flex items-center justify-center">
                      <Icon name={step.icon} size={22} />
                    </span>
                    <span className="font-display font-bold text-3xl text-accent-600">{i + 1}</span>
                  </div>
                  <h3 className="font-semibold text-lg mt-4">{step.title}</h3>
                  <p className="text-sm text-muted mt-2">{step.body}</p>
                </Card>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* top resources */}
      {stats?.topResources?.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 py-16">
          <div className="mb-8">
            <h2 className="section-title">Loved by the community</h2>
            <p className="text-muted mt-2">The most upvoted resources across all branches.</p>
          </div>
          <Reveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {stats.topResources.map((r) => (
                <a
                  key={r.id}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card card-hover p-5 flex flex-col group"
                >
                  <div className="flex items-center justify-between">
                    <TypeBadge type={r.type} />
                    <span className="badge bg-teal-600/12 text-teal-700 dark:text-teal-300">
                      <Icon name="up" size={12} /> {r.net_votes}
                    </span>
                  </div>
                  <h3 className="font-semibold mt-3 group-hover:text-brand-600 dark:group-hover:text-brand-300">{r.title}</h3>
                  <p className="text-xs text-muted mt-1.5 flex-1">{r.provider}</p>
                  <span className="text-xs text-muted mt-3 inline-flex items-center gap-1.5">
                    <Icon name="external" size={13} /> Open resource
                  </span>
                </a>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-8">
        <Reveal>
          <div className="rounded-2xl bg-brand-700 p-8 sm:p-12 text-center text-white">
            <h2 className="text-3xl sm:text-4xl font-bold">Your next mathematical idea is one click away</h2>
            <p className="mt-4 text-white/75 max-w-2xl mx-auto">
              Build a roadmap in under a minute, or help someone else by contributing a resource you love.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" as={Link} to="/roadmaps/new" className="bg-white text-brand-700 hover:bg-white/90">
                <Icon name="route" size={18} /> Build my roadmap
              </Button>
              <Button
                size="lg"
                as={Link}
                to="/contribute"
                className="bg-accent-600 text-white border border-accent-600 hover:bg-accent-500"
              >
                <Icon name="sparkles" size={18} /> Contribute a resource
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
