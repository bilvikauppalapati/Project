const Notification = require('../models/Notification');
const { emitToUser } = require('./realtime');

async function notify(userId, { type = 'system', title, message, link }) {
  const notification = await Notification.create({ user: userId, type, title, message, link });
  emitToUser(userId, 'notification:new', notification);
  return notification;
}

module.exports = { notify };
