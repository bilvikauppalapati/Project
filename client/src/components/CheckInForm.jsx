import { useState } from 'react';
import api, { toFormData } from '../api/client';
import { ErrorBox, Field } from './ui';
import { CameraIcon } from './Icons';
import { MOOD_LABEL } from '../utils/options';

export default function CheckInForm({ url, onDone, submitLabel = 'Submit update' }) {
  const [form, setForm] = useState({ notes: '', weightKg: '', vetVisit: false, vetNotes: '', mood: 'happy', photo: null });
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const pickPhoto = (e) => {
    const file = e.target.files?.[0];
    setForm({ ...form, photo: file || null });
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api.post(url, toFormData(form));
      onDone?.(r.checkIn);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <ErrorBox error={error} />
      <div>
        <span className="label">Mood</span>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(MOOD_LABEL).map(([v, t]) => (
            <button key={v} type="button" onClick={() => setForm({ ...form, mood: v })} className={`rounded-xl border-2 py-2 text-sm font-bold ${form.mood === v ? 'border-clay bg-sun/15 text-forest' : 'border-black/10 text-muted'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>
      <Field label="Notes">
        <textarea className="input min-h-24" required value={form.notes} onChange={set('notes')} placeholder="Eating, sleeping, behaviour, favourite toys…" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Weight (kg)">
          <input className="input" type="number" min="0" step="0.1" value={form.weightKg} onChange={set('weightKg')} />
        </Field>
        <label className="mt-6 flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="h-4 w-4 accent-forest" checked={form.vetVisit} onChange={set('vetVisit')} /> Visited a vet
        </label>
      </div>
      {form.vetVisit && (
        <Field label="Vet notes">
          <input className="input" value={form.vetNotes} onChange={set('vetNotes')} placeholder="Vaccines, check-up results…" />
        </Field>
      )}
      <div>
        <span className="label">Photo</span>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-black/15 bg-white p-3 hover:border-clay">
          {preview ? <img src={preview} alt="" className="h-16 w-16 rounded-lg object-cover" /> : <CameraIcon size={28} className="text-muted" />}
          <span className="text-sm text-muted">{form.photo ? form.photo.name : 'Add a recent photo (optional)'}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pickPhoto} />
        </label>
      </div>
      <button className="btn-accent w-full py-3" disabled={busy}>
        {busy ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}
