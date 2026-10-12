import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import CheckInForm from '../components/CheckInForm';
import { ErrorBox, Spinner, StatusPill } from '../components/ui';
import { formatDate, imageUrl, shelterName } from '../utils/format';
import { MOOD_LABEL } from '../utils/options';

export default function CheckInDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [checkIn, setCheckIn] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`/checkins/${id}`).then((r) => setCheckIn(r.checkIn)).catch(setError);
  }, [id]);

  if (error) return <div className="container-page py-10"><ErrorBox error={error} /></div>;
  if (!checkIn) return <Spinner />;

  const isAdopter = user._id === checkIn.adopter._id;
  const u = checkIn.healthUpdate;

  return (
    <div className="container-page max-w-2xl py-10">
      <div className="card flex items-center gap-4 p-5">
        <img src={imageUrl(checkIn.animal.photos?.[0])} alt="" className="h-20 w-20 rounded-2xl bg-sand object-cover" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">{checkIn.label} check-in</p>
          <h1 className="text-3xl font-bold">{checkIn.animal.name}</h1>
          <p className="text-sm text-muted">
            Adopted by {checkIn.adopter.name} from {shelterName(checkIn.shelter)} · due {formatDate(checkIn.dueDate)}
          </p>
        </div>
        <StatusPill status={checkIn.status} />
      </div>

      {checkIn.status === 'completed' ? (
        <div className="card mt-6 space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">{MOOD_LABEL[u?.mood] || 'Health update'}</h2>
            <span className="text-sm text-muted">{formatDate(checkIn.completedAt)}</span>
          </div>
          {u?.photo && <img src={imageUrl(u.photo)} alt={`${checkIn.animal.name} update`} className="max-h-96 w-full rounded-2xl object-cover" />}
          <p className="whitespace-pre-line text-ink/80">{u?.notes}</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-cream px-3 py-2">
              <p className="text-[11px] font-bold uppercase text-muted">Weight</p>
              <p className="font-bold text-forest">{u?.weightKg ? `${u.weightKg} kg` : '—'}</p>
            </div>
            <div className="rounded-xl bg-cream px-3 py-2">
              <p className="text-[11px] font-bold uppercase text-muted">Vet visit</p>
              <p className="font-bold text-forest">{u?.vetVisit ? 'Yes' : 'No'}</p>
            </div>
          </div>
          {u?.vetNotes && (
            <p className="text-sm">
              <span className="font-bold text-forest">Vet notes: </span>
              {u.vetNotes}
            </p>
          )}
        </div>
      ) : isAdopter ? (
        <div className="card mt-6 p-6">
          <h2 className="mb-1 text-2xl font-bold">How is {checkIn.animal.name} doing?</h2>
          <p className="mb-5 text-sm text-muted">Your update helps the caregiver know their friend is happy and healthy.</p>
          <CheckInForm
            url={`/checkins/${id}/complete`}
            submitLabel="Complete check-in"
            onDone={(c) => {
              setCheckIn(c);
              toast.success('Check-in completed. Thank you!');
            }}
          />
        </div>
      ) : (
        <p className="card mt-6 p-6 text-center text-muted">The adopter hasn't completed this check-in yet.</p>
      )}

      <Link to={`/applications/${checkIn.application}`} className="mt-6 inline-block text-sm font-bold text-clay-dark hover:underline">
        View the full adoption record →
      </Link>
    </div>
  );
}
