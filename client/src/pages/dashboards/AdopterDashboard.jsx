import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import AnimalCard from '../../components/AnimalCard';
import DashboardShell, { useTab } from '../../components/DashboardShell';
import { ArrowRightIcon, CalendarIcon, ClipboardIcon, HeartIcon, HomeIcon, SettingsIcon } from '../../components/Icons';
import { EmptyState, Spinner, StatCard, StatusPill } from '../../components/ui';
import { cap, formatDate, imageUrl, shelterName, timeAgo } from '../../utils/format';

function ApplicationRow({ app }) {
  return (
    <Link to={`/applications/${app._id}`} className="card flex items-center gap-4 p-4 transition hover:shadow-md">
      <img src={imageUrl(app.animal?.photos?.[0])} alt="" className="h-16 w-16 shrink-0 rounded-xl bg-sand object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-xl font-bold text-forest">{app.animal?.name}</p>
        <p className="truncate text-xs text-muted">
          {cap(app.type)} · {shelterName(app.shelter)} · updated {timeAgo(app.updatedAt)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <StatusPill status={app.status} />
        {app.matchScore !== undefined && <span className="text-[11px] text-muted">{app.matchScore}% match</span>}
      </div>
    </Link>
  );
}

function CheckInRow({ c }) {
  const urgent = c.status === 'due' || c.status === 'missed';
  return (
    <Link to={`/checkins/${c._id}`} className={`card flex items-center gap-4 p-4 transition hover:shadow-md ${urgent ? 'ring-2 ring-sun' : ''}`}>
      <img src={imageUrl(c.animal?.photos?.[0])} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-sand object-cover" />
      <div className="min-w-0 flex-1">
        <p className="font-bold text-forest">
          {c.animal?.name} · {c.label}
        </p>
        <p className="text-xs text-muted">{c.status === 'completed' ? `Completed ${formatDate(c.completedAt)}` : `Due ${formatDate(c.dueDate)} (${timeAgo(c.dueDate)})`}</p>
      </div>
      <StatusPill status={c.status} />
    </Link>
  );
}

export default function AdopterDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useTab('overview');
  const [apps, setApps] = useState(null);
  const [favs, setFavs] = useState(null);
  const [checkIns, setCheckIns] = useState(null);
  const [matches, setMatches] = useState(null);

  useEffect(() => {
    api.get('/applications/mine').then((r) => setApps(r.applications));
    api.get('/animals/favourites').then((r) => setFavs(r.animals));
    api.get('/checkins/mine').then((r) => setCheckIns(r.checkIns));
    api.get('/animals', { params: { sort: 'match', limit: 4 } }).then((r) => setMatches(r.animals));
  }, []);

  const active = apps?.filter((a) => ['submitted', 'under_review', 'approved'].includes(a.status)) || [];
  const completed = apps?.filter((a) => a.status === 'completed') || [];
  const dueCheckIns = checkIns?.filter((c) => c.status === 'due' || c.status === 'missed') || [];
  const hasPrefs = (user.preferences?.species?.length || 0) + (user.preferences?.sizes?.length || 0) > 0;

  const tabs = [
    ['overview', 'Overview'],
    ['applications', 'Applications', active.length],
    ['favourites', 'Favourites', favs?.length],
    ['checkins', 'Check-ins', dueCheckIns.length],
  ];

  return (
    <DashboardShell
      greeting={`Hi ${user.name.split(' ')[0]} 🐾`}
      subtitle="Track your applications, saved animals and post-adoption check-ins."
      actions={
        <>
          <Link to="/animals" className="btn-sun">
            Find animals <ArrowRightIcon size={16} />
          </Link>
          <Link to="/profile" className="btn border-2 border-white/40 text-white hover:bg-white/10">
            <SettingsIcon size={16} /> Preferences
          </Link>
        </>
      }
      tabs={tabs}
      tab={tab}
      onTab={setTab}
    >
      {tab === 'overview' && (
        <div className="space-y-10">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Active applications" value={apps ? active.length : '…'} icon={<ClipboardIcon />} />
            <StatCard label="Saved favourites" value={favs ? favs.length : '…'} icon={<HeartIcon />} tone="bg-red-50 text-red-500" />
            <StatCard label="Check-ins due" value={checkIns ? dueCheckIns.length : '…'} icon={<CalendarIcon />} tone="bg-sun/30 text-clay-dark" />
            <StatCard label="Adopted / fostered" value={apps ? completed.length : '…'} icon={<HomeIcon />} tone="bg-emerald-50 text-emerald-700" />
          </div>

          {!hasPrefs && (
            <div className="card flex flex-col items-start gap-3 border-sun bg-sun/15 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm">
                <span className="font-bold text-forest">Improve your matches:</span> tell us which species and sizes you prefer, and whether you have kids or other pets.
              </p>
              <Link to="/profile" className="btn-primary shrink-0 !py-2">
                Set preferences
              </Link>
            </div>
          )}

          {dueCheckIns.length > 0 && (
            <section>
              <h2 className="mb-3 text-2xl font-bold">Check-ins waiting for you</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {dueCheckIns.map((c) => (
                  <CheckInRow key={c._id} c={c} />
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-end justify-between">
              <h2 className="text-2xl font-bold">Recent applications</h2>
              {apps?.length > 3 && (
                <button onClick={() => setTab('applications')} className="text-sm font-bold text-clay-dark hover:underline">
                  See all
                </button>
              )}
            </div>
            {!apps ? (
              <Spinner />
            ) : apps.length === 0 ? (
              <EmptyState title="No applications yet" action={<Link to="/animals" className="btn-primary">Browse animals</Link>}>
                When you apply to adopt or foster, you can follow every step here.
              </EmptyState>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {apps.slice(0, 4).map((a) => (
                  <ApplicationRow key={a._id} app={a} />
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-end justify-between">
              <h2 className="text-2xl font-bold">Recommended for you</h2>
              <Link to="/animals?sort=match" className="text-sm font-bold text-clay-dark hover:underline">
                See all
              </Link>
            </div>
            {!matches ? (
              <Spinner />
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {matches.map((a) => (
                  <AnimalCard key={a._id} animal={a} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'applications' &&
        (!apps ? (
          <Spinner />
        ) : apps.length === 0 ? (
          <EmptyState title="No applications yet" action={<Link to="/animals" className="btn-primary">Browse animals</Link>} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {apps.map((a) => (
              <ApplicationRow key={a._id} app={a} />
            ))}
          </div>
        ))}

      {tab === 'favourites' &&
        (!favs ? (
          <Spinner />
        ) : favs.length === 0 ? (
          <EmptyState title="No favourites yet" icon="❤️" action={<Link to="/animals" className="btn-primary">Browse animals</Link>}>
            Tap the heart on any animal to save it here.
          </EmptyState>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {favs.map((a) => (
              <AnimalCard key={a._id} animal={a} />
            ))}
          </div>
        ))}

      {tab === 'checkins' &&
        (!checkIns ? (
          <Spinner />
        ) : checkIns.length === 0 ? (
          <EmptyState title="No check-ins yet" icon="🩺">
            After an adoption is completed, check-ins are scheduled at 1 week, 1 month and 3 months.
          </EmptyState>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {checkIns.map((c) => (
              <CheckInRow key={c._id} c={c} />
            ))}
          </div>
        ))}

      {tab === 'overview' && completed.length > 0 && (
        <p className="mt-8 text-center text-sm text-muted">
          You've given {completed.length} animal{completed.length > 1 ? 's' : ''} a home. Thank you! 🧡
        </p>
      )}
    </DashboardShell>
  );
}
