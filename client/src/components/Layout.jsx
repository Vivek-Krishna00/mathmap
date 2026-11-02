import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from './icons.jsx';
import LogoMark from './LogoMark.jsx';
import { Avatar, Button, IconButton, cx } from './ui.jsx';
import CommandPalette, { OPEN_PALETTE_EVENT } from './CommandPalette.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABELS, ROLE_TONE } from '../lib/format.js';

const NAV = [
  { to: '/explore', label: 'Explore', icon: 'compass' },
  { to: '/graph', label: 'Concept map', icon: 'nodes' },
  { to: '/problems', label: 'Problems', icon: 'puzzle' },
  { to: '/community', label: 'Community', icon: 'users' },
  { to: '/contribute', label: 'Contribute', icon: 'sparkles' },
];

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('mathmap_theme') || 'light');
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('mathmap_theme', theme);
  }, [theme]);
  return { theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) };
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <IconButton
      icon={theme === 'dark' ? 'sun' : 'moon'}
      label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggle}
    />
  );
}

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <span className="w-9 h-9 rounded-xl overflow-hidden shadow-sm group-hover:scale-105 transition">
        <LogoMark />
      </span>
      <span className="font-display font-bold text-lg tracking-tight">MathMap</span>
    </Link>
  );
}

function UserMenu() {
  const { user, logout, isModerator, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-sunken transition"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={user.name} size={32} />
        <span className="hidden sm:block text-sm font-medium max-w-[9rem] truncate">{user.name}</span>
        <Icon name="chevronDown" size={15} className="text-muted" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 card p-1.5 shadow-pop animate-fade-up z-50" role="menu">
          <div className="px-3 py-2.5 border-b border-line mb-1">
            <div className="text-sm font-semibold truncate">{user.name}</div>
            <div className="text-xs text-muted truncate">{user.email}</div>
            <span className={cx('badge mt-2', ROLE_TONE[user.role])}>{ROLE_LABELS[user.role] || user.role}</span>
          </div>
          <MenuItem icon="route" label="Dashboard" onClick={() => { setOpen(false); navigate('/dashboard'); }} />
          <MenuItem icon="layers" label="My roadmaps" onClick={() => { setOpen(false); navigate('/dashboard'); }} />
          {isModerator && <MenuItem icon="shield" label="Moderation" onClick={() => { setOpen(false); navigate('/moderation'); }} />}
          {isAdmin && <MenuItem icon="users" label="Admin" onClick={() => { setOpen(false); navigate('/admin'); }} />}
          <MenuItem icon="logout" label="Sign out" tone="text-rose-500" onClick={() => { setOpen(false); logout(); navigate('/'); }} />
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick, tone }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cx('w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-left transition hover:bg-sunken', tone || 'text-ink')}
    >
      <Icon name={icon} size={16} className="text-muted" />
      {label}
    </button>
  );
}

function NavBar() {
  const { isAuthenticated, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="hidden lg:flex items-center gap-1">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cx(
                      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
                      isActive ? 'bg-brand-500/10 text-brand-600 dark:text-brand-300' : 'text-muted hover:text-ink hover:bg-sunken',
                    )
                  }
                >
                  <Icon name={item.icon} size={16} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event(OPEN_PALETTE_EVENT))}
              className="hidden md:inline-flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted hover:text-ink hover:bg-sunken transition"
              aria-label="Search topics and pages"
            >
              <Icon name="search" size={15} />
              Search
              <kbd className="text-[10px] border border-line rounded px-1">⌘K</kbd>
            </button>
            <ThemeToggle />
            {!loading && (isAuthenticated ? (
              <UserMenu />
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="ghost" size="sm" as={Link} to="/login">Sign in</Button>
                <Button size="sm" as={Link} to="/register">Get started</Button>
              </div>
            ))}
            <button
              type="button"
              className="lg:hidden p-2 rounded-lg text-muted hover:bg-sunken"
              aria-label="Toggle navigation"
              onClick={() => setMobileOpen((o) => !o)}
            >
              <Icon name={mobileOpen ? 'close' : 'menu'} size={20} />
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-line bg-surface animate-fade-up">
          <nav className="mx-auto max-w-7xl px-4 py-3 flex flex-col gap-1">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cx(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                    isActive ? 'bg-brand-500/10 text-brand-600 dark:text-brand-300' : 'text-muted hover:bg-sunken',
                  )
                }
              >
                <Icon name={item.icon} size={18} />
                {item.label}
              </NavLink>
            ))}
            {!isAuthenticated && (
              <div className="flex gap-2 pt-2 border-t border-line mt-2">
                <Button variant="secondary" as={Link} to="/login" className="flex-1">Sign in</Button>
                <Button as={Link} to="/register" className="flex-1">Get started</Button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 grid gap-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="text-sm text-muted mt-3 max-w-sm">
            A community-driven platform that turns scattered mathematics resources into a personalized,
            prerequisite-aware learning path.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">Learn</h4>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link className="hover:text-ink" to="/explore">Explore topics</Link></li>
            <li><Link className="hover:text-ink" to="/roadmaps/new">Build a roadmap</Link></li>
            <li><Link className="hover:text-ink" to="/graph">Concept map</Link></li>
            <li><Link className="hover:text-ink" to="/problems">Problem bank</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">Community</h4>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link className="hover:text-ink" to="/contribute">Contribute resources</Link></li>
            <li><Link className="hover:text-ink" to="/login">Sign in</Link></li>
            <li><Link className="hover:text-ink" to="/register">Create an account</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted">
          <span>MathMap · Academic major project</span>
          <span>Built with React, Express &amp; PostgreSQL</span>
        </div>
      </div>
    </footer>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>
      <NavBar />
      <main id="main" className="flex-1">
        {/* keyed so each route fades in on navigation */}
        <div key={pathname} className="animate-fade-up">
          <Outlet />
        </div>
      </main>
      <Footer />
      <CommandPalette />
    </div>
  );
}
