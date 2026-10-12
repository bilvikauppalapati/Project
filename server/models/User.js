const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const pointSchema = require('./pointSchema');
const { ROLES, SHELTER_KINDS, SPECIES, SIZES, ENERGY_LEVELS, HOME_TYPES, EXPERIENCE_LEVELS } = require('../utils/constants');

const preferencesSchema = new mongoose.Schema(
  {
    species: [{ type: String, enum: SPECIES }],
    sizes: [{ type: String, enum: SIZES }],
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

const shelterSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: SHELTER_KINDS, default: 'organisation' },
    orgName: { type: String, trim: true, maxlength: 120 },
    description: { type: String, maxlength: 2000 },
    address: { type: String, maxlength: 300 },
    website: { type: String, maxlength: 200 },
    isVerified: { type: Boolean, default: false },
    verifiedAt: Date,
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

userSchema.index({ location: '2dsphere' });
userSchema.index({ role: 1, 'shelter.isVerified': 1 });

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
