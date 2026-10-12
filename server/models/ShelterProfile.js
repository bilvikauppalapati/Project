const mongoose = require('mongoose');
const pointSchema = require('./pointSchema');
const { SHELTER_TYPES } = require('../utils/constants');

const shelterProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    organisationName: { type: String, required: [true, 'Organisation name is required'], trim: true, maxlength: 120 },
    type: { type: String, enum: SHELTER_TYPES, default: 'shelter' },
    description: { type: String, maxlength: 2000 },
    address: { type: String, maxlength: 300 },
    city: { type: String, trim: true },
    location: { type: pointSchema, required: [true, 'Location is required'] },
    contactEmail: { type: String, lowercase: true, trim: true },
    contactPhone: { type: String, trim: true, maxlength: 20 },
    website: { type: String, maxlength: 200 },
    isVerified: { type: Boolean, default: false },
    verifiedAt: Date,
    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    adoptionCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

shelterProfileSchema.index({ location: '2dsphere' });
shelterProfileSchema.index({ isVerified: 1, averageRating: -1 });

module.exports = mongoose.model('ShelterProfile', shelterProfileSchema);
