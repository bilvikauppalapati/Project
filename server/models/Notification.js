const mongoose = require('mongoose');
const { NOTIFICATION_TYPES } = require('../utils/constants');

// An entry in a user's bell-icon notification list.
const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: 'system' },
    title: { type: String, required: true, maxlength: 120 },
    message: { type: String, maxlength: 500 },
    link: String, // frontend route to open when clicked, e.g. /applications/123
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
