const User = require('../models/User');
const ShelterProfile = require('../models/ShelterProfile');
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
  const [roles, animals, applications, checkIns, verified, pending, reviews, inactive] = await Promise.all([
    groupCount(User, 'role'),
    groupCount(Animal, 'status', { isActive: true }),
    groupCount(Application, 'status'),
    groupCount(CheckIn, 'status'),
    ShelterProfile.countDocuments({ isVerified: true }),
    ShelterProfile.countDocuments({ isVerified: false }),
    Review.countDocuments(),
    Animal.countDocuments({ isActive: false }),
  ]);

  const a = countBy(animals);
  res.json({
    success: true,
    users: countBy(roles),
    shelters: { verified, pending },
    animals: a,
    inactiveListings: inactive,
    adoptions: (a.adopted || 0) + (a.fostered || 0),
    applications: countBy(applications),
    checkIns: countBy(checkIns),
    reviews,
  });
};

exports.recentActivity = async (req, res) => {
  const [users, applications, completed, reviews] = await Promise.all([
    User.find().sort({ createdAt: -1 }).limit(6).select('name role createdAt'),
    Application.find().sort({ createdAt: -1 }).limit(6).populate('adopter', 'name').populate('animal', 'name').select('adopter animal type createdAt status'),
    Application.find({ status: 'completed' }).sort({ completedAt: -1 }).limit(6).populate('adopter', 'name').populate('animal', 'name').select('adopter animal type completedAt'),
    Review.find().sort({ createdAt: -1 }).limit(6).populate('adopter', 'name').select('adopter rating createdAt shelter'),
  ]);

  const events = [
    ...users.map((u) => ({ type: 'user', at: u.createdAt, text: `${u.name} joined as ${u.role === 'shelter' ? 'a shelter' : `an ${u.role}`}` })),
    ...applications.map((a) => ({ type: 'application', at: a.createdAt, text: `${a.adopter?.name} applied to ${a.type === 'foster' ? 'foster' : 'adopt'} ${a.animal?.name}`, link: `/applications/${a._id}` })),
    ...completed.map((a) => ({ type: 'adoption', at: a.completedAt, text: `${a.animal?.name} was ${a.type === 'foster' ? 'fostered' : 'adopted'} by ${a.adopter?.name}` })),
    ...reviews.map((r) => ({ type: 'review', at: r.createdAt, text: `${r.adopter?.name} left a ${r.rating}-star review`, link: `/shelters/${r.shelter}` })),
  ]
    .filter((e) => e.at)
    .sort((x, y) => new Date(y.at) - new Date(x.at))
    .slice(0, 12);

  res.json({ success: true, events });
};

exports.listShelters = async (req, res) => {
  const filter = {};
  if (req.query.status === 'pending') filter.isVerified = false;
  if (req.query.status === 'verified') filter.isVerified = true;
  if (req.query.q) {
    const rx = { $regex: escapeRegex(req.query.q), $options: 'i' };
    filter.$or = [{ organisationName: rx }, { contactEmail: rx }, { city: rx }];
  }
  const { page, limit, skip } = pagination(req.query, 20);

  const [shelters, total] = await Promise.all([
    ShelterProfile.find(filter).sort({ isVerified: 1, createdAt: -1 }).skip(skip).limit(limit).populate('user', 'name email phone').lean(),
    ShelterProfile.countDocuments(filter),
  ]);

  const listed = await Animal.aggregate([
    { $match: { shelter: { $in: shelters.map((s) => s.user._id) }, isActive: true } },
    { $group: { _id: '$shelter', count: { $sum: 1 } } },
  ]);
  const listedBy = Object.fromEntries(listed.map((r) => [String(r._id), r.count]));
  for (const s of shelters) s.animalCount = listedBy[String(s.user._id)] || 0;

  res.json({ success: true, shelters, page, limit, total, totalPages: Math.ceil(total / limit) });
};

exports.verifyShelter = async (req, res) => {
  assertId(req.params.id, 'shelter id');
  const verified = req.body?.verified === undefined ? true : toBool(req.body.verified);

  const profile = await ShelterProfile.findOne({ $or: [{ user: req.params.id }, { _id: req.params.id }] });
  if (!profile) throw new AppError('Shelter not found', 404);

  profile.isVerified = verified;
  profile.verifiedAt = verified ? new Date() : undefined;
  await profile.save();

  await notify(profile.user, {
    type: 'verification',
    title: verified ? 'Your profile is verified!' : 'Verification removed',
    body: verified
      ? 'A PawShare admin verified your profile. Adopters will now see a verified badge.'
      : req.body?.note || 'An admin removed your verified badge. Contact support for details.',
    link: `/shelters/${profile.user}`,
    email: true,
  });

  res.json({ success: true, shelter: profile });
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
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('shelterProfile', 'organisationName isVerified'),
    User.countDocuments(filter),
  ]);
  res.json({ success: true, users, page, limit, total, totalPages: Math.ceil(total / limit) });
};

exports.listAnimals = async (req, res) => {
  const filter = {};
  if (req.query.active === 'true') filter.isActive = true;
  if (req.query.active === 'false') filter.isActive = false;
  if (req.query.q) filter.name = { $regex: escapeRegex(req.query.q), $options: 'i' };
  const { page, limit, skip } = pagination(req.query, 20);
  const [animals, total] = await Promise.all([
    Animal.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('name species status isActive photos createdAt shelter')
      .populate({ path: 'shelter', select: 'name', populate: { path: 'shelterProfile', select: 'organisationName' } }),
    Animal.countDocuments(filter),
  ]);
  res.json({ success: true, animals, page, limit, total, totalPages: Math.ceil(total / limit) });
};

exports.runReminders = async (req, res) => {
  const result = await runCheckInJobs();
  res.json({ success: true, ...result });
};
