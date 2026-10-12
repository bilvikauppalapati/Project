const User = require('../models/User');
const Animal = require('../models/Animal');
const Application = require('../models/Application');
const Review = require('../models/Review');
const CheckIn = require('../models/CheckIn');
const AppError = require('../utils/AppError');
const { assertId } = require('../utils/validate');
const { toBool, pagination, escapeRegex } = require('../utils/parse');
const { notify } = require('../utils/notify');
const { runCheckInJobs } = require('../utils/checkins');
const { ROLES } = require('../utils/constants');

const countBy = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.count]));
const groupCount = (Model, field, match = {}) =>
  Model.aggregate([{ $match: match }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }]);

exports.stats = async (req, res) => {
  const [roles, animals, applications, checkIns, verified, pending, reviews] = await Promise.all([
    groupCount(User, 'role'),
    groupCount(Animal, 'status'),
    groupCount(Application, 'status'),
    groupCount(CheckIn, 'status'),
    User.countDocuments({ role: 'shelter', 'shelter.isVerified': true }),
    User.countDocuments({ role: 'shelter', 'shelter.isVerified': { $ne: true } }),
    Review.countDocuments(),
  ]);

  res.json({
    success: true,
    users: countBy(roles),
    shelters: { verified, pending },
    animals: countBy(animals),
    applications: countBy(applications),
    checkIns: countBy(checkIns),
    reviews,
  });
};

exports.listShelters = async (req, res) => {
  const filter = { role: 'shelter' };
  if (req.query.status === 'pending') filter['shelter.isVerified'] = { $ne: true };
  if (req.query.status === 'verified') filter['shelter.isVerified'] = true;
  if (req.query.q) {
    const rx = { $regex: escapeRegex(req.query.q), $options: 'i' };
    filter.$or = [{ name: rx }, { email: rx }, { 'shelter.orgName': rx }, { city: rx }];
  }
  const { page, limit, skip } = pagination(req.query, 20);

  const [shelters, total] = await Promise.all([
    User.find(filter).sort({ 'shelter.isVerified': 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  const listed = await Animal.aggregate([
    { $match: { shelter: { $in: shelters.map((s) => s._id) } } },
    { $group: { _id: '$shelter', count: { $sum: 1 } } },
  ]);
  const listedBy = Object.fromEntries(listed.map((r) => [String(r._id), r.count]));
  for (const s of shelters) s.animalCount = listedBy[String(s._id)] || 0;

  res.json({ success: true, shelters, page, limit, total, totalPages: Math.ceil(total / limit) });
};

exports.verifyShelter = async (req, res) => {
  assertId(req.params.id, 'shelter id');
  const verified = req.body?.verified === undefined ? true : toBool(req.body.verified);

  const shelter = await User.findOne({ _id: req.params.id, role: 'shelter' });
  if (!shelter) throw new AppError('Shelter not found', 404);

  shelter.shelter = shelter.shelter || {};
  shelter.shelter.isVerified = verified;
  shelter.shelter.verifiedAt = verified ? new Date() : undefined;
  await shelter.save();

  await notify(shelter._id, {
    type: 'verification',
    title: verified ? 'Your profile is verified!' : 'Verification removed',
    message: verified
      ? 'A PawShare admin verified your profile. Adopters will now see a verified badge.'
      : req.body?.note || 'An admin removed your verified badge. Contact support for details.',
    link: `/shelters/${shelter._id}`,
  });

  res.json({ success: true, shelter });
};

exports.listUsers = async (req, res) => {
  const filter = {};
  if (ROLES.includes(req.query.role)) filter.role = req.query.role;
  if (req.query.q) {
    const rx = { $regex: escapeRegex(req.query.q), $options: 'i' };
    filter.$or = [{ name: rx }, { email: rx }, { city: rx }];
  }
  const { page, limit, skip } = pagination(req.query, 20);
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({ success: true, users, page, limit, total, totalPages: Math.ceil(total / limit) });
};

exports.runReminders = async (req, res) => {
  const result = await runCheckInJobs();
  res.json({ success: true, ...result });
};
