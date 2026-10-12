import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { timeAgo } from '../utils/format';
import { BellIcon } from './Icons';

const TYPE_ICON = { application: '📋', message: '💬', checkin: '🩺', review: '⭐', verification: '✅', system: '🐾' };

export default function NotificationBell() {
  const { notifications, unreadNotifications, markNotificationRead, markAllNotificationsRead } = useSocket();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const openNotification = (n) => {
    if (!n.isRead) markNotificationRead(n._id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 text-forest hover:bg-forest/5"
        aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ''}`}
        aria-expanded={open}
      >
        <BellIcon size={22} />
        {unreadNotifications > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-clay px-1 text-[10px] font-extrabold text-white">
            {unreadNotifications > 9 ? '9+' : unreadNotifications}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-16 z-[1200] overflow-hidden rounded-2xl border border-black/5 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96">
          <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
            <p className="font-display text-lg font-bold text-forest">Notifications</p>
            {unreadNotifications > 0 && (
              <button onClick={markAllNotificationsRead} className="text-xs font-bold text-clay-dark hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">You're all caught up 🐾</li>}
            {notifications.map((n) => (
              <li key={n._id}>
                <button
                  onClick={() => openNotification(n)}
                  className={`flex w-full gap-3 px-4 py-3 text-left transition hover:bg-cream ${n.isRead ? '' : 'bg-sun/10'}`}
                >
                  <span className="text-lg">{TYPE_ICON[n.type] || '🐾'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-forest">{n.title}</span>
                    {n.body && <span className="line-clamp-2 block text-xs text-muted">{n.body}</span>}
                    <span className="mt-0.5 block text-[11px] text-muted/80">{timeAgo(n.createdAt)}</span>
                  </span>
                  {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-clay" />}
                </button>
              </li>
            ))}
          </ul>
          <Link to="/notifications" onClick={() => setOpen(false)} className="block border-t border-black/5 py-2.5 text-center text-sm font-bold text-forest hover:bg-cream">
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
