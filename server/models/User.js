const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const pointSchema = require('./pointSchema');
const { ROLES, SPECIES, SIZES, ENERGY_LEVELS, HOME_TYPES, EXPERIENCE_LEVELS } = require('../utils/constants');

/**
 * One collection for all three roles (adopter, shelter, admin).
 * Role-specific data lives in `preferences` (adopters) and `shelter` (shelters).
 */

// An adopter's lifestyle, used by the matching algorithm (utils/matching.js).
const preferencesSchema = new mongoose.Schema(
  {
    species: [{ type: String, enum: SPECIES }], // empty = any species
    sizes: [{ type: String, enum: SIZES }], // empty = any size
    hasKids: { type: Boolean, default: false },
    hasDogs: { type: Boolean, default: false },
    hasCats: { type: Boolean, default: false },
    activityLevel: { type: String, enum: ENERGY_LEVELS, default: 'medium' },
    homeType: { type: String, enum: HOME_TYPES },
    experience: { type: String, enum: EXPERIENCE_LEVELS, default: 'none' },
    maxDistanceKm: { type: Number, min: 1, max: 500, default: 25 },
  },
  { _id: false }
);

// Public profile info for shelters / caregivers.
const shelterSchema = new mongoose.Schema(
  {
    orgName: { type: String, trim: true, maxlength: 120 },
    description: { type: String, maxlength: 2000 },
    address: { type: String, maxlength: 300 },
    website: { type: String, maxlength: 200 },
    isVerified: { type: Boolean, default: false }, // set by an admin
    verifiedAt: Date,
    // Kept up to date by Review.calcShelterRating() so profile pages don't need to recompute.
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email is not valid'],
    },
    // select: false means the hash is never returned by queries unless explicitly asked for.
    password: { type: String, required: [true, 'Password is required'], minlength: 6, select: false },
    role: { type: String, enum: ROLES, default: 'adopter' },
    phone: { type: String, trim: true, maxlength: 20 },
    avatar: String,
    city: { type: String, trim: true },
    location: pointSchema,
    preferences: { type: preferencesSchema, default: () => ({}) },
    shelter: shelterSchema,
    favourites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Animal' }],
  },
  { timestamps: true }
);

// 2dsphere index enables "shelters near me" queries on the map.
userSchema.index({ location: '2dsphere' });
userSchema.index({ role: 1, 'shelter.isVerified': 1 });

// Hash the password whenever it is set or changed. Plain-text passwords are never stored.
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10); // 10 salt rounds
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Strip private fields whenever a user is sent as JSON.
userSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
