import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ErrorBox, Field } from '../components/ui';
import LocationPicker from '../components/LocationPicker';
import { AuthShell } from './Login';
import { PASSWORD_HINT, PASSWORD_RULE } from '../utils/options';

const ROLE_OPTIONS = [
  { value: 'adopter', title: 'Adopter', text: 'I want to adopt or foster' },
  { value: 'shelter', title: 'Shelter / Caregiver', text: 'I list animals needing homes' },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    role: params.get('role') === 'shelter' ? 'shelter' : 'adopter',
    shelterType: params.get('type') === 'caregiver' ? 'individual caregiver' : 'shelter',
    name: '',
    organisationName: '',
    email: '',
    password: '',
    phone: '',
    city: 'Hyderabad',
    description: '',
    address: '',
    location: null,
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const isShelter = form.role === 'shelter';

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!PASSWORD_RULE.test(form.password)) {
      setError(PASSWORD_HINT);
      return;
    }
    if (isShelter && !form.location) {
      setError('Please set your location on the map so adopters can find you.');
      return;
    }
    setBusy(true);
    try {
      const { location, ...rest } = form;
      await register({ ...rest, lat: location?.lat, lng: location?.lng });
      navigate(isShelter ? '/dashboard' : '/profile?welcome=1', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Join PawShare" subtitle="Free for adopters, shelters and foster caregivers.">
      <form onSubmit={submit} className="space-y-4">
        <ErrorBox error={error} />
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
          {ROLE_OPTIONS.map((r) => (
            <button
              type="button"
              key={r.value}
              role="radio"
              aria-checked={form.role === r.value}
              onClick={() => setForm({ ...form, role: r.value })}
              className={`rounded-2xl border-2 p-3 text-left transition ${form.role === r.value ? 'border-clay bg-sun/15' : 'border-black/10 bg-white hover:border-black/20'}`}
            >
              <span className="block font-bold text-forest">{r.title}</span>
              <span className="block text-xs text-muted">{r.text}</span>
            </button>
          ))}
        </div>

        {isShelter && (
          <Field label="I am a…">
            <select className="input" value={form.shelterType} onChange={set('shelterType')}>
              <option value="shelter">Shelter / rescue organisation</option>
              <option value="individual caregiver">Individual caregiver / foster parent</option>
            </select>
          </Field>
        )}

        <Field label={isShelter ? 'Contact person name' : 'Your name'}>
          <input className="input" required value={form.name} onChange={set('name')} autoComplete="name" />
        </Field>
        {isShelter && (
          <Field label={form.shelterType === 'shelter' ? 'Organisation name' : 'Public display name'}>
            <input className="input" value={form.organisationName} onChange={set('organisationName')} placeholder={form.shelterType === 'shelter' ? 'e.g. Happy Tails Rescue' : 'Defaults to your name'} />
          </Field>
        )}
        <Field label="Email">
          <input className="input" type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
        </Field>
        <Field label="Password" hint={PASSWORD_HINT}>
          <input className="input" type="password" required minLength={8} value={form.password} onChange={set('password')} autoComplete="new-password" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone">
            <input className="input" value={form.phone} onChange={set('phone')} autoComplete="tel" />
          </Field>
          <Field label="City">
            <input className="input" value={form.city} onChange={set('city')} />
          </Field>
        </div>
        {isShelter && (
          <>
            <Field label="Address">
              <input className="input" value={form.address} onChange={set('address')} />
            </Field>
            <Field label="About you">
              <textarea className="input min-h-20" value={form.description} onChange={set('description')} placeholder="Tell adopters about your work" />
            </Field>
          </>
        )}
        <div>
          <span className="label">{isShelter ? 'Location (required)' : 'Your location (optional, for distance & matching)'}</span>
          <LocationPicker value={form.location} onChange={(location) => setForm((f) => ({ ...f, location }))} height={200} />
        </div>
        <button className="btn-accent w-full py-3" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-clay-dark hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
