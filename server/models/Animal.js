const mongoose = require('mongoose');
const pointSchema = require('./pointSchema');
const {
  SPECIES,
  SIZES,
  GENDERS,
  ENERGY_LEVELS,
  TEMPERAMENT_TAGS,
  LISTING_TYPES,
  ANIMAL_STATUSES,
} = require('../utils/constants');

const healthSchema = new mongoose.Schema(
  {
    vaccinated: { type: Boolean, default: false },
    vaccinations: [{ type: String, trim: true }], // e.g. "Rabies", "DHPP"
    sterilised: { type: Boolean, default: false },
    dewormed: { type: Boolean, default: false },
    medicalNotes: { type: String, maxlength: 2000 },
  },
  { _id: false }
);

const animalSchema = new mongoose.Schema(
  {
    shelter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 60 },
    species: { type: String, enum: SPECIES, required: [true, 'Species is required'] },
    breed: { type: String, trim: true, default: 'Mixed', maxlength: 60 },
    // Age is stored in months so "age range" filters are simple number comparisons.
    ageMonths: { type: Number, required: [true, 'Age is required'], min: 0, max: 360 },
    size: { type: String, enum: SIZES, required: [true, 'Size is required'] },
    gender: { type: String, enum: GENDERS, required: [true, 'Gender is required'] },
    energyLevel: { type: String, enum: ENERGY_LEVELS, default: 'medium' },
    description: { type: String, maxlength: 3000 },
    photos: [String], // URLs such as /uploads/abc.jpg
    health: { type: healthSchema, default: () => ({}) },
    temperament: [{ type: String, enum: TEMPERAMENT_TAGS }],
    listingType: { type: String, enum: LISTING_TYPES, default: 'adoption' },
    status: { type: String, enum: ANIMAL_STATUSES, default: 'available' },
    location: { type: pointSchema, required: [true, 'Location is required'] },
    city: { type: String, trim: true },
  },
  { timestamps: true }
);

// Geospatial index: required for $near / $geoWithin / $geoNear distance searches.
animalSchema.index({ location: '2dsphere' });
// Speeds up the most common filters.
animalSchema.index({ status: 1, species: 1, size: 1 });
animalSchema.index({ shelter: 1, createdAt: -1 });
// Text index for the free-text search box (name, breed, description).
animalSchema.index({ name: 'text', breed: 'text', description: 'text' });

module.exports = mongoose.model('Animal', animalSchema);
