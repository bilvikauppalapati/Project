import { Link } from 'react-router-dom';
import { ageLabel, cap, imageUrl, label, profileOf, shelterName } from '../utils/format';
import { SPECIES_EMOJI } from '../utils/options';
import { ArrowRightIcon, CheckIcon, MapPinIcon, PawIcon } from './Icons';
import { MatchBadge, StatusPill, VerifiedBadge } from './ui';

export default function AnimalCard({ animal, hideShelter }) {
  const photo = imageUrl(animal.photos?.[0]);
  const profile = profileOf(animal);
  const tags = animal.temperamentTags || [];
  const blurb = animal.description || (tags.length ? tags.map(label).join(', ') : '');

  return (
    <article className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
      <Link to={`/animals/${animal._id}`} className="relative block aspect-[4/3] overflow-hidden bg-sand">
        {photo ? (
          <img src={photo} alt={animal.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid h-full place-items-center text-6xl">{SPECIES_EMOJI[animal.species]}</div>
        )}
        <StatusPill status={animal.status} className="absolute right-3 top-3 shadow" />
        {animal.matchScore !== undefined && <MatchBadge score={animal.matchScore} className="absolute left-3 top-3" />}
        {animal.listingType !== 'adoption' && (
          <span className="chip absolute bottom-3 left-3 bg-white/90 text-forest shadow">{animal.listingType === 'foster' ? 'Foster' : 'Adopt or foster'}</span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate text-xl font-bold">{animal.name}</h3>
          {animal.distanceKm !== undefined && animal.distanceKm !== null && (
            <span className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-muted">
              <MapPinIcon size={12} /> {animal.distanceKm} km
            </span>
          )}
        </div>

        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
          <PawIcon size={12} className="text-clay" />
          <span>{cap(animal.gender)}</span>
          <span aria-hidden>•</span>
          <span>{ageLabel(animal.ageMonths)}</span>
          <span aria-hidden>•</span>
          <span>{cap(animal.size)} size</span>
        </p>

        {animal.matchReasons?.length > 0 ? (
          <ul className="mt-2 space-y-0.5">
            {animal.matchReasons.slice(0, 2).map((r) => (
              <li key={r} className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                <CheckIcon size={12} strokeWidth={3} /> {r}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 line-clamp-2 text-sm text-ink/80">{blurb || `${cap(animal.breed || animal.species)} looking for a loving home.`}</p>
        )}

        {!hideShelter && profile && (
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <span className="truncate">{shelterName(animal)}</span>
            {profile.isVerified ? <VerifiedBadge small /> : <span className="chip !px-1.5 !text-[10px] bg-stone-100 text-stone-500">Unverified</span>}
          </p>
        )}

        <div className="mt-auto pt-4">
          <Link to={`/animals/${animal._id}`} className="btn-primary !px-4 !py-2 !text-xs">
            Learn More <ArrowRightIcon size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}
