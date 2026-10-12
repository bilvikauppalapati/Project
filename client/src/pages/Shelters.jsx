import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { EmptyState, ErrorBox, Pagination, Spinner, Stars, VerifiedBadge } from '../components/ui';
import { MapPinIcon, SearchIcon } from '../components/Icons';

export default function Shelters() {
  const [filters, setFilters] = useState({ q: '', verified: false, type: '', page: 1 });
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null);
    api
      .get('/shelters', { params: { q: filters.q || undefined, verified: filters.verified || undefined, type: filters.type || undefined, page: filters.page } })
      .then(setData)
      .catch(setError);
  }, [filters]);

  return (
    <div className="container-page py-10">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="section-title">Shelters & Caregivers</h1>
          <p className="mt-1 text-muted">Verified organisations and individual foster caregivers caring for animals near you.</p>
        </div>
        <form
          className="flex w-full gap-2 md:w-96"
          onSubmit={(e) => {
            e.preventDefault();
            setFilters({ ...filters, q: search.trim(), page: 1 });
          }}
        >
          <div className="relative flex-1">
            <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input !pl-9" placeholder="Name or area" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search shelters" />
          </div>
          <button className="btn-primary">Search</button>
        </form>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setFilters({ ...filters, verified: !filters.verified, page: 1 })}
          aria-pressed={filters.verified}
          className={`rounded-full border px-3 py-1.5 text-xs font-bold ${filters.verified ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-black/10 bg-white text-forest'}`}
        >
          ✓ Verified only
        </button>
        {[
          ['', 'All'],
          ['shelter', 'Shelters'],
          ['individual caregiver', 'Individual caregivers'],
        ].map(([v, t]) => (
          <button
            key={t}
            onClick={() => setFilters({ ...filters, type: v, page: 1 })}
            aria-pressed={filters.type === v}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${filters.type === v ? 'border-forest bg-forest text-white' : 'border-black/10 bg-white text-forest'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <ErrorBox error={error} />
      {!data && !error && <Spinner />}
      {data?.shelters.length === 0 && <EmptyState title="No shelters found">Try a different search.</EmptyState>}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data?.shelters.map((s) => (
          <Link key={s._id} to={`/shelters/${s.user}`} className="card flex flex-col p-5 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-sand text-2xl">{s.type === 'individual caregiver' ? '🤲' : '🏠'}</span>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold">{s.organisationName}</h2>
                <p className="flex items-center gap-1 text-xs text-muted">
                  <MapPinIcon size={12} /> {s.city || '—'} · {s.type === 'individual caregiver' ? 'Individual caregiver' : 'Shelter'}
                </p>
              </div>
            </div>
            <p className="mt-3 line-clamp-2 text-sm text-ink/80">{s.description || 'Caring for animals in need.'}</p>
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
              {s.isVerified ? <VerifiedBadge /> : <span className="chip bg-stone-100 text-stone-500">Awaiting verification</span>}
              {s.reviewCount > 0 ? (
                <span className="flex items-center gap-1 text-xs text-muted">
                  <Stars value={s.averageRating} size={13} /> {s.averageRating}
                </span>
              ) : (
                <span className="text-xs text-muted">No reviews yet</span>
              )}
              <span className="chip ml-auto bg-sun/25 text-forest">{s.availableCount} available</span>
            </div>
          </Link>
        ))}
      </div>
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={(page) => setFilters({ ...filters, page })} />}
    </div>
  );
}
