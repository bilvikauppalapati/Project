const mongoose = require('mongoose');
const { CHECKIN_STATUSES } = require('../utils/constants');

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

const checkInSchema = new mongoose.Schema(
  {
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true },
    animal: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal', required: true },
    adopter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    shelter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    label: { type: String, required: true },
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
