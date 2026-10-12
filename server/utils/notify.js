const Notification = require('../models/Notification');
const User = require('../models/User');
const { emitToUser } = require('./realtime');
const { sendEmail } = require('./email');

async function notify(userId, { type = 'system', title, body, link, email = false }) {
  const notification = await Notification.create({ user: userId, type, title, body, link });
  emitToUser(userId, 'notification:new', notification);

  if (email) {
    const user = await User.findById(userId).select('name email');
    if (user?.email) {
      const url = link ? `${process.env.CLIENT_URL || 'http://localhost:5173'}${link}` : '';
      await sendEmail({
        to: user.email,
        subject: `PawShare: ${title}`,
        text: `Hi ${user.name},\n\n${body || title}\n${url ? `\nOpen PawShare: ${url}\n` : ''}\nThe PawShare team`,
      });
    }
  }
  return notification;
}

module.exports = { notify };
