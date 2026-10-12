import { Link } from 'react-router-dom';
import { ArrowRightIcon, HeartIcon, PawIcon } from './Icons';

export function CtaBand() {
  return (
    <section className="relative overflow-hidden bg-forest">
      <PawIcon size={64} className="absolute -right-2 top-4 rotate-12 text-white/10" />
      <PawIcon size={36} className="absolute bottom-3 right-24 -rotate-12 text-white/10" />
      <div className="container-page relative flex flex-col items-start gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <PawIcon size={56} className="hidden shrink-0 text-white sm:block" />
          <div>
            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">Adopt. Don't Shop.</h2>
            <p className="mt-1 text-white/80">Give a rescued animal a home and they'll give you unconditional love.</p>
          </div>
        </div>
        <Link to="/animals" className="btn shrink-0 border-2 border-white/80 px-6 py-3 text-white hover:bg-white hover:text-forest">
          <HeartIcon size={16} filled /> Start Your Adoption Journey <ArrowRightIcon size={16} />
        </Link>
      </div>
    </section>
  );
}

export default function Footer() {
  return (
    <footer className="bg-forest-dark text-white/70">
      <div className="container-page grid gap-8 py-10 text-sm sm:grid-cols-3">
        <div>
          <p className="flex items-center gap-2 font-display text-2xl font-bold text-white">
            <PawIcon size={26} /> PawShare
          </p>
          <p className="mt-2 max-w-xs">Connecting shelters, caregivers and loving families across your city, one paw at a time.</p>
        </div>
        <div>
          <p className="mb-2 font-bold text-white">Explore</p>
          <ul className="space-y-1.5">
            <li><Link to="/animals" className="hover:text-white">Adopt or foster</Link></li>
            <li><Link to="/map" className="hover:text-white">Map of nearby animals</Link></li>
            <li><Link to="/shelters" className="hover:text-white">Verified shelters</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-2 font-bold text-white">Get involved</p>
          <ul className="space-y-1.5">
            <li><Link to="/register?role=shelter" className="hover:text-white">List animals as a shelter</Link></li>
            <li><Link to="/register?role=shelter&type=caregiver" className="hover:text-white">Join as a foster caregiver</Link></li>
            <li><Link to="/register" className="hover:text-white">Create an adopter account</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs">© {new Date().getFullYear()} PawShare · Woxsen University · Full Stack Development PBL</div>
    </footer>
  );
}
