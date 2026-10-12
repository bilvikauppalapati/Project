const mongoose = require('mongoose');
const Animal = require('../models/Animal');
const User = require('../models/User');
const Application = require('../models/Application');
const ShelterProfile = require('../models/ShelterProfile');
const AppError = require('../utils/AppError');
const { matchAnimal } = require('../utils/matching');
const { assertId, toGeoPoint } = require('../utils/validate');
const { toBool, toList, toNum, pagination, escapeRegex } = require('../utils/parse');
const { distanceKm, EARTH_RADIUS_KM } = require('../utils/geo');
const { shelterLookupStages, attachProfiles } = require('../utils/shelters');
const { fileUrl, removeUploads } = require('../middleware/upload');
const { SPECIES, SIZES, TEMPERAMENT_TAGS, ANIMAL_STATUSES, ACTIVE_APPLICATION_STATUSES, MAX_PHOTOS } = require('../utils/constants');

const MATCH_SORT_LIMIT = 1000;

function readVaccinations(value) {
  if (value === undefined) return undefined;
  let list = value;
  if (typeof list === 'string') {
    try {
      list = JSON.parse(list);
    } catch {
      list = toList(list);
    }
  }
  if (!Array.isArray(list)) list = [list];
  return list
    .map((v) => (typeof v === 'string' ? { name: v.trim() } : { name: String(v?.name || '').trim(), date: v?.date || undefined }))
    .filter((v) => v.name);
}

function readAnimalInput(body = {}) {
  const data = {};
  for (const f of ['name', 'species', 'breed', 'size', 'gender', 'color', 'activityLevel', 'description', 'listingType', 'status', 'city']) {
    if (body[f] !== undefined) data[f] = typeof body[f] === 'string' ? body[f].trim() : body[f];
  }

  if (body.ageMonths !== undefined) data.ageMonths = toNum(body.ageMonths);
  else if (body.ageYears !== undefined) data.ageMonths = Math.round((toNum(body.ageYears) ?? NaN) * 12);
  if (data.ageMonths !== undefined && Number.isNaN(data.ageMonths)) throw new AppError('Age must be a number', 400);

  if (body.temperamentTags !== undefined) data.temperamentTags = toList(body.temperamentTags);

  let health = body.healthRecords;
  if (typeof health === 'string') {
    try {
      health = JSON.parse(health);
    } catch {
      throw new AppError('healthRecords must be valid JSON', 400);
    }
  }
  health = { ...(health || {}) };
  for (const f of ['vaccinated', 'sterilised', 'dewormed', 'vaccinations', 'medicalNotes', 'specialNeeds']) {
    if (body[f] !== undefined) health[f] = body[f];
  }
  const h = {};
  for (const f of ['vaccinated', 'sterilised', 'dewormed']) if (health[f] !== undefined) h[f] = toBool(health[f]);
  if (health.vaccinations !== undefined) h.vaccinations = readVaccinations(health.vaccinations);
  if (health.medicalNotes !== undefined) h.medicalNotes = health.medicalNotes;
  if (health.specialNeeds !== undefined) h.specialNeeds = health.specialNeeds;
  if (Object.keys(h).length) data.healthRecords = h;

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
  const photos = (req.files || []).map(fileUrl);
  try {
    const data = readAnimalInput(req.body);
    const profile = req.user.shelterProfile;
    data.shelter = req.user._id;
    data.location = data.location || profile?.location || req.user.location;
    data.city = data.city || profile?.city || req.user.city;
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

    if (data.healthRecords) data.healthRecords = { ...animal.healthRecords.toObject(), ...data.healthRecords };
    animal.set(data);

    const toRemove = toList(req.body?.removePhotos);
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
  if (await Application.exists({ animal: animal._id, status: { $in: ACTIVE_APPLICATION_STATUSES } })) {
    throw new AppError('This animal has open applications. Approve, reject or wait for them before removing the listing.', 409);
  }
  animal.isActive = false;
  await animal.save();
  await User.updateMany({ favourites: animal._id }, { $pull: { favourites: animal._id } });
  res.json({ success: true, message: 'Listing removed', animal });
};

exports.setActive = async (req, res) => {
  assertId(req.params.id, 'animal id');
  const animal = await Animal.findByIdAndUpdate(req.params.id, { isActive: toBool(req.body?.isActive) }, { returnDocument: 'after' });
  if (!animal) throw new AppError('Animal not found', 404);
  res.json({ success: true, animal });
};

async function buildFilter(q, user) {
  const filter = {};

  if (!(q.includeInactive === 'true' && user?.role === 'admin')) filter.isActive = true;

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
  if (tags.length) filter.temperamentTags = { $all: tags };

  if (q.vaccinated !== undefined) filter['healthRecords.vaccinated'] = toBool(q.vaccinated);
  if (q.sterilised !== undefined) filter['healthRecords.sterilised'] = toBool(q.sterilised);

  if (q.shelter) {
    assertId(q.shelter, 'shelter id');
    filter.shelter = new mongoose.Types.ObjectId(String(q.shelter));
  }

  if (toBool(q.verifiedOnly)) {
    const verified = await ShelterProfile.find({ isVerified: true }).distinct('user');
    filter.shelter = filter.shelter ? { $in: verified.filter((v) => v.equals(filter.shelter)) } : { $in: verified };
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
  const filter = await buildFilter(q, req.user);
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
  const sortKey = q.sort === 'nearest' ? 'distance' : q.sort || (near ? 'distance' : 'newest');
  if (!sortByMatch && (sortKey !== 'distance' || !near)) pipeline.push({ $sort: SORTS[sortKey] || SORTS.newest });

  const shapeStages = [
    ...shelterLookupStages(),
    { $addFields: { distanceKm: { $round: [{ $divide: ['$distanceMeters', 1000] }, 1] } } },
    { $project: { distanceMeters: 0, __v: 0 } },
  ];

  const addMatch = (animal) => {
    const m = matchAnimal(adopter, animal, animal.distanceKm ?? undefined);
    return { ...animal, matchScore: m.score, matchReasons: m.reasons };
  };

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

  const filter = {
    isActive: true,
    status: 'available',
    location: { $geoWithin: { $centerSphere: [center.coordinates, radiusKm / EARTH_RADIUS_KM] } },
  };
  const species = toList(req.query.species).filter((s) => SPECIES.includes(s));
  if (species.length) filter.species = { $in: species };
  const sizes = toList(req.query.size).filter((s) => SIZES.includes(s));
  if (sizes.length) filter.size = { $in: sizes };
  if (req.query.listingType === 'adoption' || req.query.listingType === 'foster') {
    filter.listingType = { $in: [req.query.listingType, 'both'] };
  }

  const animals = await Animal.find(filter)
    .select('name species breed ageMonths size photos location listingType city shelter')
    .limit(300)
    .lean();

  res.json({ success: true, animals: await attachProfiles(animals) });
};

exports.getAnimal = async (req, res) => {
  assertId(req.params.id, 'animal id');
  const animal = await Animal.findById(req.params.id)
    .populate({ path: 'shelter', select: 'name city phone email location', populate: { path: 'shelterProfile' } })
    .lean();
  if (!animal) throw new AppError('Animal not found', 404);

  const canSeeInactive = req.user && (req.user.role === 'admin' || animal.shelter?._id?.equals(req.user._id));
  if (!animal.isActive && !canSeeInactive) throw new AppError('This listing has been removed', 404);

  animal.shelterProfile = animal.shelter?.shelterProfile || null;
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
  const filter = { shelter: req.user._id, isActive: req.query.removed === 'true' ? false : true };
  const statuses = toList(req.query.status).filter((s) => ANIMAL_STATUSES.includes(s));
  if (statuses.length) filter.status = { $in: statuses };
  const { page, limit, skip } = pagination(req.query, 20);

  const [animals, total, statusRows] = await Promise.all([
    Animal.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Animal.countDocuments(filter),
    Animal.aggregate([{ $match: { shelter: req.user._id, isActive: true } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);

  const counts = await Application.aggregate([
    { $match: { animal: { $in: animals.map((a) => a._id) }, status: { $in: ACTIVE_APPLICATION_STATUSES } } },
    { $group: { _id: '$animal', count: { $sum: 1 } } },
  ]);
  const countByAnimal = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));
  for (const animal of animals) animal.activeApplications = countByAnimal[String(animal._id)] || 0;

  res.json({
    success: true,
    animals,
    statusCounts: Object.fromEntries(statusRows.map((r) => [r._id, r.count])),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
};

exports.toggleFavourite = async (req, res) => {
  assertId(req.params.id, 'animal id');
  if (!(await Animal.exists({ _id: req.params.id, isActive: true }))) throw new AppError('Animal not found', 404);

  const isFav = req.user.favourites.some((f) => f.equals(req.params.id));
  const update = isFav ? { $pull: { favourites: req.params.id } } : { $addToSet: { favourites: req.params.id } };
  const user = await User.findByIdAndUpdate(req.user._id, update, { returnDocument: 'after' });

  res.json({ success: true, favourited: !isFav, favourites: user.favourites });
};

exports.myFavourites = async (req, res) => {
  const user = await User.findById(req.user._id).populate({ path: 'favourites', match: { isActive: true } });
  const animals = await attachProfiles(user.favourites.map((a) => a.toObject()));
  const withMatch = req.user.role === 'adopter' ? animals.map((a) => ({ ...a, matchScore: matchAnimal(req.user, a).score })) : animals;
  res.json({ success: true, animals: withMatch });
};
