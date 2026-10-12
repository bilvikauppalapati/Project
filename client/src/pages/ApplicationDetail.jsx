import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSocket } from '../context/SocketContext';
import StatusTimeline from '../components/StatusTimeline';
import CheckInForm from '../components/CheckInForm';
import { ChatIcon, ArrowLeftIcon } from '../components/Icons';
import { ErrorBox, Field, MatchBadge, Modal, Spinner, StarInput, StatusPill, VerifiedBadge } from '../components/ui';
import { ageLabel, cap, formatDate, imageUrl, label, profileOf, shelterName } from '../utils/format';

const SHELTER_ACTIONS = {
  submitted: [
    ['under_review', 'Start review', 'btn-outline'],
    ['approved', 'Approve', 'btn-primary'],
    ['rejected', 'Reject', 'btn-danger'],
  ],
  under_review: [
    ['approved', 'Approve', 'btn-primary'],
    ['rejected', 'Reject', 'btn-danger'],
  ],
  approved: [
    ['completed', 'Mark as completed', 'btn-accent'],
    ['rejected', 'Cancel approval', 'btn-danger'],
  ],
};

function Answer({ q, a }) {
  return (
    <div className="rounded-xl bg-cream px-3 py-2">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">{q}</dt>
      <dd className="font-semibold text-forest">{a}</dd>
    </div>
  );
}

export default function ApplicationDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const toast = useToast();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [checkIns, setCheckIns] = useState([]);
  const [myReview, setMyReview] = useState(undefined);
  const [error, setError] = useState(null);
  const [action, setAction] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [review, setReview] = useState({ rating: 5, comment: '' });

  const load = useCallback(async () => {
    try {
      const r = await api.get(`/applications/${id}`);
      setApp(r.application);
      if (r.application.status === 'completed') {
        const c = await api.get(`/checkins/application/${id}`);
        setCheckIns(c.checkIns);
        if (user?.role === 'adopter') {
          const rv = await api.get('/reviews/mine');
          setMyReview(rv.reviews.find((x) => x.application === id) || null);
        }
      }
    } catch (err) {
      setError(err);
    }
  }, [id, user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!socket) return;
    const onNote = (n) => n.link === `/applications/${id}` && load();
    socket.on('notification:new', onNote);
    return () => socket.off('notification:new', onNote);
  }, [socket, id, load]);

  if (error) return <div className="container-page py-10"><ErrorBox error={error} /></div>;
  if (!app) return <Spinner />;

  const isShelter = user._id === app.shelter._id || user.role === 'admin';
  const isAdopter = user._id === app.adopter._id;
  const q = app.questionnaire;
  const other = isAdopter ? app.shelter : app.adopter;

  const changeStatus = async (status, withNote) => {
    setBusy(true);
    try {
      const r = await api.patch(`/applications/${id}/status`, { status, note: withNote || undefined });
      setApp(r.application);
      toast.success(`Application ${label(status).toLowerCase()}`);
      setAction(null);
      setNote('');
      if (status === 'completed') load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const message = async () => {
    try {
      const r = await api.post('/conversations', { recipientId: other._id, animalId: app.animal._id });
      navigate(`/messages/${r.conversation._id}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.post('/reviews', { applicationId: id, ...review });
      setMyReview(r.review);
      toast.success('Thank you for your review!');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container-page max-w-5xl py-8">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-1 text-sm font-bold text-forest hover:text-clay">
        <ArrowLeftIcon size={16} /> Back
      </button>

      <div className="card mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <Link to={`/animals/${app.animal._id}`} className="shrink-0">
          <img src={imageUrl(app.animal.photos?.[0])} alt={app.animal.name} className="h-24 w-24 rounded-2xl bg-sand object-cover" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">{cap(app.type)} application</p>
          <h1 className="text-3xl font-bold">{app.animal.name}</h1>
          <p className="text-sm text-muted">
            {cap(app.animal.breed)} · {ageLabel(app.animal.ageMonths)} · Applied {formatDate(app.createdAt)}
            {app.fosterDuration && ` · Foster for ${app.fosterDuration}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {app.matchScore !== undefined && <MatchBadge score={app.matchScore} />}
          <StatusPill status={app.status} className="!px-3 !py-1 !text-sm" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="mb-5 text-2xl font-bold">Status</h2>
            <StatusTimeline application={app} />
            {app.shelterNotes && (
              <p className="mt-5 rounded-xl bg-sun/15 px-4 py-3 text-sm">
                <span className="font-bold text-forest">Note from {shelterName(app.shelter)}: </span>
                {app.shelterNotes}
              </p>
            )}
          </section>

          {isShelter && SHELTER_ACTIONS[app.status] && (
            <section className="card p-6">
              <h2 className="text-2xl font-bold">Your decision</h2>
              <p className="mt-1 text-sm text-muted">The adopter is notified instantly.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {SHELTER_ACTIONS[app.status].map(([status, text, cls]) => (
                  <button key={status} className={cls} disabled={busy} onClick={() => (status === 'under_review' ? changeStatus(status) : setAction(status))}>
                    {text}
                  </button>
                ))}
              </div>
            </section>
          )}

          {isAdopter && ['submitted', 'under_review'].includes(app.status) && (
            <button className="btn-ghost text-red-600" onClick={() => setAction('withdrawn')}>
              Withdraw my application
            </button>
          )}

          {app.status === 'completed' && (
            <section className="card p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-2xl font-bold">Post-adoption check-ins</h2>
                {isAdopter && (
                  <button className="btn-outline !py-2" onClick={() => setShowUpdate(true)}>
                    + Log health update
                  </button>
                )}
              </div>
              <ul className="mt-4 divide-y divide-black/5">
                {checkIns.map((c) => (
                  <li key={c._id}>
                    <Link to={`/checkins/${c._id}`} className="flex items-center gap-3 py-3 hover:opacity-80">
                      <span className="w-28 font-bold text-forest">{c.label}</span>
                      <span className="flex-1 text-sm text-muted">{c.status === 'completed' ? `Done ${formatDate(c.completedAt)}` : `Due ${formatDate(c.dueDate)}`}</span>
                      <StatusPill status={c.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {isAdopter && app.status === 'completed' && myReview !== undefined && (
            <section className="card p-6">
              <h2 className="text-2xl font-bold">Rate {shelterName(app.shelter)}</h2>
              {myReview ? (
                <p className="mt-2 text-sm text-muted">
                  You rated this adoption {myReview.rating}/5. Thank you!{myReview.comment && ` “${myReview.comment}”`}
                </p>
              ) : (
                <form onSubmit={submitReview} className="mt-3 space-y-3">
                  <StarInput value={review.rating} onChange={(rating) => setReview({ ...review, rating })} />
                  <textarea className="input min-h-20" placeholder="How was your experience?" value={review.comment} onChange={(e) => setReview({ ...review, comment: e.target.value })} />
                  <button className="btn-primary" disabled={busy}>
                    Submit review
                  </button>
                </form>
              )}
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="card p-6">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">{isAdopter ? 'Shelter' : 'Applicant'}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="font-display text-2xl font-bold text-forest">{isAdopter ? shelterName(other) : other.name}</p>
              {isAdopter && profileOf(other)?.isVerified && <VerifiedBadge />}
            </div>
            <dl className="mt-3 space-y-1 text-sm">
              {other.city && <p>📍 {other.city}</p>}
              {other.email && <p>✉️ {other.email}</p>}
              {other.phone && <p>📞 {other.phone}</p>}
            </dl>
            <button className="btn-outline mt-4 w-full" onClick={message}>
              <ChatIcon size={16} /> Message
            </button>
          </section>

          <section className="card p-6">
            <h2 className="text-2xl font-bold">Lifestyle questionnaire</h2>
            <dl className="mt-4 grid grid-cols-2 gap-2">
              <Answer q="Home" a={cap(q.homeType)} />
              <Answer q="Yard" a={q.hasYard ? 'Yes' : 'No'} />
              <Answer q="Kids" a={q.hasKids ? 'Yes' : 'No'} />
              <Answer q="Experience" a={cap(q.experience)} />
              <Answer q="Away per day" a={`${q.workHoursPerDay} h`} />
              <Answer q="Other pets" a={q.otherPets || 'None'} />
            </dl>
            {q.reason && <p className="mt-3 rounded-xl bg-cream px-3 py-2 text-sm italic text-ink/80">“{q.reason}”</p>}
          </section>
        </div>
      </div>

      <Modal open={Boolean(action)} onClose={() => setAction(null)} title={action === 'withdrawn' ? 'Withdraw application?' : `${label(action || '')} application`}>
        <Field label={action === 'withdrawn' ? 'Reason (optional)' : 'Message to the applicant (optional)'}>
          <textarea className="input min-h-24" value={note} onChange={(e) => setNote(e.target.value)} placeholder={action === 'approved' ? 'e.g. Please visit us on Saturday to meet Bruno.' : ''} />
        </Field>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setAction(null)}>
            Cancel
          </button>
          <button className={action === 'rejected' || action === 'withdrawn' ? 'btn-danger' : 'btn-primary'} disabled={busy} onClick={() => changeStatus(action, note)}>
            Confirm
          </button>
        </div>
      </Modal>

      <Modal open={showUpdate} onClose={() => setShowUpdate(false)} title={`Health update for ${app.animal.name}`}>
        <CheckInForm
          url={`/checkins/application/${id}/updates`}
          onDone={() => {
            setShowUpdate(false);
            toast.success('Update shared with the shelter');
            load();
          }}
        />
      </Modal>
    </div>
  );
}
