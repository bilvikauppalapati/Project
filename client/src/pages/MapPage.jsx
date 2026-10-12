import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import api from '../api/client';
import { TILE_ATTRIBUTION, TILE_URL, animalIcon, shelterIcon, verifiedShelterIcon, youIcon } from '../components/mapIcons';
import { MapPinIcon } from '../components/Icons';
import { ErrorBox, Stars, VerifiedBadge } from '../components/ui';
import { ageLabel, cap, getBrowserLocation, imageUrl, shelterName } from '../utils/format';
import { DEFAULT_LOCATION, SPECIES } from '../utils/options';

function FlyTo({ center, radiusKm }) {
  const map = useMap();
  useEffect(() => {
    const zoom = radiusKm <= 5 ? 13 : radiusKm <= 10 ? 12 : radiusKm <= 25 ? 11 : radiusKm <= 50 ? 10 : 9;
    map.flyTo([center.lat, center.lng], zoom, { duration: 0.8 });
  }, [center.lat, center.lng, radiusKm, map]);
  return null;
}

export default function MapPage() {
  const [center, setCenter] = useState(DEFAULT_LOCATION);
  const [locationNote, setLocationNote] = useState('Finding your location…');
  const [radiusKm, setRadiusKm] = useState(25);
  const [show, setShow] = useState({ shelters: true, animals: true });
  const [species, setSpecies] = useState('');
  const [listingType, setListingType] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [shelters, setShelters] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    getBrowserLocation().then((loc) => {
      if (loc) {
        setCenter({ ...loc, city: 'your location' });
        setLocationNote('Showing results near your current location.');
      } else {
        setLocationNote('Location unavailable, so we are showing Hyderabad. Allow location access to see what is near you.');
      }
    });
  }, []);

  useEffect(() => {
    const params = { lat: center.lat, lng: center.lng, radiusKm, species: species || undefined, listingType: listingType || undefined };
    setError(null);
    Promise.all([api.get('/shelters/nearby', { params: { ...params, verified: verifiedOnly || undefined } }), api.get('/animals/map', { params })])
      .then(([s, a]) => {
        setShelters(s.shelters);
        setAnimals(a.animals);
      })
      .catch(setError);
  }, [center.lat, center.lng, radiusKm, species, listingType, verifiedOnly]);

  const visibleAnimals = verifiedOnly ? animals.filter((a) => a.shelterProfile?.isVerified) : animals;

  const jitter = (a, i) => {
    const [lng, lat] = a.location.coordinates;
    const angle = (i * 137.5 * Math.PI) / 180;
    const r = 0.0012 * Math.sqrt((i % 12) + 1);
    return [lat + r * Math.sin(angle), lng + r * Math.cos(angle)];
  };

  return (
    <div className="container-page py-8">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="section-title">Nearby Shelters & Animals</h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted">
            <MapPinIcon size={14} /> {locationNote}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="input !w-auto !py-2" value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value))} aria-label="Search radius">
            {[5, 10, 25, 50, 100].map((km) => (
              <option key={km} value={km}>
                Within {km} km
              </option>
            ))}
          </select>
          <select className="input !w-auto !py-2" value={species} onChange={(e) => setSpecies(e.target.value)} aria-label="Species">
            <option value="">All species</option>
            {SPECIES.map((s) => (
              <option key={s} value={s}>
                {cap(s)}
              </option>
            ))}
          </select>
          <select className="input !w-auto !py-2" value={listingType} onChange={(e) => setListingType(e.target.value)} aria-label="Adopt or foster">
            <option value="">Adopt or foster</option>
            <option value="adoption">Adoption</option>
            <option value="foster">Foster</option>
          </select>
          <button onClick={() => setVerifiedOnly(!verifiedOnly)} aria-pressed={verifiedOnly} className={`rounded-full border px-3 py-2 text-xs font-bold ${verifiedOnly ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-black/10 bg-white text-muted'}`}>
            ✓ Verified
          </button>
          {[
            ['shelters', '🏠 Shelters'],
            ['animals', '🐾 Animals'],
          ].map(([k, t]) => (
            <button key={k} onClick={() => setShow({ ...show, [k]: !show[k] })} aria-pressed={show[k]} className={`rounded-full border px-3 py-2 text-xs font-bold ${show[k] ? 'border-forest bg-forest text-white' : 'border-black/10 bg-white text-muted'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <ErrorBox error={error} className="mb-4" />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="h-[65vh] min-h-[420px] overflow-hidden rounded-3xl border border-black/5 shadow-sm">
          <MapContainer center={[center.lat, center.lng]} zoom={11} style={{ height: '100%', width: '100%' }}>
            <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
            <FlyTo center={center} radiusKm={radiusKm} />
            <Circle center={[center.lat, center.lng]} radius={radiusKm * 1000} pathOptions={{ color: '#f0a04b', weight: 2, fillOpacity: 0.05 }} />
            <Marker position={[center.lat, center.lng]} icon={youIcon}>
              <Popup>You are here</Popup>
            </Marker>

            {show.shelters &&
              shelters.map((s) => (
                <Marker key={s._id} position={[s.location.coordinates[1], s.location.coordinates[0]]} icon={s.isVerified ? verifiedShelterIcon : shelterIcon}>
                  <Popup>
                    <div className="min-w-44 space-y-1">
                      <p className="font-display text-lg font-bold text-forest">{shelterName(s)}</p>
                      {s.isVerified ? <VerifiedBadge small /> : <span className="text-[11px] font-bold text-stone-500">Not yet verified</span>}
                      {s.reviewCount > 0 && (
                        <p className="flex items-center gap-1 text-xs">
                          <Stars value={s.averageRating} size={12} /> ({s.reviewCount})
                        </p>
                      )}
                      <p className="!m-0 text-xs text-muted">
                        {s.availableCount} available · {s.distanceKm} km away
                      </p>
                      <Link to={`/shelters/${s.user}`} className="mt-1 inline-block text-xs font-bold text-clay-dark">
                        View profile →
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              ))}

            {show.animals &&
              visibleAnimals.map((a, i) => (
                <Marker key={a._id} position={jitter(a, i)} icon={animalIcon(a.species)}>
                  <Popup>
                    <div className="w-44">
                      {a.photos?.[0] && <img src={imageUrl(a.photos[0])} alt={a.name} className="mb-2 h-24 w-full rounded-lg object-cover" />}
                      <p className="font-display text-lg font-bold text-forest">{a.name}</p>
                      <p className="!m-0 text-xs text-muted">
                        {cap(a.breed)} · {ageLabel(a.ageMonths)}
                      </p>
                      <p className="!m-0 text-xs text-muted">{shelterName(a)}</p>
                      <Link to={`/animals/${a._id}`} className="mt-1 inline-block text-xs font-bold text-clay-dark">
                        Meet {a.name} →
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
        </div>

        <aside className="card max-h-[65vh] overflow-y-auto p-4">
          <h2 className="text-xl font-bold">
            {shelters.length} shelter{shelters.length === 1 ? '' : 's'} · {visibleAnimals.length} animal{visibleAnimals.length === 1 ? '' : 's'}
          </h2>
          <ul className="mt-3 space-y-2">
            {shelters.map((s) => (
              <li key={s._id}>
                <Link to={`/shelters/${s.user}`} className="block rounded-xl bg-cream px-3 py-2 hover:bg-sand">
                  <p className="flex items-center gap-1.5 font-bold text-forest">
                    {shelterName(s)} {s.isVerified && <VerifiedBadge small />}
                  </p>
                  <p className="text-xs text-muted">
                    {s.distanceKm} km · {s.availableCount} available{s.type === 'individual caregiver' ? ' · Caregiver' : ''}{s.isVerified ? '' : ' · Unverified'}
                  </p>
                </Link>
              </li>
            ))}
            {shelters.length === 0 && <li className="text-sm text-muted">No shelters in this radius. Try a larger distance.</li>}
          </ul>
        </aside>
      </div>
    </div>
  );
}
