import { cloneElement, isValidElement, useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Icon } from './icons.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useCountUp } from '../hooks/motion.js';
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_TONE,
  RESOURCE_TYPE_ICON,
  RESOURCE_TYPE_LABELS,
  RESOURCE_TYPE_VERB,
} from '../lib/format.js';

export const cx = (...parts) => parts.filter(Boolean).join(' ');

/* ---------------------------------------------------------------- button */
export function Button({ variant = 'primary', size = 'md', className, as: Tag = 'button', children, ...props }) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
  };
  const sizes = { sm: 'btn-sm', md: '', lg: 'px-5 py-3 text-base' };
  return (
    <Tag className={cx(variants[variant], sizes[size], className)} {...props}>
      {children}
    </Tag>
  );
}

export function IconButton({ icon, label, className, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx('p-2 rounded-lg text-muted hover:text-ink hover:bg-sunken transition', className)}
      {...props}
    >
      <Icon name={icon} size={18} />
    </button>
  );
}

/* ---------------------------------------------------------------- surfaces */
export function Card({ className, children, ...props }) {
  return <div className={cx('card', className)} {...props}>{children}</div>;
}

export function Badge({ tone = 'bg-sunken text-muted', className, children }) {
  return <span className={cx('badge', tone, className)}>{children}</span>;
}

export function TypeBadge({ type, className, verb = false }) {
  return (
    <span className={cx('badge bg-brand-500/10 text-brand-700 dark:text-brand-300', className)}>
      <Icon name={RESOURCE_TYPE_ICON[type] || 'doc'} size={13} />
      {verb ? RESOURCE_TYPE_VERB[type] || type : RESOURCE_TYPE_LABELS[type] || type}
    </span>
  );
}

export function DifficultyPill({ level, showLabel = true, className }) {
  return (
    <span className={cx('badge', DIFFICULTY_TONE[level] || 'bg-sunken text-muted', className)}>
      <Icon name="signal" size={12} />
      {showLabel ? DIFFICULTY_LABELS[level] || `Level ${level}` : level}
    </span>
  );
}

export function ProgressBar({ value = 0, className, tone = 'bg-brand-600', label = 'Progress' }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const [filled, setFilled] = useState(0);

  // Start at zero and let the CSS transition do the fill, so bars visibly animate in.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setFilled(pct));
    return () => cancelAnimationFrame(raf);
  }, [pct]);

  return (
    <div
      className={cx('h-2 w-full rounded-full bg-sunken overflow-hidden', className)}
      role="progressbar"
      aria-label={label}
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={cx('h-full rounded-full transition-all duration-700 ease-out', tone)} style={{ width: `${filled}%` }} />
    </div>
  );
}

export function Spinner({ size = 20, className }) {
  return (
    <span
      className={cx('inline-block animate-spin rounded-full border-2 border-current border-t-transparent', className)}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}

export function Loading({ label = 'Loading', className }) {
  return (
    <div className={cx('flex items-center justify-center gap-3 py-16 text-muted', className)}>
      <Spinner />
      <span className="text-sm">{label}…</span>
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cx('skeleton', className)} />;
}

export function EmptyState({ icon = 'compass', title, message, action, className }) {
  return (
    <div className={cx('flex flex-col items-center justify-center text-center py-16 px-6', className)}>
      <div className="w-14 h-14 rounded-2xl bg-sunken flex items-center justify-center text-muted mb-4">
        <Icon name={icon} size={26} />
      </div>
      <h3 className="font-semibold text-ink">{title}</h3>
      {message && <p className="text-sm text-muted mt-1.5 max-w-md">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <EmptyState
      icon="alert"
      title="Something went wrong"
      message={error?.message || 'Unexpected error.'}
      action={onRetry && <Button variant="secondary" onClick={onRetry}>Try again</Button>}
    />
  );
}

export function Stat({ label, value, icon, hint, className }) {
  const display = useCountUp(value);
  return (
    <div className={cx('card p-4 flex items-center gap-3', className)}>
      {icon && (
        <span className="w-10 h-10 rounded-xl bg-brand-600/10 text-brand-700 dark:text-brand-300 flex items-center justify-center shrink-0">
          <Icon name={icon} size={19} />
        </span>
      )}
      <div className="min-w-0">
        <div className="text-xl font-bold font-display leading-none tabular-nums">{display}</div>
        <div className="text-xs text-muted mt-1 truncate">{label}</div>
        {hint && <div className="text-[11px] text-muted/80 mt-0.5">{hint}</div>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- forms */
/**
 * Associates the label, hint and error message with the control programmatically,
 * so a screen reader announces the error with the field instead of leaving it as
 * loose text on the page.
 */
export function Field({ label, hint, error, children, className }) {
  const generatedId = useId();
  const controlId = (isValidElement(children) && children.props.id) || generatedId;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id: controlId,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })
    : children;

  return (
    <div className={cx('block', className)}>
      {label && <label className="label" htmlFor={controlId}>{label}</label>}
      {control}
      {hint && !error && <p id={hintId} className="text-xs text-muted mt-1.5">{hint}</p>}
      {error && <p id={errorId} className="text-xs text-rose-600 dark:text-rose-400 mt-1.5">{error}</p>}
    </div>
  );
}

export function Input({ className, ...props }) {
  return <input className={cx('input', className)} {...props} />;
}

export function Textarea({ className, ...props }) {
  return <textarea className={cx('input resize-y min-h-[96px]', className)} {...props} />;
}

export function Select({ className, children, ...props }) {
  return (
    <select className={cx('input appearance-none pr-9 cursor-pointer', className)} {...props}>
      {children}
    </select>
  );
}

export function Avatar({ name = '?', size = 36, className }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  // accent-600 rather than 500: white text on accent-500 amber is only 3.78:1.
  const palette = ['bg-brand-600', 'bg-teal-600', 'bg-accent-600', 'bg-rose-700', 'bg-slate-600', 'bg-orange-800'];
  const tone = palette[(name.charCodeAt(0) || 0) % palette.length];
  return (
    <span
      className={cx('inline-flex items-center justify-center rounded-full text-white font-semibold shrink-0', tone, className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      title={name}
    >
      {initials || '?'}
    </span>
  );
}

/* ---------------------------------------------------------------- tabs */
export function Tabs({ tabs, active, onChange, className }) {
  return (
    <div className={cx('flex gap-1 overflow-x-auto border-b border-line', className)} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.value === active;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.value)}
            className={cx(
              'relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition rounded-t-lg',
              isActive ? 'text-brand-600 dark:text-brand-300' : 'text-muted hover:text-ink',
            )}
          >
            <span className="inline-flex items-center gap-2">
              {tab.icon && <Icon name={tab.icon} size={16} />}
              {tab.label}
              {tab.count !== undefined && (
                <span className="text-[11px] rounded-full bg-sunken px-1.5 py-0.5">{tab.count}</span>
              )}
            </span>
            {isActive && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-500" />}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- modal */
export function Modal({ open, onClose, title, children, footer, className }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  // Rendered into document.body: a fixed-position overlay inside the page tree is
  // positioned relative to any ancestor that has a transform, which silently
  // centres the dialog thousands of pixels down a long page.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* No backdrop-filter here: in some browsers/compositors it blurs the whole
          stacking layer, dialog included. A plain dim is predictable. */}
      <div className="absolute inset-0 bg-slate-950/60 dark:bg-black/75" onClick={onClose} aria-hidden="true" />
      <div
        className={cx(
          'relative card bg-surface dark:bg-sunken ring-1 ring-black/5 dark:ring-white/15 shadow-pop',
          'w-full max-w-lg animate-fade-up max-h-[90vh] overflow-y-auto',
          className,
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line sticky top-0 bg-surface dark:bg-sunken rounded-t-2xl z-10">
          <h3 className="font-semibold text-lg">{title}</h3>
          <IconButton icon="close" label="Close" onClick={onClose} />
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-line flex justify-end gap-2">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ---------------------------------------------------------------- toaster */
export function Toaster() {
  const { toasts, dismiss } = useToast();
  const tones = {
    success: 'border-teal-600/40 text-teal-700 dark:text-teal-300',
    error: 'border-rose-700/40 text-rose-700 dark:text-rose-300',
    info: 'border-brand-600/40 text-brand-700 dark:text-brand-300',
  };
  const icons = { success: 'checkCircle', error: 'xCircle', info: 'info' };
  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-[min(360px,calc(100vw-2rem))]">
      {toasts.map((t) => (
        <div
          key={t.id}
          /* Per-toast live region so confirmations and errors are announced. */
          role={t.type === 'error' ? 'alert' : 'status'}
          aria-live={t.type === 'error' ? 'assertive' : 'polite'}
          className={cx('card p-3.5 flex items-start gap-3 animate-fade-up border-l-4', tones[t.type])}
        >
          <Icon name={icons[t.type]} size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            {t.title && <div className="font-semibold text-sm text-ink">{t.title}</div>}
            <div className="text-sm text-muted">{t.message}</div>
          </div>
          <IconButton icon="close" label="Dismiss" onClick={() => dismiss(t.id)} />
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- misc */
export function BackLink({ to, children = 'Back' }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition">
      <Icon name="arrowLeft" size={16} />
      {children}
    </Link>
  );
}
