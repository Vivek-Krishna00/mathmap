import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { Icon } from './icons.jsx';
import { cx } from './ui.jsx';

const PAGES = [
  { label: 'Home', to: '/', icon: 'compass' },
  { label: 'Explore topics', to: '/explore', icon: 'compass' },
  { label: 'Concept map', to: '/graph', icon: 'nodes' },
  { label: 'Problem bank', to: '/problems', icon: 'puzzle' },
  { label: 'Build a roadmap', to: '/roadmaps/new', icon: 'route' },
  { label: 'Placement check', to: '/placement', icon: 'target' },
  { label: 'Review queue', to: '/review', icon: 'clock' },
  { label: 'Dashboard', to: '/dashboard', icon: 'user' },
];

export const OPEN_PALETTE_EVENT = 'mathmap:open-palette';

export default function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [topics, setTopics] = useState(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      } else if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    inputRef.current?.focus();
    if (!topics) {
      api('/topics?limit=200')
        .then((data) => setTopics(data.topics || []))
        .catch(() => setTopics([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchedTopics = (topics || [])
      .filter((t) => !q || `${t.title} ${t.branch_name} ${(t.tags || []).join(' ')}`.toLowerCase().includes(q))
      .slice(0, 8)
      .map((t) => ({
        key: `topic-${t.id}`,
        label: t.title,
        sub: `${t.branch_name} · L${t.difficulty_level}`,
        to: `/topics/${t.slug}`,
        color: t.branch_color,
      }));
    const matchedPages = PAGES
      .filter((p) => !q || p.label.toLowerCase().includes(q))
      .map((p) => ({ key: `page-${p.to}`, label: p.label, to: p.to, icon: p.icon }));
    return [...matchedTopics, ...matchedPages].slice(0, 12);
  }, [query, topics]);

  useEffect(() => { setActive(0); }, [query]);

  if (!open) return null;

  const go = (item) => {
    if (!item) return;
    setOpen(false);
    navigate(item.to);
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(results[active]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden="true" />
      <div className="relative w-full max-w-xl card overflow-hidden shadow-pop">
        <div className="flex items-center gap-3 px-4 border-b border-line">
          <Icon name="search" size={18} className="text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search topics or jump to a page…"
            aria-label="Search topics or pages"
            className="flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-muted/70"
          />
          <kbd className="hidden sm:block text-[10px] text-muted border border-line rounded px-1.5 py-0.5">esc</kbd>
        </div>

        <ul className="max-h-80 overflow-y-auto py-1.5">
          {results.length === 0 && <li className="px-4 py-3 text-sm text-muted">No matches.</li>}
          {results.map((item, index) => (
            <li key={item.key}>
              <button
                type="button"
                onMouseEnter={() => setActive(index)}
                onClick={() => go(item)}
                className={cx(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition',
                  index === active ? 'bg-sunken' : '',
                )}
              >
                {item.color ? (
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} aria-hidden="true" />
                ) : (
                  <Icon name={item.icon} size={16} className="text-muted shrink-0" />
                )}
                <span className="flex-1 min-w-0 truncate">{item.label}</span>
                {item.sub && <span className="text-xs text-muted shrink-0">{item.sub}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
