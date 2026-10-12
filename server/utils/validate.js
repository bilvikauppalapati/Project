const mongoose = require('mongoose');
const AppError = require('./AppError');

function requireFields(body, fields) {
  const missing = fields.filter((f) => body[f] === undefined || body[f] === null || String(body[f]).trim() === '');
  if (missing.length) {
    throw new AppError(`Missing required field(s): ${missing.join(', ')}`, 400, { missing });
  }
}

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

function assertId(id, label = 'id') {
  if (!isValidId(id)) throw new AppError(`Invalid ${label}`, 400);
}

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
