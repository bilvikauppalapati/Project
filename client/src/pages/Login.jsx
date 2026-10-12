import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ErrorBox, Field } from '../components/ui';
import { PawIcon } from '../components/Icons';

export function AuthShell({ title, subtitle, children }) {
  return (
    <div className="container-page flex justify-center py-12 sm:py-16">
      <div className="card w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 text-center">
          <PawIcon size={40} className="mx-auto text-clay" />
          <h1 className="mt-2 text-3xl font-bold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

const DEMO_ACCOUNTS = [
  ['Admin', 'admin@gmail.com'],
  ['Adopter', 'user@gmail.com'],
  ['Caregiver', 'care@gmail.com'],
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(form.email, form.password);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to continue your adoption journey.">
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox error={error} />
        <Field label="Email">
          <input className="input" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password">
          <input className="input" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <button className="btn-primary w-full py-3" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
      </form>
      {import.meta.env.DEV && (
        <div className="mt-6 rounded-2xl border border-dashed border-clay/50 bg-sun/10 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-clay-dark">Demo accounts (development only)</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {DEMO_ACCOUNTS.map(([name, email]) => (
              <button key={email} type="button" onClick={() => setForm({ email, password: 'Test@12345' })} className="rounded-xl bg-white px-2 py-2 text-xs font-bold text-forest shadow-sm hover:bg-sand">
                {name}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted">Fills the form; press Log in. Password: Test@12345</p>
        </div>
      )}
      <p className="mt-6 text-center text-sm text-muted">
        New to PawShare?{' '}
        <Link to="/register" className="font-bold text-clay-dark hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
