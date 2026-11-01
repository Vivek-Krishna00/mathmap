import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useFetch } from '../hooks/useFetch.js';
import { Icon } from '../components/icons.jsx';
import { Button, Card, DifficultyPill, EmptyState, ErrorState, Loading, ProgressBar, Stat, TypeBadge } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate } from '../lib/format.js';

const STATUS_TONE = {
  approved: 'bg-teal-600/12 text-teal-700 dark:text-teal-300',
  pending: 'bg-accent-500/15 text-accent-700 dark:text-accent-300',
  rejected: 'bg-rose-700/12 text-rose-800 dark:text-rose-300',
};

export default function Dashboard() {
  const { user, isModerator, isAdmin } = useAuth();
  const { data: roadmapData, loading: rl, error: re, reload: rr } = useFetch(() => api('/roadmaps'), []);
  const { data: mineData } = useFetch(() => api('/resources/mine'), []);
  const { data: nextData } = useFetch(() => api('/insights/next'), []);
  const { data: analyticsData } = useFetch(() => api('/insights/analytics'), []);
  const { data: reviewData } = useFetch(() => api('/review'), []);
  const { data: notesData } = useFetch(() => api('/notes'), []);

  const roadmaps = roadmapData?.roadmaps || [];
  const contributions = mineData?.resources || [];
  const upNext = nextData?.next || [];
  const analytics = analyticsData?.branches || [];
  const dueCount = reviewData?.count || 0;
  const notes = notesData?.notes || [];

  const totalTopics = roadmaps.reduce((acc, r) => acc + Number(r.topic_count || 0), 0);
  const totalCompleted = roadmaps.reduce((acc, r) => acc + Number(r.completed_count || 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Welcome back, {user.name.split(' ')[0]}</h1>
          <p className="text-muted mt-2">Track your roadmaps, resume learning, and see how your contributions are doing.</p>
        </div>
        <div className="flex gap-2">
          {isModerator && <Button variant="secondary" as={Link} to="/moderation"><Icon name="shield" size={16} /> Moderation</Button>}
          {isAdmin && <Button variant="secondary" as={Link} to="/admin"><Icon name="users" size={16} /> Admin</Button>}
          <Button as={Link} to="/roadmaps/new"><Icon name="plus" size={16} /> New roadmap</Button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        <Stat label="Roadmaps" value={roadmaps.length} icon="route" />
        <Stat label="Topics in your paths" value={totalTopics} icon="nodes" />
        <Stat label="Topics completed" value={totalCompleted} icon="checkCircle" />
        <Stat label="Contributions" value={contributions.length} icon="sparkles" />
      </div>

      {/* next steps + review queue */}
      <section className="mt-12 grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Icon name="target" size={18} className="text-brand-600 dark:text-brand-300" /> Up next
          </h2>
          <p className="text-sm text-muted mt-1">Concepts you are ready for — every prerequisite is already done.</p>
          {upNext.length === 0 ? (
            <p className="text-sm text-muted mt-4">
              Complete a topic on one of your roadmaps and the concepts it unlocks will appear here.
            </p>
          ) : (
            <ul className="mt-4 space-y-1">
              {upNext.map((topic) => (
                <li key={topic.id}>
                  <Link
                    to={`/topics/${topic.slug}`}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 -mx-3 hover:bg-sunken transition"
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: topic.branch_color }} aria-hidden="true" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium truncate">{topic.title}</span>
                      <span className="block text-xs text-muted">{topic.branch_name} · {topic.resource_count} resources</span>
                    </span>
                    <DifficultyPill level={topic.difficulty_level} showLabel={false} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Icon name="clock" size={18} className="text-brand-600 dark:text-brand-300" /> Review queue
          </h2>
          <p className="text-sm text-muted mt-1">
            Completed topics come back for a revisit on a widening schedule — 3, 7, 16, then 35 days.
          </p>
          <p className="mt-4 text-3xl font-bold font-display tabular-nums">{dueCount}</p>
          <p className="text-sm text-muted">{dueCount === 1 ? 'topic is due' : 'topics are due'} for review</p>
          <Button variant={dueCount ? 'primary' : 'secondary'} size="sm" className="mt-4" as={Link} to="/review">
            {dueCount ? 'Start reviewing' : 'See the queue'}
          </Button>
        </Card>
      </section>

      {/* mastery */}
      {analytics.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold mb-5">Mastery by branch</h2>
          <Card className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Completed topics per branch</caption>
                <thead className="text-muted">
                  <tr>
                    <th scope="col" className="text-left font-medium pb-2">Branch</th>
                    <th scope="col" className="text-left font-medium pb-2">Progress</th>
                    <th scope="col" className="text-right font-medium pb-2">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {analytics.map((branch) => (
                    <tr key={branch.id}>
                      <td className="py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: branch.color }} aria-hidden="true" />
                          {branch.name}
                        </span>
                      </td>
                      <td className="py-2.5 w-1/2">
                        <div className="flex items-center gap-3">
                          <div className="h-2 flex-1 rounded-full bg-sunken overflow-hidden" aria-hidden="true">
                            <div className="h-full rounded-full bg-brand-600" style={{ width: `${branch.percent}%` }} />
                          </div>
                          <span className="text-xs text-muted tabular-nums w-10 text-right">{branch.percent}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-muted">{branch.completed} / {branch.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      )}

      {/* notes */}
      {notes.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-semibold mb-5">Your notes &amp; bookmarks</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {notes.map((note) => (
              <Card key={note.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    to={`/topics/${note.slug}`}
                    className="font-medium truncate hover:text-brand-600 dark:hover:text-brand-300"
                  >
                    {note.title}
                  </Link>
                  {note.bookmarked && (
                    <Icon name="star" size={15} className="text-accent-600 dark:text-accent-300 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted mt-1">{note.branch_name}</p>
                {note.body && (
                  <p className="text-sm text-muted mt-2 line-clamp-3 whitespace-pre-line">{note.body}</p>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-xl font-semibold mb-5">Your roadmaps</h2>

        {rl && <Loading label="Loading roadmaps" />}
        {re && <ErrorState error={re} onRetry={rr} />}

        {!rl && !re && roadmaps.length === 0 && (
          <EmptyState
            icon="route"
            title="No roadmaps yet"
            message="Generate a personalized path in under a minute."
            action={<Button as={Link} to="/roadmaps/new">Build my first roadmap</Button>}
          />
        )}

        {!rl && !re && roadmaps.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
            {roadmaps.map((rm) => {
              const pct = rm.topic_count ? Math.round((rm.completed_count / rm.topic_count) * 100) : 0;
              return (
                <Link key={rm.id} to={`/roadmaps/${rm.id}`} className="card card-hover p-5 flex flex-col">
                  <div className="flex items-center justify-between">
                    <span className="badge bg-brand-500/10 text-brand-600 dark:text-brand-300 capitalize">{rm.level}</span>
                    <Icon name="chevronRight" size={18} className="text-muted" />
                  </div>
                  <h3 className="font-semibold mt-3 flex-1">{rm.title}</h3>
                  {rm.goal && <p className="text-xs text-muted mt-1.5 line-clamp-2">{rm.goal}</p>}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-muted mb-1.5">
                      <span>{rm.completed_count} / {rm.topic_count} done</span>
                      <span>{pct}%</span>
                    </div>
                    <ProgressBar value={pct} tone={pct === 100 ? 'bg-teal-600' : 'bg-brand-600'} />
                  </div>
                  <span className="text-[11px] text-muted mt-3">Created {formatDate(rm.created_at)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold mb-5">Your contributions</h2>
        {contributions.length === 0 ? (
          <Card className="p-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted">You haven&apos;t contributed anything yet. Share a resource or a problem that helped you.</p>
            <Button variant="secondary" as={Link} to="/contribute"><Icon name="sparkles" size={16} /> Contribute</Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {contributions.map((r) => (
              <Card key={r.id} className="p-4 flex flex-wrap items-center gap-3">
                <TypeBadge type={r.type} />
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium flex-1 min-w-[12rem] hover:text-brand-600 dark:hover:text-brand-300 truncate">
                  {r.title}
                </a>
                <span className={`badge ${STATUS_TONE[r.status]}`}>{r.status}</span>
                <span className="text-xs text-muted inline-flex items-center gap-1">
                  <Icon name="up" size={13} /> {r.net_votes}
                </span>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
