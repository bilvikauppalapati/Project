const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { loadUser } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const { sendMessage, markConversationRead, loadConversation } = require('../utils/chat');
const { setIO, userRoom, conversationRoom, markOnline, markOffline, emitToUser } = require('../utils/realtime');

async function authenticate(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Not logged in'));
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await loadUser(payload.id);
    if (!user) return next(new Error('User no longer exists'));
    socket.user = user;
    socket.data.userId = String(user._id);
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
}

const reply = (ack, data) => typeof ack === 'function' && ack(data);
const fail = (ack, err) => reply(ack, { ok: false, error: err.statusCode ? err.message : 'Something went wrong' });

async function broadcastPresence(userId, online) {
  const conversations = await Conversation.find({ participants: userId }).select('participants').lean();
  const contacts = new Set();
  for (const c of conversations) for (const p of c.participants) if (String(p) !== String(userId)) contacts.add(String(p));
  for (const contact of contacts) emitToUser(contact, 'presence', { userId: String(userId), online });
}

function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
  });
  setIO(io);
  io.use(authenticate);

  io.on('connection', (socket) => {
    const user = socket.user;
    socket.join(userRoom(String(user._id)));
    if (markOnline(user._id)) broadcastPresence(user._id, true).catch(() => {});

    socket.on('conversation:join', async (conversationId, ack) => {
      try {
        await loadConversation(conversationId, user);
        socket.join(conversationRoom(conversationId));
        reply(ack, { ok: true });
      } catch (err) {
        fail(ack, err);
      }
    });

    socket.on('conversation:leave', (conversationId) => socket.leave(conversationRoom(conversationId)));

    socket.on('message:send', async ({ conversationId, text } = {}, ack) => {
      try {
        const message = await sendMessage(user, conversationId, text);
        reply(ack, { ok: true, message });
      } catch (err) {
        fail(ack, err);
      }
    });

    socket.on('conversation:read', async (conversationId, ack) => {
      try {
        await markConversationRead(user, conversationId);
        reply(ack, { ok: true });
      } catch (err) {
        fail(ack, err);
      }
    });

    socket.on('typing', ({ conversationId, isTyping } = {}) => {
      if (!socket.rooms.has(conversationRoom(conversationId))) return;
      socket.to(conversationRoom(conversationId)).emit('typing', {
        conversationId,
        userId: String(user._id),
        name: user.name,
        isTyping: Boolean(isTyping),
      });
    });

    socket.on('disconnect', () => {
      if (markOffline(user._id)) broadcastPresence(user._id, false).catch(() => {});
    });
  });

  return io;
}

module.exports = { initSocket };
