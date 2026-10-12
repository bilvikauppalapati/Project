const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Animal = require('../models/Animal');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { assertId } = require('../utils/validate');
const { toNum } = require('../utils/parse');
const { loadConversation, sendMessage, markConversationRead, serializeConversation } = require('../utils/chat');

const PARTICIPANT_FIELDS = 'name role avatar city';
const ANIMAL_FIELDS = 'name species photos status';

const populateConversation = (query) =>
  query
    .populate({ path: 'participants', select: PARTICIPANT_FIELDS, populate: { path: 'shelterProfile', select: 'organisationName type isVerified' } })
    .populate('animal', ANIMAL_FIELDS);

function canChat(a, b) {
  if (a.role === 'admin' || b.role === 'admin') return true;
  return (a.role === 'adopter' && b.role === 'shelter') || (a.role === 'shelter' && b.role === 'adopter');
}

exports.startConversation = async (req, res) => {
  const body = req.body || {};
  let recipientId = body.recipientId;
  let animal = null;

  if (body.animalId) {
    assertId(body.animalId, 'animal id');
    animal = await Animal.findById(body.animalId).select('shelter name');
    if (!animal) throw new AppError('Animal not found', 404);
    recipientId = recipientId || animal.shelter;
  }

  if (!recipientId) throw new AppError('recipientId or animalId is required', 400);
  assertId(recipientId, 'recipient id');
  if (String(recipientId) === String(req.user._id)) throw new AppError('You cannot message yourself', 400);

  const recipient = await User.findById(recipientId).select('role name');
  if (!recipient) throw new AppError('Recipient not found', 404);
  if (!canChat(req.user, recipient)) throw new AppError('Messaging is only available between adopters and shelters', 403);

  let conversation = await Conversation.findOne({
    participants: { $all: [req.user._id, recipient._id], $size: 2 },
  });

  if (!conversation) {
    conversation = await Conversation.create({ participants: [req.user._id, recipient._id], animal: animal?._id });
  } else if (animal && !animal._id.equals(conversation.animal || null)) {
    conversation.animal = animal._id;
    await conversation.save();
  }

  if (body.text) await sendMessage(req.user, conversation._id, body.text);

  const populated = await populateConversation(Conversation.findById(conversation._id));
  res.status(201).json({ success: true, conversation: serializeConversation(populated, req.user._id) });
};

exports.listConversations = async (req, res) => {
  const conversations = await populateConversation(
    Conversation.find({ participants: req.user._id }).sort({ lastMessageAt: -1, updatedAt: -1 })
  );
  res.json({ success: true, conversations: conversations.map((c) => serializeConversation(c, req.user._id)) });
};

exports.getConversation = async (req, res) => {
  const conversation = await loadConversation(req.params.id, req.user);
  const populated = await populateConversation(Conversation.findById(conversation._id));
  res.json({ success: true, conversation: serializeConversation(populated, req.user._id) });
};

exports.unreadCount = async (req, res) => {
  const [result] = await Conversation.aggregate([
    { $match: { participants: req.user._id } },
    { $group: { _id: null, total: { $sum: { $ifNull: [`$unread.${req.user._id}`, 0] } } } },
  ]);
  res.json({ success: true, unread: result?.total || 0 });
};

exports.getMessages = async (req, res) => {
  const conversation = await loadConversation(req.params.id, req.user);
  const limit = Math.min(100, Math.max(1, Math.floor(toNum(req.query.limit) || 30)));

  const filter = { conversation: conversation._id };
  if (req.query.before) {
    const before = new Date(req.query.before);
    if (Number.isNaN(before.getTime())) throw new AppError('before must be a valid date', 400);
    filter.createdAt = { $lt: before };
  }

  const newestFirst = await Message.find(filter).sort({ createdAt: -1 }).limit(limit + 1).lean();
  const hasMore = newestFirst.length > limit;
  const messages = newestFirst.slice(0, limit).reverse();

  res.json({ success: true, messages, hasMore });
};

exports.postMessage = async (req, res) => {
  const message = await sendMessage(req.user, req.params.id, req.body?.text);
  res.status(201).json({ success: true, message });
};

exports.markRead = async (req, res) => {
  await markConversationRead(req.user, req.params.id);
  res.json({ success: true });
};
