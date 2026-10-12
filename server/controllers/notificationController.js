const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');
const { assertId } = require('../utils/validate');
const { toBool, pagination } = require('../utils/parse');
const { emitToUser } = require('../utils/realtime');

exports.listNotifications = async (req, res) => {
  const filter = { user: req.user._id };
  if (toBool(req.query.unread)) filter.isRead = false;
  const { page, limit, skip } = pagination(req.query, 20);

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.user._id, isRead: false }),
  ]);

  res.json({ success: true, notifications, unreadCount, page, limit, total, totalPages: Math.ceil(total / limit) });
};

exports.markRead = async (req, res) => {
  assertId(req.params.id, 'notification id');
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { isRead: true },
    { returnDocument: 'after' }
  );
  if (!notification) throw new AppError('Notification not found', 404);
  emitToUser(req.user._id, 'notification:read', { id: String(notification._id) });
  res.json({ success: true, notification });
};

exports.markAllRead = async (req, res) => {
  const result = await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  emitToUser(req.user._id, 'notification:read', { all: true });
  res.json({ success: true, updated: result.modifiedCount });
};

exports.deleteNotification = async (req, res) => {
  assertId(req.params.id, 'notification id');
  const result = await Notification.deleteOne({ _id: req.params.id, user: req.user._id });
  if (!result.deletedCount) throw new AppError('Notification not found', 404);
  res.json({ success: true });
};
