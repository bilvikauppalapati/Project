import { Link } from 'react-router-dom';
import { PawIcon } from '../components/Icons';

export default function NotFound() {
  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-16 text-center">
      <div>
        <PawIcon size={64} className="mx-auto rotate-12 text-clay" />
        <h1 className="mt-4 font-display text-6xl font-bold">404</h1>
        <p className="mt-2 text-lg text-muted">This page wandered off. Let's get you back on the trail.</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/" className="btn-primary">
            Go home
          </Link>
          <Link to="/animals" className="btn-outline">
            Browse animals
          </Link>
        </div>
      </div>
    </div>
  );
}
