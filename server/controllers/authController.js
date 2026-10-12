const User = require('../models/User');
const ShelterProfile = require('../models/ShelterProfile');
const AppError = require('../utils/AppError');
const { signToken } = require('../utils/token');
const { loadUser } = require('../middleware/auth');
const { requireFields, isEmail, toGeoPoint, assertPassword } = require('../utils/validate');
const { toBool, toNum } = require('../utils/parse');
const { SHELTER_TYPES, SPECIES, SIZES, ACTIVITY_LEVELS, HOME_TYPES, EXPERIENCE_LEVELS, PET_TYPES } = require('../utils/constants');

async function sendAuth(res, userId, status = 200) {
  const user = await loadUser(userId);
  res.status(status).json({ success: true, token: signToken(user), user });
}

exports.register = async (req, res) => {
  const body = req.body || {};
  requireFields(body, ['name', 'email', 'password']);

  const role = body.role || 'adopter';
  if (!['adopter', 'shelter'].includes(role)) throw new AppError('Role must be adopter or shelter', 400);
  if (!isEmail(body.email)) throw new AppError('Please enter a valid email address', 400);
  assertPassword(body.password);

  const location = toGeoPoint(body.lat, body.lng);
  if (role === 'shelter' && !location) throw new AppError('Shelters must provide a location (lat and lng)', 400);

  const email = String(body.email).toLowerCase().trim();
  if (await User.exists({ email })) throw new AppError('An account with this email already exists', 409);

  const user = await User.create({
    name: body.name,
    email,
    password: body.password,
    role,
    phone: body.phone,
    city: body.city,
    location,
  });

  if (role === 'shelter') {
    try {
      await ShelterProfile.create({
        user: user._id,
        organisationName: body.organisationName || body.name,
        type: SHELTER_TYPES.includes(body.shelterType) ? body.shelterType : 'shelter',
        description: body.description,
        address: body.address,
        city: body.city,
        location,
        contactEmail: body.contactEmail || email,
        contactPhone: body.contactPhone || body.phone,
        website: body.website,
      });
    } catch (err) {
      await user.deleteOne();
      throw err;
    }
  }

  await sendAuth(res, user._id, 201);
};

exports.login = async (req, res) => {
  const body = req.body || {};
  requireFields(body, ['email', 'password']);

  const user = await User.findOne({ email: String(body.email).toLowerCase().trim() }).select('+password');
  if (!user || !(await user.comparePassword(String(body.password)))) {
    throw new AppError('Incorrect email or password', 401);
  }

  await sendAuth(res, user._id);
};

exports.getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

function cleanPreferences(input = {}) {
  const prefs = {};
  if (Array.isArray(input.species)) prefs.species = input.species.filter((s) => SPECIES.includes(s));
  if (Array.isArray(input.sizes)) prefs.sizes = input.sizes.filter((s) => SIZES.includes(s));
  if (Array.isArray(input.otherPetTypes)) prefs.otherPetTypes = input.otherPetTypes.filter((s) => PET_TYPES.includes(s));
  for (const flag of ['hasKids', 'hasOtherPets', 'hasYard']) {
    if (input[flag] !== undefined) prefs[flag] = toBool(input[flag]);
  }
  if (ACTIVITY_LEVELS.includes(input.activityLevel)) prefs.activityLevel = input.activityLevel;
  if (HOME_TYPES.includes(input.homeType)) prefs.homeType = input.homeType;
  if (EXPERIENCE_LEVELS.includes(input.experience)) prefs.experience = input.experience;
  if (input.maxDistanceKm !== undefined) prefs.maxDistanceKm = toNum(input.maxDistanceKm);
  if (input.ageRange) {
    const min = toNum(input.ageRange.min);
    const max = toNum(input.ageRange.max);
    if (min !== undefined && max !== undefined && min > max) throw new AppError('Minimum age cannot be more than maximum age', 400);
    prefs.ageRange = { min, max };
  }
  if (prefs.hasOtherPets === false) prefs.otherPetTypes = [];
  return prefs;
}

exports.updateMe = async (req, res) => {
  const body = req.body || {};
  const user = await User.findById(req.user._id);

  for (const field of ['name', 'phone', 'city', 'avatar']) {
    if (body[field] !== undefined) user[field] = body[field];
  }

  const location = toGeoPoint(body.lat, body.lng);
  if (location) user.location = location;

  if (body.preferences && user.role === 'adopter') {
    user.preferences = { ...user.preferences.toObject(), ...cleanPreferences(body.preferences) };
  }
  await user.save();

  if (user.role === 'shelter') {
    const profile = await ShelterProfile.findOne({ user: user._id });
    const input = body.shelterProfile || {};
    for (const field of ['organisationName', 'type', 'description', 'address', 'contactEmail', 'contactPhone', 'website']) {
      if (input[field] !== undefined) profile[field] = input[field];
    }
    if (body.city !== undefined) profile.city = body.city;
    if (location) profile.location = location;
    await profile.save();
  }

  await sendAuth(res, user._id);
};

exports.changePassword = async (req, res) => {
  const body = req.body || {};
  requireFields(body, ['currentPassword', 'newPassword']);
  assertPassword(body.newPassword);

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(String(body.currentPassword)))) {
    throw new AppError('Current password is incorrect', 401);
  }

  user.password = body.newPassword;
  await user.save();
  await sendAuth(res, user._id);
};
