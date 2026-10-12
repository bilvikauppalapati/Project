import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { ArrowLeftIcon, CheckIcon, SendIcon } from '../components/Icons';
import { EmptyState, Spinner, VerifiedBadge } from '../components/ui';
import { displayName, formatDate, formatTime, imageUrl, profileOf, timeAgo } from '../utils/format';

function Avatar({ user, size = 'h-11 w-11' }) {
  return (
    <span className={`relative grid ${size} shrink-0 place-items-center rounded-full bg-forest font-display text-lg font-bold text-white`}>
      {displayName(user)[0]?.toUpperCase()}
      {user?.online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />}
    </span>
  );
}

function ChatWindow({ conversationId, onBack, onActivity }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(null);
  const [otherReadAt, setOtherReadAt] = useState(0);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);
  const scrollRef = useRef(null);
  const keepScroll = useRef(null);
  const typingTimer = useRef(null);
  const sentTyping = useRef(false);

  const markRead = useCallback(() => {
    socket?.emit('conversation:read', conversationId, () => onActivity());
  }, [socket, conversationId, onActivity]);

  useEffect(() => {
    let cancelled = false;
    setConversation(null);
    setMessages([]);
    setError(null);
    Promise.all([api.get(`/conversations/${conversationId}`), api.get(`/conversations/${conversationId}/messages`)])
      .then(([c, m]) => {
        if (cancelled) return;
        setConversation(c.conversation);
        setMessages(m.messages);
        setHasMore(m.hasMore);
        const other = c.conversation.otherUser?._id;
        const lastReadByOther = [...m.messages].reverse().find((x) => x.sender === user._id && x.readBy?.includes(other));
        setOtherReadAt(lastReadByOther ? new Date(lastReadByOther.createdAt).getTime() : 0);
      })
      .catch((err) => !cancelled && setError(err));
    return () => {
      cancelled = true;
    };
  }, [conversationId, user._id]);

  useEffect(() => {
    if (!socket || !conversation) return;
    socket.emit('conversation:join', conversationId);
    markRead();

    const onMessage = ({ message, conversationId: cid }) => {
      if (cid !== conversationId) return;
      setMessages((list) => (list.some((m) => m._id === message._id) ? list : [...list, message]));
      if (message.sender !== user._id) {
        setTyping(null);
        markRead();
      }
    };
    const onTyping = (t) => t.conversationId === conversationId && setTyping(t.isTyping ? t.name : null);
    const onRead = ({ conversationId: cid, readerId }) => cid === conversationId && readerId !== user._id && setOtherReadAt(Date.now());
    const onPresence = ({ userId, online }) =>
      setConversation((c) => (c && c.otherUser?._id === userId ? { ...c, otherUser: { ...c.otherUser, online } } : c));

    socket.on('message:new', onMessage);
    socket.on('typing', onTyping);
    socket.on('conversation:read', onRead);
    socket.on('presence', onPresence);
    return () => {
      socket.emit('conversation:leave', conversationId);
      socket.off('message:new', onMessage);
      socket.off('typing', onTyping);
      socket.off('conversation:read', onRead);
      socket.off('presence', onPresence);
    };
  }, [socket, conversation?._id, conversationId, user._id, markRead]);

  useLayoutEffect(() => {
    if (keepScroll.current !== null && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight - keepScroll.current;
      keepScroll.current = null;
    } else {
      bottomRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [messages, typing]);

  const loadOlder = async () => {
    if (!messages.length) return;
    keepScroll.current = scrollRef.current.scrollHeight - scrollRef.current.scrollTop;
    const r = await api.get(`/conversations/${conversationId}/messages`, { params: { before: messages[0].createdAt } });
    setMessages((list) => [...r.messages, ...list]);
    setHasMore(r.hasMore);
  };

  const emitTyping = (isTyping) => {
    if (sentTyping.current === isTyping) return;
    sentTyping.current = isTyping;
    socket?.emit('typing', { conversationId, isTyping });
  };

  const onChange = (e) => {
    setText(e.target.value);
    emitTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitTyping(false), 1500);
  };

  const send = (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText('');
    emitTyping(false);
    const done = (res) => {
      if (!res?.ok) {
        setText(body);
        setError(new Error(res?.error || 'Message failed to send'));
        return;
      }
      setError(null);
      setMessages((list) => (list.some((m) => m._id === res.message._id) ? list : [...list, res.message]));
      onActivity();
    };
    if (socket?.connected) socket.emit('message:send', { conversationId, text: body }, done);
    else
      api
        .post(`/conversations/${conversationId}/messages`, { text: body })
        .then((r) => done({ ok: true, message: r.message }))
        .catch((err) => done({ ok: false, error: err.message }));
  };

  if (error && !conversation) return <div className="p-6 text-sm text-red-600">{error.message}</div>;
  if (!conversation) return <Spinner />;
  const other = conversation.otherUser;
  const lastMine = [...messages].reverse().find((m) => m.sender === user._id);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-black/5 px-4 py-3">
        <button onClick={onBack} className="rounded-full p-1 md:hidden" aria-label="Back to conversations">
          <ArrowLeftIcon />
        </button>
        <Avatar user={other} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate font-bold text-forest">
            {displayName(other)} {profileOf(other)?.isVerified && <VerifiedBadge small />}
          </p>
          <p className="text-xs text-muted">{typing ? 'typing…' : other?.online ? 'Online' : 'Offline'}</p>
        </div>
        {conversation.animal && (
          <Link to={`/animals/${conversation.animal._id}`} className="flex items-center gap-2 rounded-full bg-cream py-1 pl-1 pr-3 text-xs font-bold text-forest hover:bg-sand">
            <img src={imageUrl(conversation.animal.photos?.[0])} alt="" className="h-7 w-7 rounded-full bg-sand object-cover" />
            {conversation.animal.name}
          </Link>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-cream/60 px-4 py-4">
        {hasMore && (
          <div className="text-center">
            <button onClick={loadOlder} className="text-xs font-bold text-clay-dark hover:underline">
              Load older messages
            </button>
          </div>
        )}
        {messages.length === 0 && <p className="py-10 text-center text-sm text-muted">Say hello 👋 Ask about the animal, visiting hours or anything else.</p>}
        {messages.map((m, i) => {
          const mine = m.sender === user._id;
          const showDate = i === 0 || new Date(m.createdAt).toDateString() !== new Date(messages[i - 1].createdAt).toDateString();
          return (
            <div key={m._id}>
              {showDate && <p className="my-3 text-center text-[11px] font-bold uppercase tracking-wide text-muted">{formatDate(m.createdAt)}</p>}
              <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${mine ? 'rounded-br-md bg-forest text-white' : 'rounded-bl-md bg-white text-ink'}`}>
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <p className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${mine ? 'text-white/60' : 'text-muted'}`}>
                    {formatTime(m.createdAt)}
                    {mine && m._id === lastMine?._id && new Date(m.createdAt).getTime() <= otherReadAt && (
                      <span className="flex items-center gap-0.5">
                        · Seen <CheckIcon size={10} strokeWidth={3} />
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        {typing && <p className="text-xs italic text-muted">{typing} is typing…</p>}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 pt-2 text-xs text-red-600">{error.message}</p>}
      <form onSubmit={send} className="flex items-end gap-2 border-t border-black/5 p-3">
        <textarea
          rows={1}
          value={text}
          onChange={onChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) send(e);
          }}
          maxLength={2000}
          placeholder="Write a message…"
          className="input max-h-32 flex-1 resize-none"
          aria-label="Message"
        />
        <button className="btn-primary !p-3" disabled={!text.trim()} aria-label="Send">
          <SendIcon size={18} />
        </button>
      </form>
    </div>
  );
}

export default function Messages() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket, refreshCounts } = useSocket();
  const [conversations, setConversations] = useState(null);

  const load = useCallback(() => {
    api.get('/conversations').then((r) => setConversations(r.conversations)).catch(() => setConversations([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => load();
    socket.on('message:new', refresh);
    socket.on('presence', refresh);
    return () => {
      socket.off('message:new', refresh);
      socket.off('presence', refresh);
    };
  }, [socket, load]);

  const onActivity = useCallback(() => {
    load();
    refreshCounts();
  }, [load, refreshCounts]);

  return (
    <div className="container-page py-6">
      <div className="card grid h-[calc(100vh-8.5rem)] min-h-[480px] overflow-hidden md:grid-cols-[320px_1fr]">
        <aside className={`flex flex-col border-r border-black/5 ${id ? 'hidden md:flex' : 'flex'}`}>
          <h1 className="border-b border-black/5 px-4 py-3 text-2xl font-bold">Messages</h1>
          <div className="flex-1 overflow-y-auto">
            {conversations === null && <Spinner />}
            {conversations?.length === 0 && (
              <div className="p-4">
                <EmptyState title="No conversations yet" action={<Link to="/animals" className="btn-primary">Browse animals</Link>}>
                  Open an animal's page and tap “Message shelter” to start chatting.
                </EmptyState>
              </div>
            )}
            {conversations?.map((c) => (
              <button key={c._id} onClick={() => navigate(`/messages/${c._id}`)} className={`flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-cream ${c._id === id ? 'bg-sand/70' : ''}`}>
                <Avatar user={c.otherUser} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-bold text-forest">{displayName(c.otherUser)}</span>
                    <span className="shrink-0 text-[11px] text-muted">{c.lastMessageAt ? timeAgo(c.lastMessageAt) : ''}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className={`truncate text-xs ${c.unreadCount ? 'font-bold text-ink' : 'text-muted'}`}>
                      {c.animal ? `${c.animal.name} · ` : ''}
                      {c.lastMessage?.text || 'No messages yet'}
                    </span>
                    {c.unreadCount > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-clay px-1 text-[10px] font-extrabold text-white">{c.unreadCount}</span>}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </aside>
        <section className={`${id ? 'flex' : 'hidden md:flex'} min-h-0 flex-col`}>
          {id ? (
            <ChatWindow key={id} conversationId={id} onBack={() => navigate('/messages')} onActivity={onActivity} />
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center text-muted">
              <div>
                <p className="text-5xl">💬</p>
                <p className="mt-2">Select a conversation</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
