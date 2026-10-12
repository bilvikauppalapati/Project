import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import DashboardShell, { useTab } from '../../components/DashboardShell';
import { CalendarIcon, ClipboardIcon, HomeIcon, PawIcon, PlusIcon, StarIcon, ShieldCheckIcon } from '../../components/Icons';
import { EmptyState, Pagination, Spinner, StatCard, Stars, StatusPill } from '../../components/ui';
import { ageLabel, cap, formatDate, imageUrl, isCaregiver, label, shelterName, timeAgo } from '../../utils/format';
import { ANIMAL_STATUSES, APPLICATION_STEPS } from '../../utils/options';

function Overview({ stats, setTab }) {
  if (!stats) return <Spinner />;
  const a = stats.animals;
  const openApps = (stats.applications.submitted || 0) + (stats.applications.under_review || 0);
  return (
    <div className="space-y-8">
      {!stats.isVerified && (
        <div className="card flex items-start gap-3 border-sun bg-sun/15 p-5">
          <ShieldCheckIcon className="mt-0.5 shrink-0 text-clay-dark" />
          <p className="text-sm">
            <span className="font-bold text-forest">Verification pending.</span> A PawShare admin will review your profile. Verified shelters get a badge that builds trust with adopters.
          </p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Available animals" value={a.available || 0} icon={<PawIcon />} />
        <StatCard label="Applications to review" value={openApps} icon={<ClipboardIcon />} tone="bg-sun/30 text-clay-dark" />
        <StatCard label="Successful adoptions" value={stats.adoptionCount} icon={<HomeIcon />} tone="bg-emerald-50 text-emerald-700" />
        <StatCard label={`Rating (${stats.rating.count} reviews)`} value={stats.rating.count ? stats.rating.average : '—'} icon={<StarIcon />} tone="bg-amber-50 text-amber-500" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-2xl font-bold">New applications</h2>
            <button onClick={() => setTab('applications')} className="text-sm font-bold text-clay-dark hover:underline">
              View all
            </button>
          </div>
          {stats.recentApplications.length === 0 ? (
            <p className="text-sm text-muted">No applications waiting. 🎉</p>
          ) : (
            <ul className="divide-y divide-black/5">
              {stats.recentApplications.map((app) => (
                <li key={app._id}>
                  <Link to={`/applications/${app._id}`} className="flex items-center gap-3 py-3 hover:opacity-80">
                    <img src={imageUrl(app.animal?.photos?.[0])} alt="" className="h-11 w-11 rounded-xl bg-sand object-cover" />
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="truncate font-bold text-forest">
                        {app.adopter?.name} → {app.animal?.name}
                      </p>
                      <p className="text-xs text-muted">
                        {cap(app.type)} · {timeAgo(app.createdAt)}
                        {app.matchScore !== undefined && ` · ${app.matchScore}% match`}
                      </p>
                    </div>
                    <StatusPill status={app.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Upcoming check-ins</h2>
            <button onClick={() => setTab('checkins')} className="text-sm font-bold text-clay-dark hover:underline">
              View all
            </button>
          </div>
          {stats.upcomingCheckIns.length === 0 ? (
            <p className="text-sm text-muted">Nothing due in the next two weeks.</p>
          ) : (
            <ul className="divide-y divide-black/5">
              {stats.upcomingCheckIns.map((c) => (
                <li key={c._id}>
                  <Link to={`/checkins/${c._id}`} className="flex items-center gap-3 py-3 hover:opacity-80">
                    <img src={imageUrl(c.animal?.photos?.[0])} alt="" className="h-11 w-11 rounded-xl bg-sand object-cover" />
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-bold text-forest">
                        {c.animal?.name} · {c.label}
                      </p>
                      <p className="text-xs text-muted">
                        {c.adopter?.name} · due {formatDate(c.dueDate)}
                      </p>
                    </div>
                    <StatusPill status={c.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {stats.recentReviews.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-3 text-2xl font-bold">Latest reviews</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {stats.recentReviews.map((r) => (
              <div key={r._id} className="rounded-xl bg-cream p-4">
                <Stars value={r.rating} size={14} />
                {r.comment && <p className="mt-1 text-sm">“{r.comment}”</p>}
                <p className="mt-1 text-xs font-bold text-forest">— {r.adopter?.name}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Listings() {
  const [counts, setCounts] = useState({});
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    api.get('/animals/mine', { params: { status: status || undefined, page } }).then((r) => {
      setData(r);
      setCounts(r.statusCounts || {});
    });
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (animal, next) => {
    try {
      await api.patch(`/animals/${animal._id}`, { status: next });
      toast.success(`${animal.name} is now ${label(next).toLowerCase()}`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {['', ...ANIMAL_STATUSES].map((s) => (
          <button key={s || 'all'} onClick={() => { setStatus(s); setPage(1); }} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${status === s ? 'border-forest bg-forest text-white' : 'border-black/10 bg-white text-forest'}`}>
            {s ? label(s) : 'All'} {s ? `(${counts[s] || 0})` : `(${Object.values(counts).reduce((a, b) => a + b, 0)})`}
          </button>
        ))}
      </div>
      {!data ? (
        <Spinner />
      ) : data.animals.length === 0 ? (
        <EmptyState title="No listings here" action={<Link to="/animals/new" className="btn-accent"><PlusIcon size={16} /> List an animal</Link>} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-black/5 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Animal</th>
                <th className="px-4 py-3">Listed for</th>
                <th className="px-4 py-3">Open applications</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {data.animals.map((a) => (
                <tr key={a._id}>
                  <td className="px-4 py-3">
                    <Link to={`/animals/${a._id}`} className="flex items-center gap-3">
                      <img src={imageUrl(a.photos?.[0])} alt="" className="h-12 w-12 rounded-xl bg-sand object-cover" />
                      <span>
                        <span className="block font-bold text-forest">{a.name}</span>
                        <span className="text-xs text-muted">
                          {cap(a.species)} · {ageLabel(a.ageMonths)}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">{a.listingType === 'both' ? 'Adopt / foster' : cap(a.listingType)}</td>
                  <td className="px-4 py-3">
                    {a.activeApplications > 0 ? (
                      <Link to={`/dashboard?tab=applications&animal=${a._id}`} className="chip bg-sun/30 text-forest">
                        {a.activeApplications} open
                      </Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select className="input !w-auto !py-1.5 !text-xs" value={a.status} onChange={(e) => changeStatus(a, e.target.value)} aria-label={`Status of ${a.name}`}>
                      {ANIMAL_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {label(s)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/animals/${a._id}/edit`} className="font-bold text-clay-dark hover:underline">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
    </div>
  );
}

function Applications({ animalFilter }) {
  const { socket } = useSocket();
  const [status, setStatus] = useState(animalFilter ? '' : 'submitted,under_review');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    api.get('/applications/incoming', { params: { status: status || undefined, animal: animalFilter || undefined, page } }).then(setData);
  }, [status, page, animalFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!socket) return;
    const onNote = (n) => n.type === 'application' && load();
    socket.on('notification:new', onNote);
    return () => socket.off('notification:new', onNote);
  }, [socket, load]);

  const filters = [
    ['submitted,under_review', 'To review'],
    ['approved', 'Approved'],
    ['completed', 'Completed'],
    ['rejected,withdrawn', 'Closed'],
    ['', 'All'],
  ];

  return (
    <div>
      {animalFilter && (
        <p className="mb-3 text-sm text-muted">
          Showing applications for one animal ·{' '}
          <Link to="/dashboard?tab=applications" className="font-bold text-clay-dark hover:underline">
            show all
          </Link>
        </p>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map(([v, t]) => (
          <button key={t} onClick={() => { setStatus(v); setPage(1); }} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${status === v ? 'border-forest bg-forest text-white' : 'border-black/10 bg-white text-forest'}`}>
            {t}
          </button>
        ))}
      </div>
      {!data ? (
        <Spinner />
      ) : data.applications.length === 0 ? (
        <EmptyState title="No applications here" icon="📋" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.applications.map((app) => {
            const step = APPLICATION_STEPS.indexOf(app.status);
            return (
              <Link key={app._id} to={`/applications/${app._id}`} className="card flex gap-4 p-4 transition hover:shadow-md">
                <img src={imageUrl(app.animal?.photos?.[0])} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-sand object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-bold text-forest">
                      {app.adopter?.name} <span className="font-normal text-muted">for</span> {app.animal?.name}
                    </p>
                    <StatusPill status={app.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {cap(app.type)} · {cap(app.questionnaire?.homeType)} · {app.questionnaire?.hasKids ? 'kids' : 'no kids'} · {timeAgo(app.createdAt)}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    {app.matchScore !== undefined && <span className="chip bg-emerald-50 text-emerald-700">{app.matchScore}% match</span>}
                    {step >= 0 && (
                      <span className="flex flex-1 gap-1">
                        {APPLICATION_STEPS.map((s, i) => (
                          <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-clay' : 'bg-sand'}`} />
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
    </div>
  );
}

function CheckIns() {
  const [status, setStatus] = useState('');
  const [list, setList] = useState(null);

  useEffect(() => {
    setList(null);
    api.get('/checkins/shelter', { params: { status: status || undefined } }).then((r) => setList(r.checkIns));
  }, [status]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {['', 'upcoming', 'due', 'completed', 'missed'].map((s) => (
          <button key={s || 'all'} onClick={() => setStatus(s)} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${status === s ? 'border-forest bg-forest text-white' : 'border-black/10 bg-white text-forest'}`}>
            {s ? label(s) : 'All'}
          </button>
        ))}
      </div>
      {!list ? (
        <Spinner />
      ) : list.length === 0 ? (
        <EmptyState title="No check-ins" icon="🩺">Check-ins are created automatically when you mark an adoption as completed.</EmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((c) => (
            <Link key={c._id} to={`/checkins/${c._id}`} className="card flex items-center gap-4 p-4 transition hover:shadow-md">
              <img src={imageUrl(c.healthUpdate?.photo || c.animal?.photos?.[0])} alt="" className="h-14 w-14 rounded-xl bg-sand object-cover" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-forest">
                  {c.animal?.name} · {c.label}
                </p>
                <p className="truncate text-xs text-muted">
                  {c.adopter?.name} · {c.status === 'completed' ? `"${c.healthUpdate?.notes}"` : `due ${formatDate(c.dueDate)}`}
                </p>
              </div>
              <StatusPill status={c.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ShelterDashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [tab, setTab, params] = useTab('overview');
  const [stats, setStats] = useState(null);

  const loadStats = useCallback(() => {
    api.get('/shelters/me/dashboard').then(setStats);
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (!socket) return;
    socket.on('notification:new', loadStats);
    return () => socket.off('notification:new', loadStats);
  }, [socket, loadStats]);

  const openApps = stats ? (stats.applications.submitted || 0) + (stats.applications.under_review || 0) : 0;
  const dueCheckIns = stats ? (stats.checkIns.due || 0) + (stats.checkIns.missed || 0) : 0;

  return (
    <DashboardShell
      greeting={shelterName(user)}
      subtitle={`${user.shelterProfile?.isVerified ? '✓ Verified' : 'Unverified'} ${isCaregiver(user) ? 'individual caregiver' : 'shelter'} · Manage listings, applications and check-ins.`}
      actions={
        <>
          <Link to="/animals/new" className="btn-sun">
            <PlusIcon size={16} /> List an animal
          </Link>
          <Link to={`/shelters/${user._id}`} className="btn border-2 border-white/40 text-white hover:bg-white/10">
            Public profile
          </Link>
        </>
      }
      tabs={[
        ['overview', 'Overview'],
        ['listings', 'My listings'],
        ['applications', 'Applications', openApps],
        ['checkins', 'Check-ins', dueCheckIns],
      ]}
      tab={tab}
      onTab={setTab}
    >
      {tab === 'overview' && <Overview stats={stats} setTab={setTab} />}
      {tab === 'listings' && <Listings />}
      {tab === 'applications' && <Applications key={params.get('animal') || 'all'} animalFilter={params.get('animal')} />}
      {tab === 'checkins' && <CheckIns />}
      {tab === 'overview' && stats && (
        <p className="mt-8 flex items-center justify-center gap-1 text-center text-xs text-muted">
          <CalendarIcon size={14} /> Check-in reminders are sent to adopters automatically every morning.
        </p>
      )}
    </DashboardShell>
  );
}
