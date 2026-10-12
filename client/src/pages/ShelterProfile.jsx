import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AnimalCard from '../components/AnimalCard';
import { ChatIcon, MailIcon, MapPinIcon, PhoneIcon } from '../components/Icons';
import { ErrorBox, Spinner, Stars, VerifiedBadge } from '../components/ui';
import { TILE_ATTRIBUTION, TILE_URL, shelterIcon, verifiedShelterIcon } from '../components/mapIcons';
import { formatDate, imageUrl, timeAgo } from '../utils/format';

export default function ShelterProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null);
    setError(null);
    api.get(`/shelters/${id}`).then(setData).catch(setError);
  }, [id]);

  if (error) return <div className="container-page py-10"><ErrorBox error={error} /></div>;
  if (!data) return <Spinner />;

  const { shelter: profile, stats, adoptionHistory, animals, reviews } = data;
  const [lng, lat] = profile.location?.coordinates || [];
  const isOwn = user?._id === profile.user._id;
  const caregiver = profile.type === 'individual caregiver';

  const message = async () => {
    if (!user) return navigate('/login', { state: { from: `/shelters/${id}` } });
    try {
      const r = await api.post('/conversations', { recipientId: id });
      navigate(`/messages/${r.conversation._id}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const statCards = [
    ['Available now', stats.available, '🐾'],
    ['Successful adoptions', stats.adoptionCount, '🏡'],
    ['Currently fostered', stats.fostered, '🤝'],
    ['Rating', stats.reviewCount ? `${stats.averageRating}★` : '—', '⭐'],
  ];

  return (
    <div>
      <section className="bg-forest text-white">
        <div className="container-page flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-sun">{caregiver ? 'Individual caregiver' : 'Shelter & rescue'}</p>
            <h1 className="mt-1 flex flex-wrap items-center gap-3 font-display text-4xl font-bold text-white sm:text-5xl">
              {profile.organisationName} {profile.isVerified ? <VerifiedBadge /> : <span className="chip bg-white/15 text-white">Awaiting verification</span>}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/80">
              {stats.reviewCount > 0 && (
                <span className="flex items-center gap-1">
                  <Stars value={stats.averageRating} size={15} /> {stats.averageRating} · {stats.reviewCount} review{stats.reviewCount === 1 ? '' : 's'}
                </span>
              )}
              <span className="flex items-center gap-1">
                <MapPinIcon size={14} /> {profile.address || profile.city}
              </span>
              <span>Member since {formatDate(profile.user.createdAt)}</span>
            </div>
          </div>
          {!isOwn && (!user || user.role === 'adopter') && (
            <button onClick={message} className="btn-sun shrink-0 px-6 py-3">
              <ChatIcon size={18} /> Message {caregiver ? 'caregiver' : 'shelter'}
            </button>
          )}
        </div>
      </section>

      <div className="container-page py-10">
        {isOwn && !profile.isVerified && (
          <p className="mb-6 rounded-2xl bg-sun/20 px-5 py-4 text-sm">
            <span className="font-bold text-forest">Pending verification:</span> an admin will review your profile soon. Your listings show as “Unverified” until then.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {statCards.map(([text, value, icon]) => (
            <div key={text} className="card p-5 text-center">
              <p className="text-2xl">{icon}</p>
              <p className="mt-1 font-display text-3xl font-bold text-forest">{value}</p>
              <p className="text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <section className="card p-6">
            <h2 className="text-2xl font-bold">About</h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-ink/80">{profile.description || 'No description yet.'}</p>
            <div className="mt-4 space-y-1.5 text-sm">
              {profile.contactPhone && (
                <p className="flex items-center gap-2">
                  <PhoneIcon size={15} className="text-clay" /> {profile.contactPhone}
                </p>
              )}
              {profile.contactEmail && (
                <p className="flex items-center gap-2">
                  <MailIcon size={15} className="text-clay" /> {profile.contactEmail}
                </p>
              )}
              {profile.website && <p className="truncate">🌐 {profile.website}</p>}
            </div>
          </section>
          {lat !== undefined && (
            <div className="h-64 overflow-hidden rounded-2xl border border-black/5 lg:h-auto">
              <MapContainer center={[lat, lng]} zoom={13} style={{ height: '100%', minHeight: 240 }} scrollWheelZoom={false}>
                <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
                <Marker position={[lat, lng]} icon={profile.isVerified ? verifiedShelterIcon : shelterIcon} />
              </MapContainer>
            </div>
          )}
        </div>

        <section className="mt-10">
          <h2 className="section-title">Current animals</h2>
          {animals.length === 0 ? (
            <p className="mt-3 text-muted">No animals available right now.</p>
          ) : (
            <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {animals.map((a) => (
                <AnimalCard key={a._id} animal={a} hideShelter />
              ))}
            </div>
          )}
        </section>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <section className="card p-6">
            <h2 className="text-2xl font-bold">Adoption history</h2>
            {adoptionHistory.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No completed adoptions yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {adoptionHistory.map((h) => (
                  <li key={h._id} className="flex items-center gap-3">
                    <img src={imageUrl(h.animal?.photos?.[0])} alt="" className="h-12 w-12 rounded-xl bg-sand object-cover" />
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-bold text-forest">
                        {h.animal?.name} {h.type === 'foster' ? 'went to a foster home' : 'was adopted'}
                      </p>
                      <p className="text-xs text-muted">
                        by {h.adopterName}
                        {h.adopterCity ? ` in ${h.adopterCity}` : ''} · {formatDate(h.completedAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-6">
            <h2 className="text-2xl font-bold">Reviews</h2>
            {reviews.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No reviews yet. Adopters can leave one after a completed adoption.</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {reviews.map((r) => (
                  <li key={r._id} className="border-b border-black/5 pb-3 last:border-0">
                    <div className="flex items-center justify-between">
                      <Stars value={r.rating} size={14} />
                      <span className="text-xs text-muted">{timeAgo(r.createdAt)}</span>
                    </div>
                    {r.comment && <p className="mt-1 text-sm text-ink/80">“{r.comment}”</p>}
                    <p className="mt-0.5 text-xs font-bold text-forest">— {r.adopter?.name?.split(' ')[0] || 'Adopter'}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {isOwn && (
          <p className="mt-8 text-center text-sm text-muted">
            This is your public profile.{' '}
            <Link to="/profile" className="font-bold text-clay-dark hover:underline">
              Edit profile
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
