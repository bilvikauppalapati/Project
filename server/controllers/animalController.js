const mongoose = require('mongoose');
const Animal = require('../models/Animal');
const User = require('../models/User');
const Application = require('../models/Application');
const AppError = require('../utils/AppError');
const { matchAnimal } = require('../utils/matching');
const { assertId, toGeoPoint } = require('../utils/validate');
const { toBool, toList, toNum, pagination, escapeRegex } = require('../utils/parse');
const { distanceKm, EARTH_RADIUS_KM } = require('../utils/geo');
const { fileUrl, removeUploads } = require('../middleware/upload');
const { SPECIES, SIZES, TEMPERAMENT_TAGS, ANIMAL_STATUSES } = require('../utils/constants');

const MAX_PHOTOS = 6;
const MATCH_SORT_LIMIT = 1000;

const SHELTER_FIELDS = 'name city phone email location shelter.orgName shelter.isVerified shelter.ratingAverage shelter.ratingCount';

function readAnimalInput(body = {}) {
  const data = {};
  for (const f of ['name', 'species', 'breed', 'size', 'gender', 'energyLevel', 'description', 'listingType', 'status', 'city']) {
    if (body[f] !== undefined) data[f] = typeof body[f] === 'string' ? body[f].trim() : body[f];
  }

  if (body.ageMonths !== undefined) data.ageMonths = toNum(body.ageMonths);
  else if (body.ageYears !== undefined) data.ageMonths = Math.round((toNum(body.ageYears) ?? NaN) * 12);
  if (data.ageMonths !== undefined && Number.isNaN(data.ageMonths)) throw new AppError('Age must be a number', 400);

  if (body.temperament !== undefined) data.temperament = toList(body.temperament);

  let health = body.health;
  if (typeof health === 'string') {
    try {
      health = JSON.parse(health);
    } catch {
      throw new AppError('health must be valid JSON', 400);
    }
  }
  health = { ...(health || {}) };
  for (const f of ['vaccinated', 'sterilised', 'dewormed', 'vaccinations', 'medicalNotes']) {
    if (body[f] !== undefined) health[f] = body[f];
  }
  const h = {};
  for (const f of ['vaccinated', 'sterilised', 'dewormed']) if (health[f] !== undefined) h[f] = toBool(health[f]);
  if (health.vaccinations !== undefined) h.vaccinations = toList(health.vaccinations);
  if (health.medicalNotes !== undefined) h.medicalNotes = health.medicalNotes;
  if (Object.keys(h).length) data.health = h;

  const location = toGeoPoint(body.lat, body.lng);
  if (location) data.location = location;

  return data;
}

async function loadOwnedAnimal(id, user) {
  assertId(id, 'animal id');
  const animal = await Animal.findById(id);
  if (!animal) throw new AppError('Animal not found', 404);
  if (user.role !== 'admin' && !animal.shelter.equals(user._id)) {
    throw new AppError('You can only manage your own listings', 403);
  }
  return animal;
}

exports.createAnimal = async (req, res) => {
  const data = readAnimalInput(req.body);
  const photos = (req.files || []).map(fileUrl);

  try {
    data.shelter = req.user._id;
    data.location = data.location || req.user.location;
    data.city = data.city || req.user.city;
    if (!data.location) throw new AppError('Location is required: send lat/lng or set a location on your profile', 400);
    data.photos = photos;

    const animal = await Animal.create(data);
    res.status(201).json({ success: true, animal });
  } catch (err) {
    removeUploads(photos);
    throw err;
  }
};

exports.updateAnimal = async (req, res) => {
  const newPhotos = (req.files || []).map(fileUrl);
  try {
    const animal = await loadOwnedAnimal(req.params.id, req.user);
    const data = readAnimalInput(req.body);

    if (data.health) data.health = { ...animal.health.toObject(), ...data.health };
    animal.set(data);

    const toRemove = toList(req.body.removePhotos);
    const kept = animal.photos.filter((p) => !toRemove.includes(p));
    if (kept.length + newPhotos.length > MAX_PHOTOS) throw new AppError(`An animal can have at most ${MAX_PHOTOS} photos`, 400);
    animal.photos = [...kept, ...newPhotos];

    await animal.save();
    removeUploads(toRemove.filter((p) => !kept.includes(p)));
    res.json({ success: true, animal });
  } catch (err) {
    removeUploads(newPhotos);
    throw err;
  }
};

exports.deleteAnimal = async (req, res) => {
  const animal = await loadOwnedAnimal(req.params.id, req.user);
  const history = await Application.exists({ animal: animal._id, status: { $nin: ['rejected', 'withdrawn'] } });
  if (history) {
    throw new AppError(
      'This animal has active applications or adoption history. Reject open applications or change its status instead of deleting.',
      409
    );
  }
  await animal.deleteOne();
  await Application.deleteMany({ animal: animal._id });
  removeUploads(animal.photos);
  await User.updateMany({ favourites: animal._id }, { $pull: { favourites: animal._id } });
  res.json({ success: true, message: 'Listing deleted' });
};

function buildFilter(q) {
  const filter = {};

  if (q.status !== 'all') {
    const statuses = toList(q.status || 'available').filter((s) => ANIMAL_STATUSES.includes(s));
    filter.status = { $in: statuses.length ? statuses : ['available'] };
  }

  const species = toList(q.species).filter((s) => SPECIES.includes(s));
  if (species.length) filter.species = { $in: species };

  const sizes = toList(q.size).filter((s) => SIZES.includes(s));
  if (sizes.length) filter.size = { $in: sizes };

  if (q.gender) filter.gender = q.gender;
  if (q.breed) filter.breed = { $regex: escapeRegex(q.breed), $options: 'i' };

  if (q.q) {
    const rx = { $regex: escapeRegex(q.q), $options: 'i' };
    filter.$or = [{ name: rx }, { breed: rx }];
  }

  const minAge = toNum(q.minAge);
  const maxAge = toNum(q.maxAge);
  if (minAge !== undefined || maxAge !== undefined) {
    filter.ageMonths = {};
    if (minAge !== undefined) filter.ageMonths.$gte = Math.round(minAge * 12);
    if (maxAge !== undefined) filter.ageMonths.$lte = Math.round(maxAge * 12);
  }

  if (q.listingType === 'adoption' || q.listingType === 'foster') filter.listingType = { $in: [q.listingType, 'both'] };
  else if (q.listingType === 'both') filter.listingType = 'both';

  const tags = toList(q.temperament).filter((t) => TEMPERAMENT_TAGS.includes(t));
  if (tags.length) filter.temperament = { $all: tags };

  if (q.vaccinated !== undefined) filter['health.vaccinated'] = toBool(q.vaccinated);
  if (q.sterilised !== undefined) filter['health.sterilised'] = toBool(q.sterilised);

  if (q.shelter) {
    assertId(q.shelter, 'shelter id');
    filter.shelter = new mongoose.Types.ObjectId(String(q.shelter));
  }

  return filter;
}

const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  youngest: { ageMonths: 1, _id: 1 },
  eldest: { ageMonths: -1, _id: 1 },
  name: { name: 1, _id: 1 },
};

exports.listAnimals = async (req, res) => {
  const q = req.query;
  const filter = buildFilter(q);
  const { page, limit, skip } = pagination(q);

  const near = toGeoPoint(q.lat, q.lng);
  const radiusKm = toNum(q.radiusKm);
  const pipeline = [];

  if (near) {
    pipeline.push({
      $geoNear: {
        near,
        distanceField: 'distanceMeters',
        spherical: true,
        query: filter,
        ...(radiusKm > 0 && { maxDistance: radiusKm * 1000 }),
      },
    });
  } else {
    pipeline.push({ $match: filter });
  }

  const adopter = req.user?.role === 'adopter' ? req.user : null;
  const sortByMatch = q.sort === 'match' && adopter;

  const sortKey = q.sort || (near ? 'distance' : 'newest');
  if (!sortByMatch && (sortKey !== 'distance' || !near)) pipeline.push({ $sort: SORTS[sortKey] || SORTS.newest });

  const shapeStages = [
    {
      $lookup: {
        from: 'users',
        localField: 'shelter',
        foreignField: '_id',
        as: 'shelter',
        pipeline: [{ $project: { name: 1, city: 1, 'shelter.orgName': 1, 'shelter.isVerified': 1, 'shelter.ratingAverage': 1 } }],
      },
    },
    { $unwind: '$shelter' },
    { $addFields: { distanceKm: { $round: [{ $divide: ['$distanceMeters', 1000] }, 1] } } },
    { $project: { distanceMeters: 0, __v: 0 } },
  ];

  const addMatch = (animal) => ({
    ...animal,
    matchScore: matchAnimal(adopter, animal, animal.distanceKm ?? undefined).score,
  });

  let animals;
  let total;

  if (sortByMatch) {
    const all = await Animal.aggregate([...pipeline, { $limit: MATCH_SORT_LIMIT }, ...shapeStages]);
    const ranked = all.map(addMatch).sort((a, b) => b.matchScore - a.matchScore);
    total = ranked.length;
    animals = ranked.slice(skip, skip + limit);
  } else {
    pipeline.push({ $facet: { animals: [{ $skip: skip }, { $limit: limit }, ...shapeStages], total: [{ $count: 'count' }] } });
    const [result] = await Animal.aggregate(pipeline);
    total = result.total[0]?.count || 0;
    animals = adopter ? result.animals.map(addMatch) : result.animals;
  }

  res.json({ success: true, animals, page, limit, total, totalPages: Math.ceil(total / limit) });
};

exports.mapAnimals = async (req, res) => {
  const center = toGeoPoint(req.query.lat, req.query.lng);
  if (!center) throw new AppError('lat and lng are required', 400);
  const radiusKm = Math.min(toNum(req.query.radiusKm) || 25, 500);

  const animals = await Animal.find({
    status: 'available',
    location: { $geoWithin: { $centerSphere: [center.coordinates, radiusKm / EARTH_RADIUS_KM] } },
  })
    .select('name species breed ageMonths photos location listingType city shelter')
    .populate('shelter', 'name shelter.orgName')
    .limit(300)
    .lean();

  res.json({ success: true, animals });
};

exports.getAnimal = async (req, res) => {
  assertId(req.params.id, 'animal id');
  const animal = await Animal.findById(req.params.id).populate('shelter', SHELTER_FIELDS).lean();
  if (!animal) throw new AppError('Animal not found', 404);

  const from = toGeoPoint(req.query.lat, req.query.lng) || req.user?.location;
  if (from) animal.distanceKm = distanceKm(from, animal.location);
  if (req.user) animal.isFavourite = req.user.favourites.some((f) => f.equals(animal._id));
  if (req.user?.role === 'adopter') {
    animal.match = matchAnimal(req.user, animal, animal.distanceKm);
    animal.myApplication = await Application.findOne({ animal: animal._id, adopter: req.user._id })
      .sort({ createdAt: -1 })
      .select('status type createdAt');
  }

  res.json({ success: true, animal });
};

exports.myAnimals = async (req, res) => {
  const filter = { shelter: req.user._id };
  const statuses = toList(req.query.status).filter((s) => ANIMAL_STATUSES.includes(s));
  if (statuses.length) filter.status = { $in: statuses };
  const { page, limit, skip } = pagination(req.query, 20);

  const [animals, total] = await Promise.all([
    Animal.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Animal.countDocuments(filter),
  ]);

  const counts = await Application.aggregate([
    { $match: { animal: { $in: animals.map((a) => a._id) }, status: { $in: ['submitted', 'under_review', 'approved'] } } },
    { $group: { _id: '$animal', count: { $sum: 1 } } },
  ]);
  const countByAnimal = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
  for (const animal of animals) animal.activeApplications = countByAnimal[String(animal._id)] || 0;

  res.json({ success: true, animals, page, limit, total, totalPages: Math.ceil(total / limit) });
};

exports.toggleFavourite = async (req, res) => {
  assertId(req.params.id, 'animal id');
  if (!(await Animal.exists({ _id: req.params.id }))) throw new AppError('Animal not found', 404);

  const isFav = req.user.favourites.some((f) => f.equals(req.params.id));
  const update = isFav ? { $pull: { favourites: req.params.id } } : { $addToSet: { favourites: req.params.id } };
  const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });

  res.json({ success: true, favourited: !isFav, favourites: user.favourites });
};

exports.myFavourites = async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'favourites',
    populate: { path: 'shelter', select: 'name shelter.orgName shelter.isVerified' },
  });
  res.json({ success: true, animals: user.favourites });
};
