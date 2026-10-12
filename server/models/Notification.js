const mongoose = require('mongoose');
const { NOTIFICATION_TYPES } = require('../utils/constants');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: 'system' },
    title: { type: String, required: true, maxlength: 120 },
    message: { type: String, maxlength: 500 },
    link: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
