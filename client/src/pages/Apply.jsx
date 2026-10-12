import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ErrorBox, Field, MatchBadge, Spinner } from '../components/ui';
import { ageLabel, cap, imageUrl } from '../utils/format';
import { EXPERIENCE_LEVELS, HOME_TYPES } from '../utils/options';

export default function Apply() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [animal, setAnimal] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const prefs = user?.preferences || {};
  const [form, setForm] = useState({
    type: params.get('type') === 'foster' ? 'foster' : 'adoption',
    fosterDuration: '',
    homeType: prefs.homeType || 'apartment',
    hasYard: Boolean(prefs.hasYard),
    hasKids: Boolean(prefs.hasKids),
    otherPets: prefs.hasOtherPets && prefs.otherPetTypes?.length ? prefs.otherPetTypes.map((t) => t + '(s)').join(', ') : 'None',
    experience: prefs.experience || 'some',
    workHoursPerDay: 8,
    reason: '',
  });

  useEffect(() => {
    api
      .get(`/animals/${id}`)
      .then((r) => {
        setAnimal(r.animal);
        if (r.animal.listingType !== 'both') setForm((f) => ({ ...f, type: r.animal.listingType }));
      })
      .catch(setError);
  }, [id]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { type, fosterDuration, ...questionnaire } = form;
      const r = await api.post('/applications', { animalId: id, type, fosterDuration: type === 'foster' ? fosterDuration : undefined, questionnaire });
      toast.success(`Application sent! ${animal.name}'s caregiver will review it soon.`);
      navigate(`/applications/${r.application._id}`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  if (!animal) return error ? <div className="container-page py-10"><ErrorBox error={error} /></div> : <Spinner />;

  const types = animal.listingType === 'both' ? ['adoption', 'foster'] : [animal.listingType];

  return (
    <div className="container-page max-w-3xl py-10">
      <div className="card mb-6 flex items-center gap-4 p-4">
        <img src={imageUrl(animal.photos?.[0])} alt="" className="h-20 w-20 rounded-2xl bg-sand object-cover" />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold">Apply for {animal.name}</h1>
          <p className="text-sm text-muted">
            {cap(animal.breed)} · {ageLabel(animal.ageMonths)} · {cap(animal.size)}
          </p>
        </div>
        {animal.match && <MatchBadge score={animal.match.score} />}
      </div>

      <form onSubmit={submit} className="card space-y-6 p-6">
        <ErrorBox error={error} />
        {types.length > 1 && (
          <div>
            <span className="label">I would like to</span>
            <div className="grid grid-cols-2 gap-2">
              {types.map((t) => (
                <button key={t} type="button" onClick={() => setForm({ ...form, type: t })} className={`rounded-2xl border-2 p-3 font-bold ${form.type === t ? 'border-clay bg-sun/15 text-forest' : 'border-black/10 text-muted'}`}>
                  {t === 'adoption' ? '🏡 Adopt permanently' : '🤝 Foster temporarily'}
                </button>
              ))}
            </div>
          </div>
        )}

        {form.type === 'foster' && (
          <Field label="How long can you foster?" hint="e.g. 6 weeks, 2 months, until adopted">
            <input className="input" required value={form.fosterDuration} onChange={set('fosterDuration')} />
          </Field>
        )}

        <h2 className="text-2xl font-bold">Your home & lifestyle</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Home type">
            <select className="input" value={form.homeType} onChange={set('homeType')}>
              {HOME_TYPES.map((h) => (
                <option key={h} value={h}>
                  {cap(h)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Pet experience">
            <select className="input" value={form.experience} onChange={set('experience')}>
              {EXPERIENCE_LEVELS.map((x) => (
                <option key={x} value={x}>
                  {x === 'none' ? 'First-time owner' : x === 'some' ? 'Some experience' : 'Very experienced'}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Hours away from home per day">
            <input className="input" type="number" min="0" max="24" required value={form.workHoursPerDay} onChange={set('workHoursPerDay')} />
          </Field>
          <Field label="Other pets at home">
            <input className="input" value={form.otherPets} onChange={set('otherPets')} placeholder="e.g. 1 cat, 5 years old" />
          </Field>
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" className="h-4 w-4 accent-forest" checked={form.hasYard} onChange={set('hasYard')} /> We have a yard or garden
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" className="h-4 w-4 accent-forest" checked={form.hasKids} onChange={set('hasKids')} /> There are kids at home
          </label>
        </div>
        <Field label={`Why would you like to ${form.type === 'foster' ? 'foster' : 'adopt'} ${animal.name}?`}>
          <textarea className="input min-h-28" value={form.reason} onChange={set('reason')} placeholder="Tell the shelter a little about yourself and your plans." />
        </Field>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link to={`/animals/${id}`} className="btn-ghost">
            Cancel
          </Link>
          <button className="btn-accent px-8 py-3" disabled={busy}>
            {busy ? 'Sending…' : 'Submit application'}
          </button>
        </div>
      </form>
    </div>
  );
}
