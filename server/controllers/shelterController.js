const ShelterProfile = require('../models/ShelterProfile');
const Animal = require('../models/Animal');
const Application = require('../models/Application');
const CheckIn = require('../models/CheckIn');
const Review = require('../models/Review');
const AppError = require('../utils/AppError');
const { assertId, toGeoPoint } = require('../utils/validate');
const { toBool, toNum, pagination, escapeRegex } = require('../utils/parse');
const { distanceKm } = require('../utils/geo');
const { SHELTER_TYPES } = require('../utils/constants');

const countBy = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.count]));

async function availableCounts(userIds) {
  const rows = await Animal.aggregate([
    { $match: { shelter: { $in: userIds }, status: 'available', isActive: true } },
    { $group: { _id: '$shelter', count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [String(r._id), r.count]));
}

exports.listShelters = async (req, res) => {
  const q = req.query;
  const filter = {};
  if (toBool(q.verified)) filter.isVerified = true;
  if (SHELTER_TYPES.includes(q.type)) filter.type = q.type;
  if (q.city) filter.city = { $regex: escapeRegex(q.city), $options: 'i' };
  if (q.q) {
    const rx = { $regex: escapeRegex(q.q), $options: 'i' };
    filter.$or = [{ organisationName: rx }, { city: rx }, { address: rx }];
  }
  const { page, limit, skip } = pagination(q, 12);

  const [shelters, total] = await Promise.all([
    ShelterProfile.find(filter).sort({ isVerified: -1, averageRating: -1, organisationName: 1 }).skip(skip).limit(limit).lean(),
    ShelterProfile.countDocuments(filter),
  ]);

  const counts = await availableCounts(shelters.map((s) => s.user));
  const from = toGeoPoint(q.lat, q.lng);
  for (const s of shelters) {
    s.availableCount = counts[String(s.user)] || 0;
    if (from) s.distanceKm = distanceKm(from, s.location);
  }

  res.json({ success: true, shelters, page, limit, total, totalPages: Math.ceil(total / limit) });
};

exports.nearbyShelters = async (req, res) => {
  const center = toGeoPoint(req.query.lat, req.query.lng);
  if (!center) throw new AppError('lat and lng are required', 400);
  const radiusKm = Math.min(toNum(req.query.radiusKm) || 25, 500);

  const filter = { location: { $near: { $geometry: center, $maxDistance: radiusKm * 1000 } } };
  if (toBool(req.query.verified)) filter.isVerified = true;

  const shelters = await ShelterProfile.find(filter)
    .select('user organisationName type city location isVerified averageRating reviewCount adoptionCount')
    .limit(100)
    .lean();

  const counts = await availableCounts(shelters.map((s) => s.user));
  for (const s of shelters) {
    s.availableCount = counts[String(s.user)] || 0;
    s.distanceKm = distanceKm(center, s.location);
  }

  res.json({ success: true, shelters });
};

exports.getShelter = async (req, res) => {
  assertId(req.params.id, 'shelter id');
  const profile = await ShelterProfile.findOne({ user: req.params.id }).populate('user', 'name createdAt').lean();
  if (!profile) throw new AppError('Shelter not found', 404);

  const id = profile.user._id;
  const [statusRows, completed, animals, reviews] = await Promise.all([
    Animal.aggregate([{ $match: { shelter: id, isActive: true } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Application.find({ shelter: id, status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(12)
      .populate('animal', 'name species breed photos')
      .populate('adopter', 'name city')
      .select('animal adopter type completedAt')
      .lean(),
    Animal.find({ shelter: id, status: 'available', isActive: true }).sort({ createdAt: -1 }).limit(24).lean(),
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
    shelter: profile,
    stats: {
      available: byStatus.available || 0,
      pending: byStatus.pending || 0,
      adopted: byStatus.adopted || 0,
      fostered: byStatus.fostered || 0,
      adoptionCount: profile.adoptionCount,
      averageRating: profile.averageRating,
      reviewCount: profile.reviewCount,
    },
    adoptionHistory,
    animals: animals.map((a) => ({ ...a, shelterProfile: profile })),
    reviews,
  });
};

exports.myDashboard = async (req, res) => {
  const id = req.user._id;
  const soon = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const profile = req.user.shelterProfile;

  const [animalRows, appRows, recentApplications, checkInRows, upcomingCheckIns, recentReviews] = await Promise.all([
    Animal.aggregate([{ $match: { shelter: id, isActive: true } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Application.aggregate([{ $match: { shelter: id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Application.find({ shelter: id, status: { $in: ['submitted', 'under_review'] } })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('animal', 'name photos species')
      .populate('adopter', 'name city'),
    CheckIn.aggregate([{ $match: { shelter: id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    CheckIn.find({ shelter: id, status: { $in: ['upcoming', 'due', 'missed'] }, dueDate: { $lte: soon } })
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
    rating: { average: profile?.averageRating || 0, count: profile?.reviewCount || 0 },
    adoptionCount: profile?.adoptionCount || 0,
    isVerified: Boolean(profile?.isVerified),
    recentApplications,
    upcomingCheckIns,
    recentReviews,
  });
};
