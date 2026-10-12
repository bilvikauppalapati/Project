import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import NotificationBell from './NotificationBell';
import { isCaregiver } from '../utils/format';
import { ChatIcon, HeartIcon, LogoutIcon, MenuIcon, PawIcon, SettingsIcon, GridIcon, XIcon } from './Icons';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/animals', label: 'Adopt & Foster' },
  { to: '/map', label: 'Map' },
  { to: '/shelters', label: 'Shelters' },
];

export function Logo({ light }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="PawShare home">
      <PawIcon size={38} className={light ? 'text-white' : 'text-forest'} />
      <span className="leading-none">
        <span className={`block font-display text-2xl font-bold sm:text-[28px] ${light ? 'text-white' : 'text-forest'}`}>PawShare</span>
        <span className="block text-[11px] font-bold tracking-wide text-clay">Adopt • Foster • Care</span>
      </span>
    </Link>
  );
}

const linkClass = ({ isActive }) =>
  `relative px-1 py-2 text-sm font-semibold transition ${isActive ? 'text-clay after:absolute after:inset-x-2 after:-bottom-0.5 after:h-0.5 after:rounded after:bg-clay' : 'text-forest hover:text-clay'}`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const { unreadMessages } = useSocket();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onClick = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenuOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const doLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-[1000] border-b border-black/5 bg-cream/95 backdrop-blur" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
      <div className="container-page flex h-[72px] items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
          {user && (
            <NavLink to="/dashboard" className={linkClass}>
              Dashboard
            </NavLink>
          )}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          {user ? (
            <>
              <Link to="/messages" className="relative rounded-full p-2 text-forest hover:bg-forest/5" aria-label={`Messages${unreadMessages ? `, ${unreadMessages} unread` : ''}`}>
                <ChatIcon size={22} />
                {unreadMessages > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-clay px-1 text-[10px] font-extrabold text-white">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </Link>
              <NotificationBell />
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="ml-1 grid h-10 w-10 place-items-center rounded-full bg-forest font-display text-lg font-bold text-white"
                  aria-label="Account menu"
                  aria-expanded={menuOpen}
                >
                  {user.name?.[0]?.toUpperCase()}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-12 z-[1200] w-60 overflow-hidden rounded-2xl border border-black/5 bg-white py-2 shadow-xl">
                    <div className="border-b border-black/5 px-4 pb-2">
                      <p className="truncate font-bold text-forest">{user.name}</p>
                      <p className="text-xs capitalize text-muted">{user.role === 'shelter' ? (isCaregiver(user) ? 'Individual caregiver' : 'Shelter') : user.role}</p>
                    </div>
                    <Link to="/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-cream">
                      <GridIcon size={16} /> Dashboard
                    </Link>
                    {user.role === 'adopter' && (
                      <Link to="/dashboard?tab=favourites" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-cream">
                        <HeartIcon size={16} /> Favourites
                      </Link>
                    )}
                    <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-cream">
                      <SettingsIcon size={16} /> {user.role === 'adopter' ? 'Profile & preferences' : 'Profile'}
                    </Link>
                    <button onClick={doLogout} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                      <LogoutIcon size={16} /> Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost hidden sm:inline-flex">
                Log in
              </Link>
              <Link to="/register" className="btn-accent hidden sm:inline-flex">
                <HeartIcon size={16} filled /> Adopt a Friend
              </Link>
            </>
          )}
          <button className="rounded-full p-2 text-forest hover:bg-forest/5 lg:hidden" onClick={() => setMobileOpen((o) => !o)} aria-label="Menu" aria-expanded={mobileOpen}>
            {mobileOpen ? <XIcon size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-black/5 bg-cream lg:hidden" aria-label="Mobile">
          <div className="container-page flex flex-col py-3">
            {[...LINKS, ...(user ? [{ to: '/dashboard', label: 'Dashboard' }] : [])].map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `rounded-xl px-3 py-2.5 font-semibold ${isActive ? 'bg-sand text-clay-dark' : 'text-forest'}`}>
                {l.label}
              </NavLink>
            ))}
            {!user && (
              <div className="mt-2 flex gap-2">
                <Link to="/login" className="btn-outline flex-1">
                  Log in
                </Link>
                <Link to="/register" className="btn-accent flex-1">
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
