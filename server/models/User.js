const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const pointSchema = require('./pointSchema');
const { ROLES, SPECIES, SIZES, ACTIVITY_LEVELS, HOME_TYPES, EXPERIENCE_LEVELS, PET_TYPES } = require('../utils/constants');

const preferencesSchema = new mongoose.Schema(
  {
    species: [{ type: String, enum: SPECIES }],
    sizes: [{ type: String, enum: SIZES }],
    ageRange: {
      min: { type: Number, min: 0, max: 30 },
      max: { type: Number, min: 0, max: 30 },
    },
    hasKids: { type: Boolean, default: false },
    hasOtherPets: { type: Boolean, default: false },
    otherPetTypes: [{ type: String, enum: PET_TYPES }],
    homeType: { type: String, enum: HOME_TYPES, default: 'apartment' },
    hasYard: { type: Boolean, default: false },
    activityLevel: { type: String, enum: ACTIVITY_LEVELS, default: 'medium' },
    experience: { type: String, enum: EXPERIENCE_LEVELS, default: 'none' },
    maxDistanceKm: { type: Number, min: 1, max: 500, default: 25 },
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
    password: { type: String, required: [true, 'Password is required'], minlength: 8, select: false },
    role: { type: String, enum: ROLES, default: 'adopter' },
    phone: { type: String, trim: true, maxlength: 20 },
    avatar: String,
    city: { type: String, trim: true },
    location: pointSchema,
    preferences: { type: preferencesSchema, default: () => ({}) },
    favourites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Animal' }],
  },
  { timestamps: true }
);

userSchema.index({ location: '2dsphere' });

userSchema.virtual('shelterProfile', {
  ref: 'ShelterProfile',
  localField: '_id',
  foreignField: 'user',
  justOne: true,
});

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    delete ret.password;
    delete ret.__v;
    delete ret.id;
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
