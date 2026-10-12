import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useSocket } from '../context/SocketContext';
import { EmptyState, PageHeader, Pagination, Spinner } from '../components/ui';
import { XIcon } from '../components/Icons';
import { formatDate, timeAgo } from '../utils/format';

const TYPE_ICON = { application: '📋', message: '💬', checkin: '🩺', review: '⭐', verification: '✅', system: '🐾' };

export default function Notifications() {
  const navigate = useNavigate();
  const { socket, refreshCounts } = useSocket();
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    api.get('/notifications', { params: { page, unread: onlyUnread || undefined } }).then(setData);
  }, [page, onlyUnread]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!socket) return;
    socket.on('notification:new', load);
    return () => socket.off('notification:new', load);
  }, [socket, load]);

  const open = async (n) => {
    if (!n.isRead) await api.patch(`/notifications/${n._id}/read`);
    refreshCounts();
    if (n.link) navigate(n.link);
    else load();
  };

  const remove = async (n) => {
    await api.delete(`/notifications/${n._id}`);
    refreshCounts();
    load();
  };

  const readAll = async () => {
    await api.patch('/notifications/read-all');
    refreshCounts();
    load();
  };

  return (
    <div className="container-page max-w-3xl py-10">
      <PageHeader title="Notifications" subtitle={data ? `${data.unreadCount} unread` : ''}>
        <button className="btn-outline !py-2" onClick={() => { setOnlyUnread(!onlyUnread); setPage(1); }}>
          {onlyUnread ? 'Show all' : 'Unread only'}
        </button>
        {data?.unreadCount > 0 && (
          <button className="btn-primary !py-2" onClick={readAll}>
            Mark all read
          </button>
        )}
      </PageHeader>
      {!data && <Spinner />}
      {data?.notifications.length === 0 && <EmptyState title="Nothing here" icon="🔔">Application updates, messages and check-in reminders will appear here.</EmptyState>}
      <ul className="space-y-2">
        {data?.notifications.map((n) => (
          <li key={n._id} className={`card flex items-start gap-3 p-4 ${n.isRead ? '' : 'ring-2 ring-sun/60'}`}>
            <span className="text-2xl">{TYPE_ICON[n.type] || '🐾'}</span>
            <button onClick={() => open(n)} className="min-w-0 flex-1 text-left">
              <p className="font-bold text-forest">{n.title}</p>
              {n.body && <p className="text-sm text-ink/80">{n.body}</p>}
              <p className="mt-0.5 text-xs text-muted" title={formatDate(n.createdAt)}>
                {timeAgo(n.createdAt)}
              </p>
            </button>
            <button onClick={() => remove(n)} className="rounded-full p-1 text-muted hover:bg-black/5" aria-label="Delete notification">
              <XIcon size={16} />
            </button>
          </li>
        ))}
      </ul>
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
    </div>
  );
}
