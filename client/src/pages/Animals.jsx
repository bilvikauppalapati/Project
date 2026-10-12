import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import AnimalCard from '../components/AnimalCard';
import { EmptyState, ErrorBox, Pagination, Spinner, TagToggle } from '../components/ui';
import { FilterIcon, MapPinIcon, SearchIcon, XIcon } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { getBrowserLocation, label } from '../utils/format';
import { DEFAULT_LOCATION, SIZES, SPECIES, TEMPERAMENT_TAGS } from '../utils/options';

const LIST_KEYS = ['species', 'size', 'temperament'];

function readFilters(params) {
  const f = Object.fromEntries(params.entries());
  for (const k of LIST_KEYS) f[k] = f[k] ? f[k].split(',') : [];
  return f;
}

export default function Animals() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => readFilters(params), [params]);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState(filters.q || '');
  const [locating, setLocating] = useState(false);
  const [locNote, setLocNote] = useState('');

  const update = (changes, keepPage = false) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      const value = Array.isArray(v) ? v.join(',') : v;
      if (value === undefined || value === null || value === '' || value === false) next.delete(k);
      else next.set(k, value);
    }
    if (!keepPage) next.delete('page');
    setParams(next);
  };

  useEffect(() => {
    setData(null);
    setError(null);
    const query = Object.fromEntries(params.entries());
    if (!query.sort && user?.role === 'adopter') query.sort = 'match';
    api
      .get('/animals', { params: { limit: 12, ...query } })
      .then(setData)
      .catch(setError);
  }, [params, user?.role]);

  useEffect(() => {
    setSearch(filters.q || '');
  }, [filters.q]);

  const useNearMe = async () => {
    setLocating(true);
    const loc = await getBrowserLocation();
    setLocating(false);
    const point = loc || DEFAULT_LOCATION;
    setLocNote(loc ? '' : 'Location unavailable, showing distances from Hyderabad.');
    update({ lat: point.lat.toFixed(4), lng: point.lng.toFixed(4), radiusKm: filters.radiusKm || 25, sort: 'nearest' });
  };

  const clearAll = () => {
    setSearch('');
    setParams(new URLSearchParams());
  };

  const activeCount = ['species', 'size', 'temperament'].reduce((n, k) => n + filters[k].length, 0) +
    ['gender', 'listingType', 'minAge', 'maxAge', 'vaccinated', 'sterilised', 'verifiedOnly', 'lat', 'q', 'breed'].filter((k) => filters[k]).length;

  const sortOptions = [
    ...(user?.role === 'adopter' ? [['match', 'Best match']] : []),
    ['newest', 'Newest'],
    ...(filters.lat ? [['nearest', 'Nearest']] : []),
    ['youngest', 'Youngest'],
    ['eldest', 'Oldest'],
    ['name', 'Name A–Z'],
  ];
  const currentSort = filters.sort === 'distance' ? 'nearest' : filters.sort || (user?.role === 'adopter' ? 'match' : filters.lat ? 'nearest' : 'newest');

  const filterPanel = (
    <div className="space-y-6">
      <div>
        <p className="label">Distance</p>
        {filters.lat ? (
          <div className="space-y-2">
            <select className="input" value={filters.radiusKm || ''} onChange={(e) => update({ radiusKm: e.target.value })}>
              <option value="">Any distance</option>
              {[5, 10, 25, 50, 100].map((km) => (
                <option key={km} value={km}>
                  Within {km} km
                </option>
              ))}
            </select>
            <button className="text-xs font-bold text-clay-dark hover:underline" onClick={() => update({ lat: '', lng: '', radiusKm: '', sort: '' })}>
              Stop using my location
            </button>
          </div>
        ) : (
          <button className="btn-outline w-full !py-2 !text-xs" onClick={useNearMe} disabled={locating}>
            <MapPinIcon size={14} /> {locating ? 'Locating…' : 'Near me'}
          </button>
        )}
        {locNote && <p className="mt-1 text-xs text-amber-700">{locNote}</p>}
      </div>

      <div>
        <p className="label">Looking to</p>
        <div className="grid grid-cols-3 gap-1 rounded-full bg-sand p-1 text-xs font-bold">
          {[
            ['', 'Any'],
            ['adoption', 'Adopt'],
            ['foster', 'Foster'],
          ].map(([v, t]) => (
            <button key={t} onClick={() => update({ listingType: v })} className={`rounded-full py-1.5 ${(filters.listingType || '') === v ? 'bg-white text-forest shadow' : 'text-muted'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="label">Species</p>
        <TagToggle options={SPECIES} value={filters.species} onChange={(v) => update({ species: v })} />
      </div>

      <div>
        <p className="label">Size</p>
        <TagToggle options={SIZES} value={filters.size} onChange={(v) => update({ size: v })} />
      </div>

      <div>
        <p className="label">Age (years)</p>
        <div className="flex items-center gap-2">
          <input className="input" type="number" min="0" step="0.5" placeholder="Min" value={filters.minAge || ''} onChange={(e) => update({ minAge: e.target.value })} aria-label="Minimum age in years" />
          <span className="text-muted">–</span>
          <input className="input" type="number" min="0" step="0.5" placeholder="Max" value={filters.maxAge || ''} onChange={(e) => update({ maxAge: e.target.value })} aria-label="Maximum age in years" />
        </div>
      </div>

      <div>
        <p className="label">Breed</p>
        <input key={filters.breed || ''} className="input" placeholder="e.g. Indie, Labrador" defaultValue={filters.breed || ''} onBlur={(e) => update({ breed: e.target.value.trim() })} onKeyDown={(e) => e.key === 'Enter' && update({ breed: e.target.value.trim() })} />
      </div>

      <div>
        <p className="label">Gender</p>
        <select className="input" value={filters.gender || ''} onChange={(e) => update({ gender: e.target.value })}>
          <option value="">Any</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </div>

      <div>
        <p className="label">Temperament</p>
        <TagToggle options={TEMPERAMENT_TAGS} value={filters.temperament} onChange={(v) => update({ temperament: v })} />
      </div>

      <div className="space-y-2">
        <p className="label">Health & trust</p>
        {[
          ['vaccinated', 'Vaccinated'],
          ['sterilised', 'Sterilised'],
          ['verifiedOnly', 'Verified shelters only'],
        ].map(([k, t]) => (
          <label key={k} className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-forest" checked={filters[k] === 'true'} onChange={(e) => update({ [k]: e.target.checked ? 'true' : '' })} />
            {t}
          </label>
        ))}
      </div>

      {activeCount > 0 && (
        <button className="btn-ghost w-full" onClick={clearAll}>
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div className="container-page py-10">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="section-title">Find Your New Best Friend</h1>
          <p className="mt-1 text-muted">
            {user?.role === 'adopter' ? 'Sorted by how well each animal matches your lifestyle.' : 'Search animals available for adoption and fostering.'}
            {user?.role === 'adopter' && (
              <>
                {' '}
                <Link to="/profile" className="font-bold text-clay-dark hover:underline">
                  Update preferences
                </Link>
              </>
            )}
          </p>
        </div>
        <form
          className="flex w-full gap-2 md:w-96"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: search.trim() });
          }}
        >
          <div className="relative flex-1">
            <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input !pl-9" placeholder="Search by name or breed" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
          </div>
          <button className="btn-primary">Search</button>
        </form>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="hidden lg:block">
          <div className="card sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto p-5">{filterPanel}</div>
        </aside>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <button className="btn-outline !py-2 lg:hidden" onClick={() => setShowFilters(true)}>
              <FilterIcon size={16} /> Filters {activeCount > 0 && `(${activeCount})`}
            </button>
            <p className="text-sm text-muted">{data ? `${data.total} animal${data.total === 1 ? '' : 's'} found` : 'Searching…'}</p>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted">Sort</span>
              <select className="input !w-auto !py-1.5" value={currentSort} onChange={(e) => update({ sort: e.target.value })}>
                {sortOptions.map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {activeCount > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {LIST_KEYS.flatMap((k) =>
                filters[k].map((v) => (
                  <button key={k + v} onClick={() => update({ [k]: filters[k].filter((x) => x !== v) })} className="chip bg-forest/10 text-forest hover:bg-forest/20">
                    {label(v)} <XIcon size={12} />
                  </button>
                ))
              )}
              {filters.q && (
                <button onClick={() => update({ q: '' })} className="chip bg-forest/10 text-forest">
                  “{filters.q}” <XIcon size={12} />
                </button>
              )}
            </div>
          )}

          <ErrorBox error={error} />
          {!data && !error && <Spinner />}
          {data && data.animals.length === 0 && (
            <EmptyState title="No animals match these filters" action={<button className="btn-outline" onClick={clearAll}>Clear filters</button>}>
              Try widening the distance or removing a filter or two.
            </EmptyState>
          )}
          {data && data.animals.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {data.animals.map((a) => (
                <AnimalCard key={a._id} animal={a} />
              ))}
            </div>
          )}
          {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => update({ page: p }, true)} />}
        </div>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-[1500] flex justify-end bg-black/40 lg:hidden" onClick={() => setShowFilters(false)}>
          <div className="h-full w-[88%] max-w-sm overflow-y-auto bg-cream p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Filters</h2>
              <button onClick={() => setShowFilters(false)} aria-label="Close filters">
                <XIcon />
              </button>
            </div>
            {filterPanel}
            <button className="btn-primary mt-6 w-full" onClick={() => setShowFilters(false)}>
              Show {data?.total ?? ''} results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
