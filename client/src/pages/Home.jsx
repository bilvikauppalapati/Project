import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import AnimalCard from '../components/AnimalCard';
import { CtaBand } from '../components/Footer';
import { ArrowRightIcon, HeartIcon, HomeIcon, LeafIcon, PawIcon, ShieldCheckIcon, MapPinIcon, ClipboardIcon, ChatIcon } from '../components/Icons';
import { Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import hero from '../assets/hero.jpg';

const REASONS = [
  { icon: HeartIcon, title: 'Save a Life', text: 'Give a second chance to an animal in need.' },
  { icon: HomeIcon, title: 'Build a Loving Home', text: "They'll be your loyal companions for life." },
  { icon: PawIcon, title: 'Support Community', text: 'Help reduce the number of homeless animals on the streets.' },
  { icon: LeafIcon, title: 'Promote Kindness', text: 'Adoption encourages a more compassionate world.' },
];

const STEPS = [
  { icon: MapPinIcon, title: 'Discover nearby', text: 'Search by species, size, temperament and distance, or browse the map.' },
  { icon: ClipboardIcon, title: 'Apply in minutes', text: 'Tell the shelter about your home and lifestyle. See your match % first.' },
  { icon: ChatIcon, title: 'Chat & meet', text: 'Message the shelter directly and track every status update.' },
  { icon: ShieldCheckIcon, title: 'Stay in touch', text: 'Share check-ins after adoption so caregivers know their friend is thriving.' },
];

export default function Home() {
  const { user } = useAuth();
  const [animals, setAnimals] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api
      .get('/animals', { params: { limit: 4, sort: user?.role === 'adopter' ? 'match' : 'newest' } })
      .then((r) => {
        setAnimals(r.animals);
        setStats((s) => ({ ...s, available: r.total }));
      })
      .catch(() => setAnimals([]));
    api.get('/shelters', { params: { limit: 1 } }).then((r) => setStats((s) => ({ ...s, shelters: r.total }))).catch(() => {});
  }, [user?.role]);

  return (
    <>
      <section className="relative overflow-hidden">
        <img src={hero} alt="A happy rescue dog looking up" className="absolute inset-0 h-full w-full object-cover object-[70%_center]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/0 sm:via-black/35" />
        <div className="container-page relative flex min-h-[460px] flex-col justify-center py-16 sm:min-h-[520px]">
          <h1 className="max-w-xl font-display text-5xl font-bold leading-[1.05] text-white drop-shadow sm:text-6xl">
            They're not just strays…
            <span className="block text-sun">They're waiting for a home.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-white/90">
            Adopt or foster a rescued animal near you and give them the love, safety and life they deserve.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/animals" className="btn-sun px-7 py-3.5 text-base">
              <PawIcon size={20} /> Browse Animals <ArrowRightIcon size={18} />
            </Link>
            <Link to="/map" className="btn border-2 border-white/70 px-6 py-3 text-base text-white hover:bg-white hover:text-forest">
              <MapPinIcon size={18} /> See the map
            </Link>
          </div>
          {stats && (
            <p className="mt-8 text-sm font-semibold text-white/80">
              {stats.available ?? '…'} animals waiting · {stats.shelters ?? '…'} shelters & caregivers
            </p>
          )}
        </div>
      </section>

      <section className="container-page grid gap-10 border-b border-black/5 py-14 lg:grid-cols-[1fr_2fr] lg:items-center">
        <div>
          <h2 className="section-title">Why Adopt a Rescue?</h2>
          <p className="mt-4 leading-relaxed text-ink/80">
            Rescued animals are loving, loyal and incredibly resilient. They may have had a tough start, but with your support they can live
            happy, healthy lives. Adoption not only changes their life, it also makes a difference in your community.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-y-8 sm:grid-cols-4 sm:divide-x sm:divide-black/10">
          {REASONS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex flex-col items-center px-3 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-sand text-clay-dark">
                <Icon size={30} strokeWidth={1.8} />
              </div>
              <h3 className="mt-4 text-lg font-bold">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="section-title">{user?.role === 'adopter' ? 'Your Best Matches' : 'Meet Some of Our Friends'}</h2>
            <p className="mt-1 text-ink/80">
              {user?.role === 'adopter'
                ? 'Ranked by your lifestyle preferences and distance.'
                : 'Each of them has a unique story and is looking for a forever home.'}
            </p>
          </div>
          <Link to="/animals" className="flex items-center gap-1.5 text-sm font-bold text-forest hover:text-clay">
            View All Animals <ArrowRightIcon size={16} />
          </Link>
        </div>
        {animals === null ? (
          <Spinner />
        ) : animals.length === 0 ? (
          <p className="card p-8 text-center text-muted">No animals listed yet. Run the seed script to add demo data.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {animals.map((a) => (
              <AnimalCard key={a._id} animal={a} />
            ))}
          </div>
        )}
      </section>

      <section className="bg-sand/60 py-14">
        <div className="container-page">
          <h2 className="section-title text-center">How PawShare Works</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className="card relative p-6">
                <span className="absolute right-5 top-4 font-display text-4xl font-bold text-sand">{i + 1}</span>
                <div className="grid h-12 w-12 place-items-center rounded-full bg-forest text-white">
                  <Icon size={22} />
                </div>
                <h3 className="mt-4 text-xl font-bold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </div>
            ))}
          </div>
          {!user && (
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link to="/register" className="btn-accent px-6 py-3">
                <HeartIcon size={16} filled /> I want to adopt
              </Link>
              <Link to="/register?role=shelter" className="btn-outline px-6 py-3">
                <HomeIcon size={16} /> I'm a shelter or caregiver
              </Link>
            </div>
          )}
        </div>
      </section>

      <CtaBand />
    </>
  );
}
