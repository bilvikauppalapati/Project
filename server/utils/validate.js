const mongoose = require('mongoose');
const AppError = require('./AppError');

/**
 * Small validation helpers used by controllers.
 * Mongoose schemas do the final validation; these give earlier, clearer messages.
 */

// Throws a 400 listing every field in `fields` that is missing/empty in `body`.
function requireFields(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || String(body[f]).trim() === '');
  if (missing.length) {
    throw new AppError(`Missing required field(s): ${missing.join(', ')}`, 400, { missing });
  }
}

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Throws a 400 if `id` is not a valid MongoDB ObjectId.
function assertId(id, label = 'id') {
  if (!isValidId(id)) throw new AppError(`Invalid ${label}`, 400);
}

/**
 * Turns lat/lng input into a GeoJSON Point.
 * MongoDB stores coordinates as [longitude, latitude], the reverse of how people usually say them.
 * Returns undefined when no coordinates were given.
 */
function toGeoPoint(lat, lng) {
  if (lat === undefined || lat === '' || lng === undefined || lng === '') return undefined;
  const latN = Number(lat);
  const lngN = Number(lng);
  if (Number.isNaN(latN) || Number.isNaN(lngN) || latN < -90 || latN > 90 || lngN < -180 || lngN > 180) {
    throw new AppError('Invalid coordinates: lat must be -90..90 and lng -180..180', 400);
  }
  return { type: 'Point', coordinates: [lngN, latN] };
}

module.exports = { requireFields, isEmail, isValidId, assertId, toGeoPoint };
