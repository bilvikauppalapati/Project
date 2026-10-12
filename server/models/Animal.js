const mongoose = require('mongoose');
const pointSchema = require('./pointSchema');
const {
  SPECIES,
  SIZES,
  GENDERS,
  ACTIVITY_LEVELS,
  TEMPERAMENT_TAGS,
  LISTING_TYPES,
  ANIMAL_STATUSES,
} = require('../utils/constants');

const vaccinationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    date: Date,
  },
  { _id: false }
);

const healthRecordsSchema = new mongoose.Schema(
  {
    vaccinated: { type: Boolean, default: false },
    vaccinations: [vaccinationSchema],
    sterilised: { type: Boolean, default: false },
    dewormed: { type: Boolean, default: false },
    medicalNotes: { type: String, maxlength: 2000 },
    specialNeeds: { type: String, maxlength: 1000 },
  },
  { _id: false }
);

const animalSchema = new mongoose.Schema(
  {
    shelter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 60 },
    species: { type: String, enum: SPECIES, required: [true, 'Species is required'] },
    breed: { type: String, trim: true, default: 'Mixed', maxlength: 60 },
    ageMonths: { type: Number, required: [true, 'Age is required'], min: 0, max: 360 },
    size: { type: String, enum: SIZES, required: [true, 'Size is required'] },
    gender: { type: String, enum: GENDERS, required: [true, 'Gender is required'] },
    color: { type: String, trim: true, maxlength: 60 },
    description: { type: String, maxlength: 3000 },
    photos: [String],
    temperamentTags: [{ type: String, enum: TEMPERAMENT_TAGS }],
    activityLevel: { type: String, enum: ACTIVITY_LEVELS, default: 'medium' },
    healthRecords: { type: healthRecordsSchema, default: () => ({}) },
    listingType: { type: String, enum: LISTING_TYPES, default: 'adoption' },
    status: { type: String, enum: ANIMAL_STATUSES, default: 'available' },
    location: { type: pointSchema, required: [true, 'Location is required'] },
    city: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

animalSchema.index({ location: '2dsphere' });
animalSchema.index({ isActive: 1, status: 1, species: 1, size: 1 });
animalSchema.index({ shelter: 1, createdAt: -1 });

module.exports = mongoose.model('Animal', animalSchema);
