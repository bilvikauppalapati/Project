const mongoose = require('mongoose');
const { CHECKIN_STATUSES } = require('../utils/constants');

// The adopter's health update, filled in when they complete a check-in.
const updateSchema = new mongoose.Schema(
  {
    notes: { type: String, maxlength: 2000 },
    weightKg: { type: Number, min: 0, max: 200 },
    photo: String,
    vetVisit: { type: Boolean, default: false },
    vetNotes: { type: String, maxlength: 1000 },
    wellbeing: { type: String, enum: ['great', 'good', 'concerns'], default: 'good' },
  },
  { _id: false }
);

/**
 * A scheduled post-adoption check-in (1 week, 1 month, 3 months after adoption).
 * Created automatically when an application is marked "completed".
 * A daily cron job (utils/cron.js) marks check-ins as due and sends reminders.
 */
const checkInSchema = new mongoose.Schema(
  {
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
    animal: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal', required: true },
    adopter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    shelter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    label: { type: String, required: true }, // "1 week", "1 month", "3 months"
    dueDate: { type: Date, required: true },
    status: { type: String, enum: CHECKIN_STATUSES, default: 'upcoming' },
    reminderSentAt: Date,
    update: updateSchema,
    completedAt: Date,
  },
  { timestamps: true }
);

checkInSchema.index({ status: 1, dueDate: 1 });
checkInSchema.index({ adopter: 1, dueDate: 1 });
checkInSchema.index({ shelter: 1, dueDate: -1 });

module.exports = mongoose.model('CheckIn', checkInSchema);
