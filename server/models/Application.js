const mongoose = require('mongoose');
const { APPLICATION_TYPES, APPLICATION_STATUSES, HOME_TYPES, EXPERIENCE_LEVELS } = require('../utils/constants');

// Lifestyle questionnaire the adopter fills in when applying.
const questionnaireSchema = new mongoose.Schema(
  {
    homeType: { type: String, enum: HOME_TYPES, required: [true, 'Home type is required'] },
    hasYard: { type: Boolean, default: false },
    otherPets: { type: String, maxlength: 300, default: 'None' }, // e.g. "1 cat, 8 years old"
    hasKids: { type: Boolean, default: false },
    kidsAges: { type: String, maxlength: 100 },
    experience: { type: String, enum: EXPERIENCE_LEVELS, required: [true, 'Experience is required'] },
    workHoursPerDay: { type: Number, min: 0, max: 24, required: [true, 'Work hours are required'] },
    reason: { type: String, maxlength: 2000 }, // "Why do you want to adopt?"
  },
  { _id: false }
);

// One entry per status change, so the adopter can see a timeline.
const timelineSchema = new mongoose.Schema(
  {
    status: { type: String, enum: APPLICATION_STATUSES, required: true },
    note: String,
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    animal: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal', required: true },
    adopter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    shelter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: APPLICATION_TYPES, default: 'adoption' },
    questionnaire: { type: questionnaireSchema, required: true },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'submitted' },
    timeline: [timelineSchema],
    shelterNote: { type: String, maxlength: 1000 }, // reason for approval/rejection
    matchScore: Number, // match % at the time of applying (shown to the shelter)
    completedAt: Date,
  },
  { timestamps: true }
);

applicationSchema.index({ adopter: 1, createdAt: -1 });
applicationSchema.index({ shelter: 1, status: 1 });
applicationSchema.index({ animal: 1, adopter: 1 });

module.exports = mongoose.model('Application', applicationSchema);
