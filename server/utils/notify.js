const Notification = require('../models/Notification');

async function notify(userId, { type = 'system', title, message, link }) {
  return Notification.create({ user: userId, type, title, message, link });
}

module.exports = { notify };
