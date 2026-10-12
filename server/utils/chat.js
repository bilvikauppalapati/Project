const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const AppError = require('./AppError');
const { assertId } = require('./validate');
const { notify } = require('./notify');
const { emitToUser, isOnline, isUserInConversation } = require('./realtime');

const MAX_LENGTH = 2000;

async function loadConversation(conversationId, user) {
  assertId(conversationId, 'conversation id');
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new AppError('Conversation not found', 404);
  if (!conversation.participants.some((p) => p.equals(user._id))) {
    throw new AppError('You are not part of this conversation', 403);
  }
  return conversation;
}

async function sendMessage(user, conversationId, rawText) {
  const text = String(rawText ?? '').trim();
  if (!text) throw new AppError('Message cannot be empty', 400);
  if (text.length > MAX_LENGTH) throw new AppError(`Message is too long (max ${MAX_LENGTH} characters)`, 400);

  const conversation = await loadConversation(conversationId, user);
  const recipients = conversation.participants.filter((p) => !p.equals(user._id));

  const message = await Message.create({
    conversation: conversation._id,
    sender: user._id,
    text,
    readBy: [user._id],
  });

  const inc = Object.fromEntries(recipients.map((r) => [`unread.${r}`, 1]));
  const updated = await Conversation.findByIdAndUpdate(
    conversation._id,
    { $set: { lastMessage: { text, sender: user._id }, lastMessageAt: message.createdAt }, $inc: inc },
    { returnDocument: 'after' }
  );

  const payload = { message: message.toObject(), conversationId: String(conversation._id) };
  for (const participant of conversation.participants) {
    emitToUser(participant, 'message:new', { ...payload, unread: updated.unread.get(String(participant)) || 0 });
  }

  for (const recipient of recipients) {
    if (await isUserInConversation(recipient, conversation._id)) continue;
    await notify(recipient, {
      type: 'message',
      title: `New message from ${user.shelterProfile?.organisationName || user.name}`,
      body: text.length > 80 ? `${text.slice(0, 77)}...` : text,
      link: `/messages/${conversation._id}`,
    });
  }

  return message;
}

async function markConversationRead(user, conversationId) {
  const conversation = await loadConversation(conversationId, user);

  await Promise.all([
    Conversation.updateOne({ _id: conversation._id }, { $set: { [`unread.${user._id}`]: 0 } }),
    Message.updateMany({ conversation: conversation._id, readBy: { $ne: user._id } }, { $addToSet: { readBy: user._id } }),
  ]);

  for (const participant of conversation.participants) {
    emitToUser(participant, 'conversation:read', { conversationId: String(conversation._id), readerId: String(user._id) });
  }
}

function serializeConversation(conversation, userId) {
  const c = conversation.toObject ? conversation.toObject({ virtuals: true }) : conversation;
  const other = (c.participants || []).find((p) => String(p._id || p) !== String(userId));
  const unread = c.unread instanceof Map ? c.unread.get(String(userId)) : c.unread?.[String(userId)];
  return {
    _id: c._id,
    animal: c.animal,
    lastMessage: c.lastMessage,
    lastMessageAt: c.lastMessageAt,
    createdAt: c.createdAt,
    participants: c.participants,
    otherUser: other ? { ...other, online: isOnline(other._id || other) } : null,
    unreadCount: unread || 0,
  };
}

module.exports = { loadConversation, sendMessage, markConversationRead, serializeConversation };
