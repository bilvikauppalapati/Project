import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { toFormData } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LocationPicker from '../components/LocationPicker';
import { CameraIcon, PlusIcon, XIcon } from '../components/Icons';
import { ErrorBox, Field, Spinner, TagToggle } from '../components/ui';
import { cap, imageUrl, label } from '../utils/format';
import { ACTIVITY_LEVELS, ANIMAL_STATUSES, GENDERS, LISTING_TYPES, MAX_PHOTOS, SIZES, SPECIES, TEMPERAMENT_TAGS } from '../utils/options';

const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

export default function AnimalForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [removed, setRemoved] = useState([]);
  const [newPhotos, setNewPhotos] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const [lng, lat] = user.shelterProfile?.location?.coordinates || user.location?.coordinates || [];
    if (!editing) {
      setForm({
        name: '',
        species: 'dog',
        breed: '',
        ageYears: 1,
        size: 'medium',
        gender: 'male',
        color: '',
        activityLevel: 'medium',
        listingType: 'adoption',
        status: 'available',
        description: '',
        temperamentTags: [],
        vaccinated: false,
        sterilised: false,
        dewormed: false,
        vaccinations: [],
        medicalNotes: '',
        specialNeeds: '',
        city: user.shelterProfile?.city || user.city || '',
        location: lat !== undefined ? { lat, lng } : null,
      });
      return;
    }
    api
      .get(`/animals/${id}`)
      .then(({ animal: a }) => {
        const [alng, alat] = a.location.coordinates;
        const h = a.healthRecords || {};
        setExistingPhotos(a.photos || []);
        setForm({
          name: a.name,
          species: a.species,
          breed: a.breed || '',
          ageYears: +(a.ageMonths / 12).toFixed(1),
          size: a.size,
          gender: a.gender,
          color: a.color || '',
          activityLevel: a.activityLevel,
          listingType: a.listingType,
          status: a.status,
          description: a.description || '',
          temperamentTags: a.temperamentTags || [],
          vaccinated: Boolean(h.vaccinated),
          sterilised: Boolean(h.sterilised),
          dewormed: Boolean(h.dewormed),
          vaccinations: (h.vaccinations || []).map((v) => ({ name: v.name, date: toDateInput(v.date) })),
          medicalNotes: h.medicalNotes || '',
          specialNeeds: h.specialNeeds || '',
          city: a.city || '',
          location: { lat: alat, lng: alng },
        });
      })
      .catch(setError);
  }, [id, editing, user]);

  if (!form) return error ? <div className="container-page py-10"><ErrorBox error={error} /></div> : <Spinner />;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const keptPhotos = existingPhotos.filter((p) => !removed.includes(p));
  const slots = MAX_PHOTOS - keptPhotos.length - newPhotos.length;

  const addPhotos = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > slots) toast.error(`Only ${MAX_PHOTOS} photos allowed. Extra photos were skipped.`);
    setNewPhotos((list) => [...list, ...files.slice(0, Math.max(0, slots)).map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    e.target.value = '';
  };

  const setVaccination = (i, key, value) => setForm({ ...form, vaccinations: form.vaccinations.map((v, j) => (j === i ? { ...v, [key]: value } : v)) });

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.location) {
      setError('Please set the location on the map.');
      return;
    }
    setBusy(true);
    try {
      const { location, vaccinations, ...rest } = form;
      const payload = toFormData({
        ...rest,
        vaccinations: JSON.stringify(vaccinations.filter((v) => v.name.trim()).map((v) => ({ name: v.name.trim(), date: v.date || undefined }))),
        lat: location.lat,
        lng: location.lng,
        ...(newPhotos.length && { photos: newPhotos.map((p) => p.file) }),
        ...(removed.length && { removePhotos: removed }),
      });
      const r = editing ? await api.patch(`/animals/${id}`, payload) : await api.post('/animals', payload);
      toast.success(editing ? 'Listing updated' : `${r.animal.name} is now listed!`);
      navigate(`/animals/${r.animal._id}`);
    } catch (err) {
      setError(err);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  };

  const select = (key, options, fmt = cap) => (
    <select className="input" value={form[key]} onChange={set(key)}>
      {options.map((o) => (
        <option key={o} value={o}>
          {fmt(o)}
        </option>
      ))}
    </select>
  );

  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="section-title">{editing ? `Edit ${form.name || 'listing'}` : 'List an animal'}</h1>
      <p className="mt-1 text-muted">Clear photos and an honest description help animals find the right home faster.</p>

      <form onSubmit={submit} className="mt-6 space-y-6">
        <ErrorBox error={error} />

        <section className="card space-y-4 p-6">
          <h2 className="text-2xl font-bold">Photos</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {keptPhotos.map((p) => (
              <div key={p} className="relative aspect-square overflow-hidden rounded-xl bg-sand">
                <img src={imageUrl(p)} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setRemoved([...removed, p])} className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-red-600" aria-label="Remove photo">
                  <XIcon size={14} />
                </button>
              </div>
            ))}
            {newPhotos.map((p, i) => (
              <div key={p.url} className="relative aspect-square overflow-hidden rounded-xl bg-sand ring-2 ring-clay">
                <img src={p.url} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setNewPhotos(newPhotos.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-red-600" aria-label="Remove photo">
                  <XIcon size={14} />
                </button>
              </div>
            ))}
            {slots > 0 && (
              <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border-2 border-dashed border-black/15 bg-white text-muted hover:border-clay hover:text-clay">
                <span className="flex flex-col items-center gap-1 text-xs font-bold">
                  <CameraIcon size={24} /> Add
                </span>
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={addPhotos} />
              </label>
            )}
          </div>
          <p className="text-xs text-muted">Up to {MAX_PHOTOS} photos (JPG, PNG or WEBP, max 5 MB each). The first photo is the cover.</p>
        </section>

        <section className="card grid gap-4 p-6 sm:grid-cols-2">
          <h2 className="text-2xl font-bold sm:col-span-2">Basic details</h2>
          <Field label="Name">
            <input className="input" required value={form.name} onChange={set('name')} />
          </Field>
          <Field label="Species">{select('species', SPECIES)}</Field>
          <Field label="Breed">
            <input className="input" value={form.breed} onChange={set('breed')} placeholder="e.g. Indie, Persian, Mixed" />
          </Field>
          <Field label="Colour">
            <input className="input" value={form.color} onChange={set('color')} placeholder="e.g. Black and tan" />
          </Field>
          <Field label="Age (years)" hint="Use decimals for months, e.g. 0.5 = 6 months">
            <input className="input" type="number" min="0" max="30" step="0.1" required value={form.ageYears} onChange={set('ageYears')} />
          </Field>
          <Field label="Gender">{select('gender', GENDERS)}</Field>
          <Field label="Size">{select('size', SIZES)}</Field>
          <Field label="Activity level">{select('activityLevel', ACTIVITY_LEVELS)}</Field>
          <Field label="Listing type">{select('listingType', LISTING_TYPES, (t) => (t === 'both' ? 'Adoption or foster' : cap(t)))}</Field>
          {editing && <Field label="Status">{select('status', ANIMAL_STATUSES)}</Field>}
          <Field label="Description" className="sm:col-span-2">
            <textarea className="input min-h-28" value={form.description} onChange={set('description')} placeholder="Personality, history, the kind of home that would suit them…" />
          </Field>
          <div className="sm:col-span-2">
            <span className="label">Temperament tags</span>
            <TagToggle options={TEMPERAMENT_TAGS} value={form.temperamentTags} onChange={(temperamentTags) => setForm({ ...form, temperamentTags })} format={label} />
          </div>
        </section>

        <section className="card space-y-4 p-6">
          <h2 className="text-2xl font-bold">Health records</h2>
          <div className="flex flex-wrap gap-6">
            {['vaccinated', 'sterilised', 'dewormed'].map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" className="h-4 w-4 accent-forest" checked={form[k]} onChange={set(k)} /> {cap(k)}
              </label>
            ))}
          </div>
          <div>
            <span className="label">Vaccinations</span>
            <div className="space-y-2">
              {form.vaccinations.map((v, i) => (
                <div key={i} className="flex gap-2">
                  <input className="input" placeholder="Vaccine name, e.g. Rabies" value={v.name} onChange={(e) => setVaccination(i, 'name', e.target.value)} aria-label="Vaccine name" />
                  <input className="input !w-44" type="date" value={v.date} onChange={(e) => setVaccination(i, 'date', e.target.value)} aria-label="Vaccination date" />
                  <button type="button" onClick={() => setForm({ ...form, vaccinations: form.vaccinations.filter((_, j) => j !== i) })} className="rounded-full p-2 text-red-600 hover:bg-red-50" aria-label="Remove vaccination">
                    <XIcon size={16} />
                  </button>
                </div>
              ))}
              <button type="button" className="btn-outline !py-1.5 !text-xs" onClick={() => setForm({ ...form, vaccinations: [...form.vaccinations, { name: '', date: '' }] })}>
                <PlusIcon size={14} /> Add vaccination
              </button>
            </div>
          </div>
          <Field label="Medical notes">
            <textarea className="input min-h-20" value={form.medicalNotes} onChange={set('medicalNotes')} />
          </Field>
          <Field label="Special needs">
            <input className="input" value={form.specialNeeds} onChange={set('specialNeeds')} placeholder="e.g. Needs daily medication, senior care" />
          </Field>
        </section>

        <section className="card space-y-4 p-6">
          <h2 className="text-2xl font-bold">Location</h2>
          <p className="text-sm text-muted">Defaults to your shelter's location. Change it if the animal is elsewhere.</p>
          <Field label="City / area">
            <input className="input" value={form.city} onChange={set('city')} />
          </Field>
          <LocationPicker value={form.location} onChange={(location) => setForm((f) => ({ ...f, location }))} />
        </section>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>
            Cancel
          </button>
          <button className="btn-accent px-8 py-3" disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Publish listing'}
          </button>
        </div>
      </form>
    </div>
  );
}
