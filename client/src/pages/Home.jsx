import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useFetch } from '../hooks/useFetch.js';
import { useReveal } from '../hooks/motion.js';
import { Icon } from '../components/icons.jsx';
import HeroGraphic from '../components/HeroGraphic.jsx';
import { Button, Loading, cx } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function Reveal({ children, className = '' }) {
  const { ref, shown } = useReveal();
  return (
    <div ref={ref} className={cx('reveal', shown && 'is-shown', className)}>
      {children}
    </div>
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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-20 pb-24 grid lg:grid-cols-2 gap-12 items-center">
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
              Tell MathMap what you want to do and get a roadmap ordered by what you need first —
              with the videos, articles, simulations and problems that make it click.
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
            <HeroGraphic />
          </div>
        </div>
      </section>

      {/* one quiet line instead of four stat cards */}
      {stats && (
        <p className="mx-auto max-w-7xl px-4 sm:px-6 pt-10 text-sm text-muted">
          {stats.topics} concepts · {stats.resources} curated resources · {stats.problems} problems ·{' '}
          {stats.members} members
        </p>
      )}

      {/* goals — the primary way in */}
      {tracks.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-10 pb-16">
          <h2 className="section-title">What do you want to do?</h2>
          <p className="text-muted mt-2 max-w-2xl">
            Pick a destination, not a subject. Each goal maps onto the mathematics it actually needs.
          </p>
          <Reveal>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8 stagger">
              {tracks.map((track) => (
                <Link
                  key={track.id}
                  to="/roadmaps/new"
                  state={{ trackSlug: track.slug }}
                  className="card card-hover p-5 flex items-start gap-3 group"
                >
                  <span
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `${track.color}1f`, color: track.color }}
                  >
                    <Icon name={track.icon || 'target'} size={20} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold group-hover:text-brand-600 dark:group-hover:text-brand-300">
                        {track.name}
                      </span>
                      <Icon name="arrowRight" size={16} className="text-muted shrink-0" />
                    </span>
                    <span className="block text-sm text-muted mt-1">{track.tagline}</span>
                  </span>
                </Link>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* subjects — compact, secondary */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-20">
        <h2 className="text-xl font-semibold">Or start from a subject</h2>
        {branchesLoading ? (
          <Loading label="Loading subjects" />
        ) : (
          <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10">
            {branches.map((branch) => (
              <Link
                key={branch.id}
                to={`/branches/${branch.slug}`}
                className="flex items-center gap-3 py-3 border-b border-line/70 group"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: branch.color }} aria-hidden="true" />
                <span className="font-medium group-hover:text-brand-600 dark:group-hover:text-brand-300">
                  {branch.name}
                </span>
                <span className="ml-auto text-xs text-muted">{branch.topic_count} topics</span>
              </Link>
            ))}
          </div>
        )}
        <p className="text-sm text-muted mt-8">
          Not sure where to start?{' '}
          <Link className="link" to="/placement">Take the two-minute placement check</Link> and we&apos;ll suggest
          a level and a few interests.
        </p>
      </section>

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
