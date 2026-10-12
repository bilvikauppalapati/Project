import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ArrowLeftIcon, ChatIcon, CheckIcon, HeartIcon, MapPinIcon, XIcon } from '../components/Icons';
import { ErrorBox, MatchBadge, Modal, Spinner, Stars, StatusPill, VerifiedBadge } from '../components/ui';
import { TILE_ATTRIBUTION, TILE_URL, animalIcon } from '../components/mapIcons';
import { ageLabel, cap, formatDate, imageUrl, isCaregiver, label, profileOf, shelterName } from '../utils/format';
import { SPECIES_EMOJI } from '../utils/options';

const FACTOR_LABELS = {
  species: 'Species',
  size: 'Size',
  age: 'Age',
  kids: 'Kids at home',
  otherPets: 'Other pets',
  activity: 'Activity level',
  home: 'Home & yard',
  distance: 'Distance',
  experience: 'Experience',
};

function MatchBreakdown({ match }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Your match</h2>
        <MatchBadge score={match.score} className="!text-sm" />
      </div>
      {match.reasons?.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {match.reasons.map((r) => (
            <li key={r} className="chip bg-emerald-50 text-emerald-700">
              <CheckIcon size={12} strokeWidth={3} /> {r}
            </li>
          ))}
        </ul>
      )}
      <ul className="mt-4 space-y-3">
        {match.breakdown.map((f) => (
          <li key={f.factor}>
            <div className="flex justify-between text-sm">
              <span className="font-bold text-forest">{FACTOR_LABELS[f.factor] || label(f.factor)}</span>
              <span className="text-muted">
                {f.points}/{f.max}
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-sand">
              <div className="h-full rounded-full bg-clay" style={{ width: `${(f.points / f.max) * 100}%` }} />
            </div>
            <p className="mt-0.5 text-xs text-muted">{f.reason}</p>
          </li>
        ))}
      </ul>
      <Link to="/profile" className="mt-4 inline-block text-xs font-bold text-clay-dark hover:underline">
        Edit my lifestyle preferences
      </Link>
    </div>
  );
}

export default function AnimalDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [animal, setAnimal] = useState(null);
  const [error, setError] = useState(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setAnimal(null);
    setError(null);
    setPhotoIndex(0);
    api
      .get(`/animals/${id}`)
      .then((r) => setAnimal(r.animal))
      .catch(setError);
  }, [id]);

  if (error) return <div className="container-page py-10"><ErrorBox error={error} /></div>;
  if (!animal) return <Spinner />;

  const profile = profileOf(animal);
  const health = animal.healthRecords || {};
  const isOwner = user && (user._id === animal.shelter?._id || user.role === 'admin');
  const activeApp = animal.myApplication && ['submitted', 'under_review', 'approved', 'completed'].includes(animal.myApplication.status) ? animal.myApplication : null;
  const photos = animal.photos || [];
  const [lng, lat] = animal.location?.coordinates || [];
  const canAdopt = ['adoption', 'both'].includes(animal.listingType);
  const canFoster = ['foster', 'both'].includes(animal.listingType);
  const applyLink = (type) => (user ? `/animals/${id}/apply?type=${type}` : '/login');

  const toggleFavourite = async () => {
    if (!user) return navigate('/login', { state: { from: `/animals/${id}` } });
    try {
      const r = await api.post(`/animals/${id}/favourite`);
      setAnimal((a) => ({ ...a, isFavourite: r.favourited }));
      toast.success(r.favourited ? `${animal.name} added to favourites` : 'Removed from favourites');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const messageShelter = async () => {
    if (!user) return navigate('/login', { state: { from: `/animals/${id}` } });
    setBusy(true);
    try {
      const r = await api.post('/conversations', { animalId: id });
      navigate(`/messages/${r.conversation._id}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeListing = async () => {
    try {
      await api.delete(`/animals/${id}`);
      toast.success(`${animal.name} was removed from listings`);
      navigate('/dashboard?tab=listings');
    } catch (err) {
      toast.error(err.message);
      setConfirmDelete(false);
    }
  };

  const facts = [
    ['Species', `${SPECIES_EMOJI[animal.species]} ${cap(animal.species)}`],
    ['Breed', animal.breed],
    ['Age', ageLabel(animal.ageMonths)],
    ['Gender', cap(animal.gender)],
    ['Size', cap(animal.size)],
    ['Activity', cap(animal.activityLevel)],
    ...(animal.color ? [['Colour', animal.color]] : []),
  ];

  const checks = [
    ['Vaccinated', health.vaccinated],
    ['Sterilised', health.sterilised],
    ['Dewormed', health.dewormed],
  ];

  return (
    <div className="container-page py-8">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm font-bold text-forest hover:text-clay">
        <ArrowLeftIcon size={16} /> Back
      </button>

      {!animal.isActive && <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">This listing has been removed and is hidden from adopters.</p>}

      <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-sand">
            {photos.length ? (
              <img src={imageUrl(photos[photoIndex])} alt={`${animal.name}, photo ${photoIndex + 1}`} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-8xl">{SPECIES_EMOJI[animal.species]}</div>
            )}
            <StatusPill status={animal.status} className="absolute right-4 top-4 !text-sm shadow" />
          </div>
          {photos.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {photos.map((p, i) => (
                <button key={p} onClick={() => setPhotoIndex(i)} className={`h-20 w-24 shrink-0 overflow-hidden rounded-xl border-2 ${i === photoIndex ? 'border-clay' : 'border-transparent opacity-70'}`} aria-label={`Show photo ${i + 1}`}>
                  <img src={imageUrl(p)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="card mt-6 p-6">
            <h2 className="text-2xl font-bold">About {animal.name}</h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-ink/80">{animal.description || 'No description yet.'}</p>
            {animal.temperamentTags?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {animal.temperamentTags.map((t) => (
                  <span key={t} className="chip bg-sun/25 text-forest">
                    {label(t)}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="card mt-6 p-6">
            <h2 className="text-2xl font-bold">Health records</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {checks.map(([name, ok]) => (
                <div key={name} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${ok ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-500'}`}>
                  {ok ? <CheckIcon size={16} /> : <XIcon size={16} />} {name}
                </div>
              ))}
            </div>
            {health.vaccinations?.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-bold text-forest">Vaccinations</p>
                <ul className="mt-1 divide-y divide-black/5 rounded-xl bg-cream text-sm">
                  {health.vaccinations.map((v) => (
                    <li key={v.name + v.date} className="flex justify-between px-3 py-2">
                      <span>{v.name}</span>
                      <span className="text-muted">{v.date ? formatDate(v.date) : '—'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {health.medicalNotes && (
              <p className="mt-3 text-sm">
                <span className="font-bold text-forest">Medical notes: </span>
                {health.medicalNotes}
              </p>
            )}
            {health.specialNeeds && (
              <p className="mt-2 text-sm">
                <span className="font-bold text-forest">Special needs: </span>
                {health.specialNeeds}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-4xl font-bold">{animal.name}</h1>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                  <MapPinIcon size={14} /> {animal.city || 'Location on map'}
                  {animal.distanceKm !== undefined && ` · ${animal.distanceKm} km away`}
                </p>
              </div>
              {!isOwner && (!user || user.role === 'adopter') && (
                <button
                  onClick={toggleFavourite}
                  className={`rounded-full border-2 p-2.5 transition ${animal.isFavourite ? 'border-clay bg-clay text-white' : 'border-black/10 text-clay hover:border-clay'}`}
                  aria-label={animal.isFavourite ? 'Remove from favourites' : 'Add to favourites'}
                  title={animal.isFavourite ? 'Remove from favourites' : 'Add to favourites'}
                >
                  <HeartIcon size={20} filled={animal.isFavourite} />
                </button>
              )}
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {facts.map(([k, v]) => (
                <div key={k} className="rounded-xl bg-cream px-3 py-2">
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">{k}</dt>
                  <dd className="truncate font-bold text-forest">{v}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-4 text-sm text-muted">
              Listed for <span className="font-bold text-forest">{animal.listingType === 'both' ? 'adoption or foster' : animal.listingType}</span> · since {formatDate(animal.createdAt)}
            </p>

            <div className="mt-5 flex flex-col gap-2">
              {isOwner ? (
                <>
                  <Link to={`/animals/${id}/edit`} className="btn-primary py-3">
                    Edit listing
                  </Link>
                  <Link to={`/dashboard?tab=applications&animal=${id}`} className="btn-outline py-3">
                    View applications
                  </Link>
                  {animal.isActive && (
                    <button onClick={() => setConfirmDelete(true)} className="btn-ghost text-red-600">
                      Remove listing
                    </button>
                  )}
                </>
              ) : (
                <>
                  {activeApp ? (
                    <Link to="/dashboard?tab=applications" className="btn-outline py-3">
                      Your application: <StatusPill status={activeApp.status} />
                    </Link>
                  ) : animal.status === 'available' && (!user || user.role === 'adopter') ? (
                    <div className={`grid gap-2 ${canAdopt && canFoster ? 'sm:grid-cols-2' : ''}`}>
                      {canAdopt && (
                        <Link to={applyLink('adoption')} state={{ from: `/animals/${id}/apply?type=adoption` }} className="btn-accent py-3">
                          <HeartIcon size={18} filled /> Apply to adopt
                        </Link>
                      )}
                      {canFoster && (
                        <Link to={applyLink('foster')} state={{ from: `/animals/${id}/apply?type=foster` }} className={canAdopt ? 'btn-outline py-3' : 'btn-accent py-3'}>
                          🤝 Apply to foster
                        </Link>
                      )}
                    </div>
                  ) : (
                    animal.status !== 'available' && (
                      <p className="rounded-xl bg-sand px-4 py-3 text-center text-sm font-bold text-forest">
                        {animal.name} is {label(animal.status).toLowerCase()} and not taking new applications.
                      </p>
                    )
                  )}
                  {(!user || user.role === 'adopter') && (
                    <button onClick={messageShelter} disabled={busy} className="btn-outline py-3">
                      <ChatIcon size={18} /> Message {isCaregiver(animal) ? 'caregiver' : 'shelter'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {animal.match && <MatchBreakdown match={animal.match} />}

          {animal.shelter && (
            <Link to={`/shelters/${animal.shelter._id}`} className="card block p-5 transition hover:shadow-md">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">{isCaregiver(animal) ? 'Cared for by' : 'Listed by'}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="font-display text-xl font-bold text-forest">{shelterName(animal)}</p>
                {profile?.isVerified ? <VerifiedBadge /> : <span className="chip bg-stone-100 text-stone-500">Not yet verified</span>}
              </div>
              {profile?.reviewCount > 0 && (
                <p className="mt-1 flex items-center gap-1 text-sm text-muted">
                  <Stars value={profile.averageRating} size={14} /> {profile.averageRating} ({profile.reviewCount} review{profile.reviewCount === 1 ? '' : 's'})
                </p>
              )}
              <p className="mt-1 text-sm text-muted">
                {cap(profile?.type || 'shelter')} · {profile?.city || animal.shelter.city}
              </p>
            </Link>
          )}

          {lat !== undefined && (
            <div className="h-56 overflow-hidden rounded-2xl border border-black/5">
              <MapContainer center={[lat, lng]} zoom={13} style={{ height: '100%' }} scrollWheelZoom={false}>
                <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
                <Marker position={[lat, lng]} icon={animalIcon(animal.species)} />
              </MapContainer>
            </div>
          )}
        </div>
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title={`Remove ${animal.name}?`}>
        <p className="text-sm text-muted">The listing is hidden from adopters (soft delete). Adoption history and check-ins are kept.</p>
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setConfirmDelete(false)}>
            Cancel
          </button>
          <button className="btn-danger" onClick={removeListing}>
            Remove
          </button>
        </div>
      </Modal>
    </div>
  );
}
