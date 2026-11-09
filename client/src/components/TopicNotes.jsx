import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Icon } from './icons.jsx';
import { Button, Spinner, Textarea, cx } from './ui.jsx';

function savedAt(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function TopicNotes({ slug }) {
  const { isAuthenticated } = useAuth();
  const { error: toastError } = useToast();

  const [note, setNote] = useState({ body: '', bookmarked: false, updated_at: null });
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const savedTimer = useRef(null);

  useEffect(() => () => clearTimeout(savedTimer.current), []);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let cancelled = false;
    api(`/notes/${slug}`)
      .then((data) => {
        if (cancelled) return;
        setNote(data.note);
        setDraft(data.note.body || '');
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [slug, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="card p-5">
        <h3 className="font-semibold flex items-center gap-2">
          <Icon name="edit" size={16} className="text-muted" /> Your notes
        </h3>
        <p className="text-sm text-muted mt-2">
          <Link className="link" to="/login">Sign in</Link> to keep private notes and bookmark this topic.
        </p>
      </div>
    );
  }

  const dirty = draft !== (note.body || '');

  const save = async (patch) => {
    setSaving(true);
    try {
      const data = await api(`/notes/${slug}`, { method: 'PUT', body: patch });
      setNote(data.note);
      setDraft(data.note.body || '');
      setJustSaved(true);
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setJustSaved(false), 2600);
    } catch (err) {
      toastError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const cue = (() => {
    if (saving) {
      return (
        <>
          <Spinner size={12} className="text-muted" />
          <span className="text-muted">Saving…</span>
        </>
      );
    }
    if (dirty) {
      return (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-accent-500" aria-hidden="true" />
          <span className="text-accent-700 dark:text-accent-300">Unsaved changes</span>
        </>
      );
    }
    if (justSaved) {
      return (
        <>
          <Icon name="checkCircle" size={13} className="text-teal-600 dark:text-teal-400 mm-pop" />
          <span className="font-medium text-teal-700 dark:text-teal-300">Saved</span>
        </>
      );
    }
    if (note.updated_at) {
      return (
        <>
          <Icon name="checkCircle" size={13} className="text-muted" />
          <span className="text-muted">Saved at {savedAt(note.updated_at)}</span>
        </>
      );
    }
    return <span className="text-muted">No note yet</span>;
  })();

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold flex items-center gap-2">
          <Icon name="edit" size={16} className="text-muted" /> Your notes
        </h3>
        <button
          type="button"
          onClick={() => save({ bookmarked: !note.bookmarked })}
          disabled={saving}
          aria-pressed={note.bookmarked}
          aria-label={note.bookmarked ? 'Remove bookmark' : 'Bookmark this topic'}
          className={cx(
            'p-2 rounded-lg transition',
            note.bookmarked ? 'text-accent-600 dark:text-accent-300' : 'text-muted hover:text-ink',
          )}
        >
          <Icon name="star" size={18} />
        </button>
      </div>

      {/* Collapsed by default: the editor only appears when you actually want it. */}
      {expanded ? (
        <>
          <Textarea
            className="mt-3"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What clicked? What do you want to revisit?"
            maxLength={4000}
            aria-label="Your note for this topic"
            aria-describedby={`note-status-${slug}`}
          />

          <div className="flex items-center justify-between gap-3 mt-2.5">
            <span
              id={`note-status-${slug}`}
              role="status"
              aria-live="polite"
              className="inline-flex items-center gap-1.5 text-xs min-w-0"
            >
              {cue}
            </span>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-muted tabular-nums">{draft.length}/4000</span>
              <Button size="sm" onClick={() => save({ body: draft })} disabled={saving || !dirty}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setExpanded(false)}>Done</Button>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-3">
          {note.body ? (
            <p className="text-sm text-muted line-clamp-3 whitespace-pre-line">{note.body}</p>
          ) : (
            <p className="text-sm text-muted">No note yet.</p>
          )}
          <button type="button" onClick={() => setExpanded(true)} className="link text-sm mt-2">
            {note.body ? 'Edit note' : 'Add a note'}
          </button>
        </div>
      )}
    </div>
  );
}
