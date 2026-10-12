import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LocationPicker from '../components/LocationPicker';
import { ErrorBox, Field, TagToggle } from '../components/ui';
import { cap } from '../utils/format';
import { ACTIVITY_LEVELS, EXPERIENCE_LEVELS, HOME_TYPES, PASSWORD_HINT, PASSWORD_RULE, PET_TYPES, SIZES, SPECIES } from '../utils/options';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const [params] = useSearchParams();
  const [lng, lat] = user.location?.coordinates || user.shelterProfile?.location?.coordinates || [];
  const prefs = user.preferences || {};
  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone || '',
    city: user.city || '',
    location: lat !== undefined ? { lat, lng } : null,
    preferences: {
      species: prefs.species || [],
      sizes: prefs.sizes || [],
      ageMin: prefs.ageRange?.min ?? '',
      ageMax: prefs.ageRange?.max ?? '',
      hasKids: Boolean(prefs.hasKids),
      hasOtherPets: Boolean(prefs.hasOtherPets),
      otherPetTypes: prefs.otherPetTypes || [],
      homeType: prefs.homeType || 'apartment',
      hasYard: Boolean(prefs.hasYard),
      activityLevel: prefs.activityLevel || 'medium',
      experience: prefs.experience || 'none',
      maxDistanceKm: prefs.maxDistanceKm || 25,
    },
    shelterProfile: {
      organisationName: '',
      type: 'shelter',
      description: '',
      address: '',
      contactEmail: '',
      contactPhone: '',
      website: '',
      ...user.shelterProfile,
    },
  });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const setPref = (key, value) => setForm({ ...form, preferences: { ...form.preferences, [key]: value } });
  const setProfile = (key) => (e) => setForm({ ...form, shelterProfile: { ...form.shelterProfile, [key]: e.target.value } });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { location, preferences: p, shelterProfile, ...rest } = form;
      const { ageMin, ageMax, ...prefRest } = p;
      await updateProfile({
        ...rest,
        ...(location && { lat: location.lat, lng: location.lng }),
        ...(user.role === 'adopter' && {
          preferences: {
            ...prefRest,
            maxDistanceKm: Number(p.maxDistanceKm),
            ageRange: { min: ageMin === '' ? undefined : Number(ageMin), max: ageMax === '' ? undefined : Number(ageMax) },
          },
        }),
        ...(user.role === 'shelter' && { shelterProfile }),
      });
      toast.success('Profile saved');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (!PASSWORD_RULE.test(pw.newPassword)) return toast.error(PASSWORD_HINT);
    try {
      await api.patch('/auth/password', pw);
      setPw({ currentPassword: '', newPassword: '' });
      toast.success('Password changed');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const p = form.preferences;

  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="section-title">{params.get('welcome') ? `Welcome, ${user.name.split(' ')[0]}! 🐾` : 'Profile & preferences'}</h1>
      <p className="mt-1 text-muted">
        {user.role === 'adopter'
          ? 'Tell us about your lifestyle so we can match you with animals that will be happy with you.'
          : 'This information appears on your public profile.'}
      </p>

      <form onSubmit={save} className="mt-6 space-y-6">
        <ErrorBox error={error} />

        {user.role === 'adopter' && (
          <section className="card space-y-5 p-6">
            <h2 className="text-2xl font-bold">Lifestyle & preferences</h2>
            <div>
              <span className="label">Species I'm interested in</span>
              <TagToggle options={SPECIES} value={p.species} onChange={(v) => setPref('species', v)} />
              <span className="mt-1 block text-xs text-muted">Leave empty if you're open to any.</span>
            </div>
            <div>
              <span className="label">Preferred size</span>
              <TagToggle options={SIZES} value={p.sizes} onChange={(v) => setPref('sizes', v)} />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Min age (years)">
                <input className="input" type="number" min="0" max="30" step="0.5" value={p.ageMin} onChange={(e) => setPref('ageMin', e.target.value)} />
              </Field>
              <Field label="Max age (years)">
                <input className="input" type="number" min="0" max="30" step="0.5" value={p.ageMax} onChange={(e) => setPref('ageMax', e.target.value)} />
              </Field>
              <Field label="Home type">
                <select className="input" value={p.homeType} onChange={(e) => setPref('homeType', e.target.value)}>
                  {HOME_TYPES.map((h) => (
                    <option key={h} value={h}>
                      {cap(h)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Activity level">
                <select className="input" value={p.activityLevel} onChange={(e) => setPref('activityLevel', e.target.value)}>
                  {ACTIVITY_LEVELS.map((x) => (
                    <option key={x} value={x}>
                      {x === 'low' ? 'Relaxed' : x === 'medium' ? 'Moderate' : 'Very active'}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Pet experience" className="sm:w-1/2">
              <select className="input" value={p.experience} onChange={(e) => setPref('experience', e.target.value)}>
                {EXPERIENCE_LEVELS.map((x) => (
                  <option key={x} value={x}>
                    {x === 'none' ? 'First-time owner' : cap(x)}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex flex-wrap gap-6">
              {[
                ['hasYard', 'We have a yard'],
                ['hasKids', 'Kids at home'],
                ['hasOtherPets', 'We have other pets'],
              ].map(([k, t]) => (
                <label key={k} className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" className="h-4 w-4 accent-forest" checked={p[k]} onChange={(e) => setPref(k, e.target.checked)} /> {t}
                </label>
              ))}
            </div>
            {p.hasOtherPets && (
              <div>
                <span className="label">Which pets?</span>
                <TagToggle options={PET_TYPES} value={p.otherPetTypes} onChange={(v) => setPref('otherPetTypes', v)} />
              </div>
            )}
            <Field label={`Maximum distance: ${p.maxDistanceKm} km`}>
              <input type="range" min="1" max="200" value={p.maxDistanceKm} onChange={(e) => setPref('maxDistanceKm', e.target.value)} className="w-full accent-clay" />
            </Field>
          </section>
        )}

        {user.role === 'shelter' && (
          <section className="card grid gap-4 p-6 sm:grid-cols-2">
            <h2 className="text-2xl font-bold sm:col-span-2">Shelter profile</h2>
            <Field label="Type">
              <select className="input" value={form.shelterProfile.type} onChange={setProfile('type')}>
                <option value="shelter">Shelter / rescue organisation</option>
                <option value="individual caregiver">Individual caregiver</option>
              </select>
            </Field>
            <Field label="Display name">
              <input className="input" required value={form.shelterProfile.organisationName} onChange={setProfile('organisationName')} />
            </Field>
            <Field label="Contact email">
              <input className="input" type="email" value={form.shelterProfile.contactEmail || ''} onChange={setProfile('contactEmail')} />
            </Field>
            <Field label="Contact phone">
              <input className="input" value={form.shelterProfile.contactPhone || ''} onChange={setProfile('contactPhone')} />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <input className="input" value={form.shelterProfile.address || ''} onChange={setProfile('address')} />
            </Field>
            <Field label="Website" className="sm:col-span-2">
              <input className="input" value={form.shelterProfile.website || ''} onChange={setProfile('website')} />
            </Field>
            <Field label="About" className="sm:col-span-2">
              <textarea className="input min-h-28" value={form.shelterProfile.description || ''} onChange={setProfile('description')} />
            </Field>
            <p className="text-sm sm:col-span-2">
              Verification: <span className="font-bold">{user.shelterProfile?.isVerified ? '✅ Verified' : '⏳ Waiting for an admin to verify'}</span> ·{' '}
              <Link to={`/shelters/${user._id}`} className="font-bold text-clay-dark hover:underline">
                View public profile
              </Link>
            </p>
          </section>
        )}

        <section className="card grid gap-4 p-6 sm:grid-cols-2">
          <h2 className="text-2xl font-bold sm:col-span-2">Contact & location</h2>
          <Field label="Name">
            <input className="input" required value={form.name} onChange={set('name')} />
          </Field>
          <Field label="Phone">
            <input className="input" value={form.phone} onChange={set('phone')} />
          </Field>
          <Field label="City / area">
            <input className="input" value={form.city} onChange={set('city')} />
          </Field>
          <Field label="Email">
            <input className="input bg-cream" value={user.email} disabled />
          </Field>
          <div className="sm:col-span-2">
            <span className="label">Location {user.role === 'adopter' ? '(used for distance and matching)' : '(shown on the map)'}</span>
            <LocationPicker value={form.location} onChange={(location) => setForm((f) => ({ ...f, location }))} height={220} />
          </div>
        </section>

        <div className="flex justify-end">
          <button className="btn-accent px-8 py-3" disabled={busy}>
            {busy ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>

      <form onSubmit={changePassword} className="card mt-8 grid gap-4 p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <h2 className="text-2xl font-bold sm:col-span-3">Change password</h2>
        <Field label="Current password">
          <input className="input" type="password" required value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} autoComplete="current-password" />
        </Field>
        <Field label="New password" hint={PASSWORD_HINT}>
          <input className="input" type="password" required minLength={8} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} autoComplete="new-password" />
        </Field>
        <button className="btn-primary">Update</button>
      </form>
    </div>
  );
}
