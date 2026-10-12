const User = require('../models/User');
const AppError = require('../utils/AppError');
const { signToken } = require('../utils/token');
const { requireFields, isEmail, toGeoPoint } = require('../utils/validate');
const { SHELTER_KINDS, SPECIES, SIZES, ENERGY_LEVELS, HOME_TYPES, EXPERIENCE_LEVELS } = require('../utils/constants');

function sendAuth(res, user, status = 200) {
  res.status(status).json({ success: true, token: signToken(user), user });
}

exports.register = async (req, res) => {
  const body = req.body || {};
  requireFields(body, ['name', 'email', 'password']);

  const role = body.role || 'adopter';
  if (!['adopter', 'shelter'].includes(role)) throw new AppError('Role must be adopter or shelter', 400);
  if (!isEmail(body.email)) throw new AppError('Please enter a valid email address', 400);
  if (String(body.password).length < 6) throw new AppError('Password must be at least 6 characters', 400);

  const location = toGeoPoint(body.lat, body.lng);
  if (role === 'shelter' && !location) throw new AppError('Shelters must provide a location (lat and lng)', 400);

  const exists = await User.exists({ email: String(body.email).toLowerCase().trim() });
  if (exists) throw new AppError('An account with this email already exists', 409);

  const user = await User.create({
    name: body.name,
    email: body.email,
    password: body.password,
    role,
    phone: body.phone,
    city: body.city,
    location,
    shelter:
      role === 'shelter'
        ? {
            kind: SHELTER_KINDS.includes(body.shelterKind) ? body.shelterKind : 'organisation',
            orgName: body.orgName || body.name,
            description: body.description,
            address: body.address,
          }
        : undefined,
  });

  sendAuth(res, user, 201);
};

exports.login = async (req, res) => {
  const body = req.body || {};
  requireFields(body, ['email', 'password']);

  const user = await User.findOne({ email: String(body.email).toLowerCase().trim() }).select('+password');

  if (!user || !(await user.comparePassword(String(body.password)))) {
    throw new AppError('Incorrect email or password', 401);
  }

  sendAuth(res, user);
};

exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

function cleanPreferences(input = {}) {
  const prefs = {};
  if (Array.isArray(input.species)) prefs.species = input.species.filter((s) => SPECIES.includes(s));
  if (Array.isArray(input.sizes)) prefs.sizes = input.sizes.filter((s) => SIZES.includes(s));
  for (const flag of ['hasKids', 'hasDogs', 'hasCats']) {
    if (input[flag] !== undefined) prefs[flag] = Boolean(input[flag]);
  }
  if (ENERGY_LEVELS.includes(input.activityLevel)) prefs.activityLevel = input.activityLevel;
  if (HOME_TYPES.includes(input.homeType)) prefs.homeType = input.homeType;
  if (EXPERIENCE_LEVELS.includes(input.experience)) prefs.experience = input.experience;
  if (input.maxDistanceKm !== undefined) prefs.maxDistanceKm = Number(input.maxDistanceKm);
  return prefs;
}

exports.updateMe = async (req, res) => {
  const body = req.body || {};
  const user = req.user;

  for (const field of ['name', 'phone', 'city', 'avatar']) {
    if (body[field] !== undefined) user[field] = body[field];
  }

  const location = toGeoPoint(body.lat, body.lng);
  if (location) user.location = location;

  if (body.preferences && user.role === 'adopter') {
    user.preferences = { ...user.preferences.toObject(), ...cleanPreferences(body.preferences) };
  }

  if (user.role === 'shelter' && body.shelter) {
    const s = body.shelter;
    for (const field of ['kind', 'orgName', 'description', 'address', 'website']) {
      if (s[field] !== undefined) user.shelter[field] = s[field];
    }
  }

  await user.save();
  res.json({ success: true, user });
};

exports.changePassword = async (req, res) => {
  const body = req.body || {};
  requireFields(body, ['currentPassword', 'newPassword']);
  if (String(body.newPassword).length < 6) throw new AppError('New password must be at least 6 characters', 400);

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(String(body.currentPassword)))) {
    throw new AppError('Current password is incorrect', 401);
  }

  user.password = body.newPassword;
  await user.save();
  sendAuth(res, user);
};
