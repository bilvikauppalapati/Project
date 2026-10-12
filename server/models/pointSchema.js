const mongoose = require('mongoose');

/**
 * A GeoJSON Point, the format MongoDB's 2dsphere index understands:
 *   { type: 'Point', coordinates: [longitude, latitude] }
 * Note the order: longitude first.
 */
const pointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (c) => c.length === 2 && c[0] >= -180 && c[0] <= 180 && c[1] >= -90 && c[1] <= 90,
        message: 'coordinates must be [lng, lat]',
      },
    },
  },
  { _id: false }
);

module.exports = pointSchema;
