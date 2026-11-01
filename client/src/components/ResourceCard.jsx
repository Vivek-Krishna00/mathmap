import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './icons.jsx';
import { TypeBadge, cx } from './ui.jsx';
import { hostname } from '../lib/format.js';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function ResourceCard({ resource, onChange, shownTopics = true }) {
  const { isAuthenticated } = useAuth();
  const { toast, error } = useToast();
  const [netVotes, setNetVotes] = useState(resource.net_votes ?? 0);
  const [voteCount, setVoteCount] = useState(resource.vote_count ?? 0);
  const [myVote, setMyVote] = useState(resource.my_vote ?? 0);
  const [busy, setBusy] = useState(false);

  const castVote = async (value) => {
    if (!isAuthenticated) {
      toast({ type: 'info', message: 'Sign in to vote on community resources.' });
      return;
    }
    if (busy) return;
    setBusy(true);
    const prev = { netVotes, myVote, voteCount };
    const nextVote = myVote === value ? 0 : value;
    // Optimistic: score moves by the difference, and the total only changes when a
    // vote is added or removed (switching sides leaves the count alone).
    setMyVote(nextVote);
    setNetVotes((v) => v - myVote + nextVote);
    setVoteCount((c) => Math.max(0, c + (nextVote === 0 ? -1 : myVote === 0 ? 1 : 0)));
    try {
      const res = await api(`/resources/${resource.id}/vote`, { method: 'POST', body: { value } });
      setNetVotes(res.net_votes);
      setMyVote(res.myVote);
      setVoteCount(res.vote_count);
      onChange?.(resource.id, res);
    } catch (err) {
      setNetVotes(prev.netVotes);
      setMyVote(prev.myVote);
      setVoteCount(prev.voteCount);
      error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="card p-4 flex gap-4">
      <div className="flex flex-col items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={() => castVote(1)}
          aria-label="Upvote"
          className={cx('p-1.5 rounded-lg transition hover:bg-sunken', myVote === 1 ? 'text-teal-600 dark:text-teal-400' : 'text-muted')}
        >
          <Icon name="up" size={18} strokeWidth={2.2} />
        </button>
        <span className="text-sm font-semibold tabular-nums">{netVotes}</span>
        <button
          type="button"
          onClick={() => castVote(-1)}
          aria-label="Downvote"
          className={cx('p-1.5 rounded-lg transition hover:bg-sunken', myVote === -1 ? 'text-rose-500' : 'text-muted')}
        >
          <Icon name="down" size={18} strokeWidth={2.2} />
        </button>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={resource.type} verb />
          {resource.provider && <span className="text-xs text-muted">{resource.provider}</span>}
        </div>

        <h3 className="font-semibold mt-2 leading-snug">
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand-600 dark:hover:text-brand-300 inline-flex items-center gap-1.5"
          >
            {resource.title}
            <Icon name="external" size={14} className="text-muted" />
          </a>
        </h3>

        {resource.description && <p className="text-sm text-muted mt-1">{resource.description}</p>}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2.5 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <Icon name="globe" size={13} /> {hostname(resource.url)}
          </span>
          {voteCount > 0 && <span>{voteCount} votes</span>}
          {resource.submitted_by_name && <span>by {resource.submitted_by_name}</span>}
        </div>

        {shownTopics && resource.topic_slugs?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {resource.topic_slugs.slice(0, 5).map((slug) => (
              <Link key={slug} to={`/topics/${slug}`} className="badge bg-sunken text-muted hover:text-brand-600">
                {slug.replace(/-/g, ' ')}
              </Link>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
