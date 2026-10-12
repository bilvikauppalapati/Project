import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import DashboardShell, { useTab } from '../../components/DashboardShell';
import { HomeIcon, PawIcon, ShieldCheckIcon, UsersIcon, SearchIcon } from '../../components/Icons';
import { Pagination, Spinner, StatCard, StatusPill, VerifiedBadge } from '../../components/ui';
import { displayName, formatDate, imageUrl, label, shelterName, timeAgo } from '../../utils/format';

const ACTIVITY_ICON = { user: '👋', application: '📋', adoption: '🏡', review: '⭐' };

function Chips({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([v, t]) => (
        <button key={v || 'all'} onClick={() => onChange(v)} className={`rounded-full border px-3 py-1.5 text-xs font-bold ${value === v ? 'border-forest bg-forest text-white' : 'border-black/10 bg-white text-forest'}`}>
          {t}
        </button>
      ))}
    </div>
  );
}

function SearchBox({ placeholder, onSearch }) {
  const [text, setText] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(text.trim());
      }}
      className="relative sm:w-72"
    >
      <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input className="input !pl-9" placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} aria-label={placeholder} />
    </form>
  );
}

function Breakdown({ title, data }) {
  const entries = Object.entries(data || {});
  const total = entries.reduce((s, [, v]) => s + v, 0);
  return (
    <section className="card p-5">
      <h2 className="text-xl font-bold">{title}</h2>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No data yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {entries.map(([k, v]) => (
            <li key={k}>
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-forest">{label(k)}</span>
                <span className="text-muted">{v}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-sand">
                <div className="h-full rounded-full bg-clay" style={{ width: `${(v / total) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Overview({ setTab }) {
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    api.get('/admin/stats').then(setStats);
    api.get('/admin/activity').then((r) => setEvents(r.events));
  }, []);

  const runReminders = async () => {
    setRunning(true);
    try {
      const r = await api.post('/admin/run-reminders');
      toast.success(`${r.reminded} reminder(s) sent, ${r.missed} check-in(s) marked missed`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRunning(false);
    }
  };

  if (!stats) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Users" value={Object.values(stats.users).reduce((a, b) => a + b, 0)} icon={<UsersIcon />} />
        <StatCard label={`Shelters (${stats.shelters.pending} awaiting verification)`} value={stats.users.shelter || 0} icon={<ShieldCheckIcon />} tone="bg-emerald-50 text-emerald-700" />
        <StatCard label="Active listings" value={Object.values(stats.animals).reduce((a, b) => a + b, 0)} icon={<PawIcon />} tone="bg-sun/30 text-clay-dark" />
        <StatCard label="Adoptions & fosters" value={stats.adoptions} icon={<HomeIcon />} tone="bg-sky-50 text-sky-700" />
      </div>

      {stats.shelters.pending > 0 && (
        <div className="card flex flex-col items-start gap-3 border-sun bg-sun/15 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            <span className="font-bold text-forest">{stats.shelters.pending} shelter{stats.shelters.pending > 1 ? 's are' : ' is'} waiting for verification.</span>
          </p>
          <button className="btn-primary shrink-0 !py-2" onClick={() => setTab('shelters')}>
            Review now
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="card p-5">
          <h2 className="text-xl font-bold">Recent activity</h2>
          {!events ? (
            <Spinner className="!py-6" />
          ) : (
            <ul className="mt-3 divide-y divide-black/5">
              {events.map((e, i) => (
                <li key={i} className="flex items-start gap-3 py-2.5 text-sm">
                  <span>{ACTIVITY_ICON[e.type]}</span>
                  <span className="min-w-0 flex-1">{e.link ? <Link to={e.link} className="hover:underline">{e.text}</Link> : e.text}</span>
                  <span className="shrink-0 text-xs text-muted">{timeAgo(e.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <div className="space-y-6">
          <Breakdown title="Applications by status" data={stats.applications} />
          <Breakdown title="Check-ins by status" data={stats.checkIns} />
        </div>
      </div>

      <section className="card flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Check-in reminder job</h2>
          <p className="text-sm text-muted">Runs automatically every day at 9:00 AM (node-cron). Run it now for a demo: due check-ins get reminders, overdue ones are marked missed.</p>
        </div>
        <button className="btn-primary shrink-0" onClick={runReminders} disabled={running}>
          {running ? 'Running…' : 'Run reminders now'}
        </button>
      </section>
      <p className="text-center text-sm text-muted">
        {stats.reviews} reviews · {stats.inactiveListings} deactivated listing{stats.inactiveListings === 1 ? '' : 's'}
      </p>
    </div>
  );
}

function Shelters() {
  const toast = useToast();
  const [status, setStatus] = useState('pending');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    api.get('/admin/shelters', { params: { status, q: q || undefined, page } }).then(setData);
  }, [status, q, page]);

  useEffect(() => {
    load();
  }, [load]);

  const verify = async (s, verified) => {
    try {
      await api.patch(`/admin/shelters/${s.user._id}/verify`, { verified });
      toast.success(`${s.organisationName} ${verified ? 'verified' : 'unverified'}`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Chips
          options={[
            ['pending', 'Awaiting verification'],
            ['verified', 'Verified'],
            ['all', 'All'],
          ]}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />
        <SearchBox placeholder="Search shelters" onSearch={(v) => { setQ(v); setPage(1); }} />
      </div>
      {!data ? (
        <Spinner />
      ) : data.shelters.length === 0 ? (
        <p className="card p-8 text-center text-muted">{status === 'pending' ? 'No shelters waiting for verification. 🎉' : 'No shelters found.'}</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-black/5 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Shelter</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Listings</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {data.shelters.map((s) => (
                <tr key={s._id}>
                  <td className="px-4 py-3">
                    <Link to={`/shelters/${s.user._id}`} className="font-bold text-forest hover:underline">
                      {s.organisationName}
                    </Link>
                    <p className="text-xs text-muted">
                      {label(s.type)} · {s.city}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <p>{s.contactEmail || s.user.email}</p>
                    <p className="text-muted">{s.contactPhone || s.user.phone}</p>
                  </td>
                  <td className="px-4 py-3">{s.animalCount}</td>
                  <td className="px-4 py-3 text-xs text-muted">{formatDate(s.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {s.isVerified ? (
                      <div className="flex items-center justify-end gap-2">
                        <VerifiedBadge />
                        <button onClick={() => verify(s, false)} className="text-xs font-bold text-red-600 hover:underline">
                          Revoke
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => verify(s, true)} className="btn-primary !px-4 !py-1.5 !text-xs">
                        <ShieldCheckIcon size={14} /> Verify
                      </button>
                    )}
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

function Listings() {
  const toast = useToast();
  const [active, setActive] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    api.get('/admin/animals', { params: { active: active || undefined, q: q || undefined, page } }).then(setData);
  }, [active, q, page]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (a) => {
    try {
      await api.patch(`/animals/${a._id}/active`, { isActive: !a.isActive });
      toast.success(`${a.name} ${a.isActive ? 'deactivated' : 'reactivated'}`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Chips
          options={[
            ['', 'All'],
            ['true', 'Active'],
            ['false', 'Deactivated'],
          ]}
          value={active}
          onChange={(v) => {
            setActive(v);
            setPage(1);
          }}
        />
        <SearchBox placeholder="Search by animal name" onSearch={(v) => { setQ(v); setPage(1); }} />
      </div>
      {!data ? (
        <Spinner />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-black/5 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Animal</th>
                <th className="px-4 py-3">Listed by</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {data.animals.map((a) => (
                <tr key={a._id} className={a.isActive ? '' : 'bg-stone-50 text-muted'}>
                  <td className="px-4 py-3">
                    <Link to={`/animals/${a._id}`} className="flex items-center gap-3">
                      <img src={imageUrl(a.photos?.[0])} alt="" className="h-10 w-10 rounded-lg bg-sand object-cover" />
                      <span className="font-bold text-forest">{a.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">{shelterName(a.shelter)}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={a.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => toggle(a)} className={a.isActive ? 'btn-ghost !py-1 !text-xs text-red-600' : 'btn-outline !py-1 !text-xs'}>
                      {a.isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
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

function Users() {
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/admin/users', { params: { role: role || undefined, q: q || undefined, page } }).then(setData);
  }, [role, q, page]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Chips
          options={[
            ['', 'All'],
            ['adopter', 'Adopters'],
            ['shelter', 'Shelters'],
            ['admin', 'Admins'],
          ]}
          value={role}
          onChange={(v) => {
            setRole(v);
            setPage(1);
          }}
        />
        <SearchBox placeholder="Name, email or city" onSearch={(v) => { setQ(v); setPage(1); }} />
      </div>
      {!data ? (
        <Spinner />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="border-b border-black/5 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {data.users.map((u) => (
                <tr key={u._id}>
                  <td className="px-4 py-3 font-bold text-forest">{displayName(u)}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="chip bg-sand text-forest">{u.role}</span>
                  </td>
                  <td className="px-4 py-3">{u.city || '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted">{formatDate(u.createdAt)}</td>
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

export default function AdminDashboard() {
  const [tab, setTab] = useTab('overview');
  const [pending, setPending] = useState(0);

  useEffect(() => {
    api.get('/admin/shelters', { params: { status: 'pending', limit: 1 } }).then((r) => setPending(r.total));
  }, [tab]);

  return (
    <DashboardShell
      greeting="Admin dashboard"
      subtitle="Verify shelters, moderate listings and keep an eye on platform activity."
      tabs={[
        ['overview', 'Overview'],
        ['shelters', 'Shelter verification', pending],
        ['listings', 'Listings'],
        ['users', 'Users'],
      ]}
      tab={tab}
      onTab={setTab}
    >
      {tab === 'overview' && <Overview setTab={setTab} />}
      {tab === 'shelters' && <Shelters />}
      {tab === 'listings' && <Listings />}
      {tab === 'users' && <Users />}
    </DashboardShell>
  );
}
