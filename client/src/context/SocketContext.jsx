import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useLocation } from 'react-router-dom';
import api, { API_ORIGIN } from '../api/client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const refreshCounts = useCallback(async () => {
    if (!token) return;
    const [msg, notes] = await Promise.all([api.get('/conversations/unread-count'), api.get('/notifications?limit=15')]);
    setUnreadMessages(msg.unread);
    setNotifications(notes.notifications);
    setUnreadNotifications(notes.unreadCount);
  }, [token]);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      setUnreadMessages(0);
      setNotifications([]);
      setUnreadNotifications(0);
      return;
    }
    const s = io(import.meta.env.VITE_SOCKET_URL || API_ORIGIN || undefined, { auth: { token }, transports: ['websocket', 'polling'] });
    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    setSocket(s);
    refreshCounts().catch(() => {});
    return () => {
      s.disconnect();
      setConnected(false);
    };
  }, [token, refreshCounts]);

  useEffect(() => {
    if (!socket) return;
    const onNotification = (n) => {
      setNotifications((list) => [n, ...list].slice(0, 15));
      setUnreadNotifications((c) => c + 1);
      const viewingChat = n.type === 'message' && location.pathname.startsWith('/messages');
      if (!viewingChat) toast.info(n.body, { title: n.title, link: n.link });
    };
    const onMessage = ({ message, conversationId }) => {
      const viewing = location.pathname === `/messages/${conversationId}`;
      if (String(message.sender) !== String(user?._id) && !viewing) setUnreadMessages((c) => c + 1);
    };
    const onRead = ({ readerId }) => {
      if (String(readerId) === String(user?._id)) api.get('/conversations/unread-count').then((r) => setUnreadMessages(r.unread)).catch(() => {});
    };
    const onNotificationRead = ({ id, all }) => {
      setNotifications((list) => list.map((n) => (all || n._id === id ? { ...n, isRead: true } : n)));
      setUnreadNotifications((c) => (all ? 0 : Math.max(0, c - 1)));
    };
    socket.on('notification:new', onNotification);
    socket.on('message:new', onMessage);
    socket.on('conversation:read', onRead);
    socket.on('notification:read', onNotificationRead);
    return () => {
      socket.off('notification:new', onNotification);
      socket.off('message:new', onMessage);
      socket.off('conversation:read', onRead);
      socket.off('notification:read', onNotificationRead);
    };
  }, [socket, user, toast, location.pathname]);

  const markNotificationRead = useCallback((id) => api.patch(`/notifications/${id}/read`).catch(() => {}), []);
  const markAllNotificationsRead = useCallback(() => api.patch('/notifications/read-all').catch(() => {}), []);

  const value = useMemo(
    () => ({
      socket,
      connected,
      unreadMessages,
      notifications,
      unreadNotifications,
      refreshCounts,
      markNotificationRead,
      markAllNotificationsRead,
    }),
    [socket, connected, unreadMessages, notifications, unreadNotifications, refreshCounts, markNotificationRead, markAllNotificationsRead]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
