const mongoose = require('mongoose');
const User = require('../models/User');
const Animal = require('../models/Animal');
const Application = require('../models/Application');
const CheckIn = require('../models/CheckIn');
const Review = require('../models/Review');
const AppError = require('../utils/AppError');
const { assertId, toGeoPoint } = require('../utils/validate');
const { toBool, toNum, pagination, escapeRegex } = require('../utils/parse');
const { distanceKm } = require('../utils/geo');
const { SHELTER_KINDS } = require('../utils/constants');

const PUBLIC_FIELDS = 'name email phone city avatar location shelter createdAt';

const countBy = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.count]));

async function availableCounts(shelterIds) {
  const rows = await Animal.aggregate([
    { $match: { shelter: { $in: shelterIds }, status: 'available' } },
    { $group: { _id: '$shelter', count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [String(r._id), r.count]));
}

exports.listShelters = async (req, res) => {
  const q = req.query;
  const filter = { role: 'shelter' };
  if (toBool(q.verified)) filter['shelter.isVerified'] = true;
  if (SHELTER_KINDS.includes(q.kind)) filter['shelter.kind'] = q.kind;
  if (q.city) filter.city = { $regex: escapeRegex(q.city), $options: 'i' };
  if (q.q) {
    const rx = { $regex: escapeRegex(q.q), $options: 'i' };
    filter.$or = [{ name: rx }, { 'shelter.orgName': rx }, { city: rx }];
  }
  const { page, limit, skip } = pagination(q, 12);

  const [shelters, total] = await Promise.all([
    User.find(filter)
      .select(PUBLIC_FIELDS)
      .sort({ 'shelter.isVerified': -1, 'shelter.ratingAverage': -1, name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ]);

  const counts = await availableCounts(shelters.map((s) => s._id));
  const from = toGeoPoint(q.lat, q.lng);
  for (const s of shelters) {
    s.availableCount = counts[String(s._id)] || 0;
    if (from) s.distanceKm = distanceKm(from, s.location);
  }

  res.json({ success: true, shelters, page, limit, total, totalPages: Math.ceil(total / limit) });
};

exports.nearbyShelters = async (req, res) => {
  const center = toGeoPoint(req.query.lat, req.query.lng);
  if (!center) throw new AppError('lat and lng are required', 400);
  const radiusKm = Math.min(toNum(req.query.radiusKm) || 25, 500);

  const shelters = await User.find({
    role: 'shelter',
    location: { $near: { $geometry: center, $maxDistance: radiusKm * 1000 } },
  })
    .select('name city location shelter.orgName shelter.kind shelter.isVerified shelter.ratingAverage shelter.ratingCount')
    .limit(100)
    .lean();

  const counts = await availableCounts(shelters.map((s) => s._id));
  for (const s of shelters) {
    s.availableCount = counts[String(s._id)] || 0;
    s.distanceKm = distanceKm(center, s.location);
  }

  res.json({ success: true, shelters });
};

exports.getShelter = async (req, res) => {
  assertId(req.params.id, 'shelter id');
  const shelter = await User.findOne({ _id: req.params.id, role: 'shelter' }).select(PUBLIC_FIELDS).lean();
  if (!shelter) throw new AppError('Shelter not found', 404);

  const id = shelter._id;
  const [statusRows, completed, animals, reviews] = await Promise.all([
    Animal.aggregate([{ $match: { shelter: id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Application.find({ shelter: id, status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(12)
      .populate('animal', 'name species breed photos')
      .populate('adopter', 'name city')
      .select('animal adopter type completedAt')
      .lean(),
    Animal.find({ shelter: id, status: 'available' }).sort({ createdAt: -1 }).limit(24).lean(),
    Review.find({ shelter: id }).sort({ createdAt: -1 }).limit(10).populate('adopter', 'name city').lean(),
  ]);

  const byStatus = countBy(statusRows);
  const adoptionHistory = completed.map((a) => ({
    _id: a._id,
    type: a.type,
    completedAt: a.completedAt,
    animal: a.animal,
    adopterName: a.adopter?.name ? a.adopter.name.split(' ')[0] : 'A family',
    adopterCity: a.adopter?.city,
  }));

  res.json({
    success: true,
    shelter,
    stats: {
      available: byStatus.available || 0,
      adopted: byStatus.adopted || 0,
      fostered: byStatus.fostered || 0,
      totalListed: Object.values(byStatus).reduce((a, b) => a + b, 0),
      rating: shelter.shelter?.ratingAverage || 0,
      ratingCount: shelter.shelter?.ratingCount || 0,
    },
    adoptionHistory,
    animals,
    reviews,
  });
};

exports.myDashboard = async (req, res) => {
  const id = new mongoose.Types.ObjectId(String(req.user._id));
  const soon = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const [animalRows, appRows, recentApplications, checkInRows, upcomingCheckIns, recentReviews] = await Promise.all([
    Animal.aggregate([{ $match: { shelter: id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Application.aggregate([{ $match: { shelter: id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Application.find({ shelter: id, status: { $in: ['submitted', 'under_review'] } })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('animal', 'name photos species')
      .populate('adopter', 'name city'),
    CheckIn.aggregate([{ $match: { shelter: id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    CheckIn.find({ shelter: id, status: { $in: ['upcoming', 'due'] }, dueDate: { $lte: soon } })
      .sort({ dueDate: 1 })
      .limit(5)
      .populate('animal', 'name photos')
      .populate('adopter', 'name'),
    Review.find({ shelter: id }).sort({ createdAt: -1 }).limit(3).populate('adopter', 'name'),
  ]);

  res.json({
    success: true,
    animals: countBy(animalRows),
    applications: countBy(appRows),
    checkIns: countBy(checkInRows),
    rating: { average: req.user.shelter?.ratingAverage || 0, count: req.user.shelter?.ratingCount || 0 },
    isVerified: Boolean(req.user.shelter?.isVerified),
    recentApplications,
    upcomingCheckIns,
    recentReviews,
  });
};
