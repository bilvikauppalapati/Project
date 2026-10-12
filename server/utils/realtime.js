let io = null;
const onlineSockets = new Map();

function setIO(instance) {
  io = instance;
}

const userRoom = (userId) => `user:${userId}`;
const conversationRoom = (conversationId) => `conversation:${conversationId}`;

function emitToUser(userId, event, payload) {
  if (io) io.to(userRoom(String(userId))).emit(event, payload);
}

async function isUserInConversation(userId, conversationId) {
  if (!io) return false;
  const sockets = await io.in(conversationRoom(String(conversationId))).fetchSockets();
  return sockets.some((s) => String(s.data.userId) === String(userId));
}

function markOnline(userId) {
  const id = String(userId);
  onlineSockets.set(id, (onlineSockets.get(id) || 0) + 1);
  return onlineSockets.get(id) === 1;
}

function markOffline(userId) {
  const id = String(userId);
  const left = (onlineSockets.get(id) || 1) - 1;
  if (left <= 0) onlineSockets.delete(id);
  else onlineSockets.set(id, left);
  return left <= 0;
}

const isOnline = (userId) => onlineSockets.has(String(userId));

module.exports = { setIO, emitToUser, userRoom, conversationRoom, isUserInConversation, markOnline, markOffline, isOnline };
