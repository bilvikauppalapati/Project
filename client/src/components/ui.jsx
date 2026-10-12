import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { STATUS_STYLES } from '../utils/options';
import { label } from '../utils/format';
import { PawIcon, ShieldCheckIcon, StarIcon, XIcon } from './Icons';

export function Spinner({ className = '' }) {
  return (
    <div className={`flex items-center justify-center py-16 ${className}`} role="status" aria-label="Loading">
      <PawIcon size={34} className="animate-bounce text-clay" />
    </div>
  );
}

export function StatusPill({ status, className = '' }) {
  return <span className={`chip ${STATUS_STYLES[status] || 'bg-stone-100 text-stone-700'} ${className}`}>{label(status)}</span>;
}

export function VerifiedBadge({ small }) {
  return (
    <span className={`chip bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 ${small ? '!px-1.5 !text-[10px]' : ''}`} title="Verified by PawShare">
      <ShieldCheckIcon size={small ? 11 : 13} strokeWidth={2.5} /> Verified
    </span>
  );
}

export function Stars({ value = 0, size = 16, className = '' }) {
  return (
    <span className={`inline-flex text-sun-dark ${className}`} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} size={size} filled={i <= Math.round(value)} />
      ))}
    </span>
  );
}

export function StarInput({ value, onChange }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i}
          onClick={() => onChange(i)}
          className="text-sun-dark transition hover:scale-110"
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
        >
          <StarIcon size={30} filled={i <= value} />
        </button>
      ))}
    </div>
  );
}

export function MatchBadge({ score, className = '' }) {
  if (score === undefined || score === null) return null;
  const tone = score >= 75 ? 'bg-emerald-600' : score >= 50 ? 'bg-clay' : 'bg-stone-500';
  return <span className={`chip ${tone} text-white shadow ${className}`}>{score}% match</span>;
}

export function EmptyState({ title, children, action, icon = '🐾' }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 text-4xl">{icon}</div>
      <h3 className="text-xl font-bold">{title}</h3>
      {children && <p className="mt-1 max-w-md text-sm text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorBox({ error, className = '' }) {
  if (!error) return null;
  return <div className={`rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 ${className}`}>{String(error.message || error)}</div>;
}

export function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      <button className="btn-outline !px-4" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      <span className="px-3 text-sm font-bold text-forest">
        Page {page} of {totalPages}
      </span>
      <button className="btn-outline !px-4" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next
      </button>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1500] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-cream p-6 shadow-xl sm:rounded-3xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-muted hover:bg-black/5" aria-label="Close">
            <XIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="section-title">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function StatCard({ label: text, value, icon, tone = 'bg-sand text-forest' }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${tone}`}>{icon}</div>
      <div>
        <p className="font-display text-3xl font-bold leading-none text-forest">{value}</p>
        <p className="mt-1 text-sm text-muted">{text}</p>
      </div>
    </div>
  );
}

export function Field({ label: text, hint, error, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      {text && <span className="label">{text}</span>}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-semibold text-red-600">{error}</span>}
    </label>
  );
}

export function TagToggle({ options, value = [], onChange, format = label }) {
  const toggle = (opt) => onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const on = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(opt)}
            className={`rounded-full border px-3 py-1 text-xs font-bold transition ${on ? 'border-forest bg-forest text-white' : 'border-black/10 bg-white text-forest hover:border-forest/40'}`}
          >
            {format(opt)}
          </button>
        );
      })}
    </div>
  );
}
