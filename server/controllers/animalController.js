const mongoose = require('mongoose');
const Animal = require('../models/Animal');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { assertId, toGeoPoint } = require('../utils/validate');
const { toBool, toList, toNum, pagination, escapeRegex } = require('../utils/parse');
const { distanceKm, EARTH_RADIUS_KM } = require('../utils/geo');
const { fileUrl, removeUploads } = require('../middleware/upload');
const { SPECIES, SIZES, TEMPERAMENT_TAGS, ANIMAL_STATUSES } = require('../utils/constants');

const MAX_PHOTOS = 6;

// Shelter fields shown on animal cards and detail pages.
const SHELTER_FIELDS = 'name city phone email location shelter.orgName shelter.isVerified shelter.ratingAverage shelter.ratingCount';

/**
 * Converts request body fields into Animal fields.
 * Only fields that were actually sent are returned, so the same function works for create and update.
 */
function readAnimalInput(body = {}) {
  const data = {};
  for (const f of ['name', 'species', 'breed', 'size', 'gender', 'energyLevel', 'description', 'listingType', 'status', 'city']) {
    if (body[f] !== undefined) data[f] = typeof body[f] === 'string' ? body[f].trim() : body[f];
  }

  // Age can be sent in months, or in years (converted to months).
  if (body.ageMonths !== undefined) data.ageMonths = toNum(body.ageMonths);
  else if (body.ageYears !== undefined) data.ageMonths = Math.round((toNum(body.ageYears) ?? NaN) * 12);
  if (data.ageMonths !== undefined && Number.isNaN(data.ageMonths)) throw new AppError('Age must be a number', 400);

  if (body.temperament !== undefined) data.temperament = toList(body.temperament);

  // Health info can arrive as a nested object / JSON string, or as flat form fields.
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

// Loads an animal and checks the current user owns it (admins can manage any animal).
async function loadOwnedAnimal(id, user) {
  assertId(id, 'animal id');
  const animal = await Animal.findById(id);
  if (!animal) throw new AppError('Animal not found', 404);
  if (user.role !== 'admin' && !animal.shelter.equals(user._id)) {
    throw new AppError('You can only manage your own listings', 403);
  }
  return animal;
}

/**
 * POST /api/animals   (shelter)   multipart/form-data with up to 6 "photos"
 * Location defaults to the shelter's own location if lat/lng aren't sent.
 */
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
    removeUploads(photos); // don't leave orphan files if validation failed
    throw err;
  }
};

/**
 * PATCH /api/animals/:id   (owner shelter or admin)
 * Send any fields to change, new "photos" files to add, and "removePhotos" (list of URLs) to delete.
 */
exports.updateAnimal = async (req, res) => {
  const newPhotos = (req.files || []).map(fileUrl);
  try {
    const animal = await loadOwnedAnimal(req.params.id, req.user);
    const data = readAnimalInput(req.body);

    // Merge health so updating one field doesn't erase the others.
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

// DELETE /api/animals/:id   (owner shelter or admin)
exports.deleteAnimal = async (req, res) => {
  const animal = await loadOwnedAnimal(req.params.id, req.user);
  await animal.deleteOne();
  removeUploads(animal.photos);
  await User.updateMany({ favourites: animal._id }, { $pull: { favourites: animal._id } });
  res.json({ success: true, message: 'Listing deleted' });
};

/**
 * Builds the MongoDB filter for the search page from query-string parameters:
 *   species=dog,cat  size=small,medium  gender=female  breed=lab  q=bruno
 *   minAge / maxAge (years)  listingType=adoption|foster|both  temperament=calm,kid-friendly
 *   vaccinated=true  sterilised=true  status=available|...|all  shelter=<id>
 */
function buildFilter(q) {
  const filter = {};

  // Default: only show animals that can still be adopted/fostered.
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

  // Free-text search across name and breed (case-insensitive).
  if (q.q) {
    const rx = { $regex: escapeRegex(q.q), $options: 'i' };
    filter.$or = [{ name: rx }, { breed: rx }];
  }

  // Age range: the UI talks in years, the DB stores months.
  const minAge = toNum(q.minAge);
  const maxAge = toNum(q.maxAge);
  if (minAge !== undefined || maxAge !== undefined) {
    filter.ageMonths = {};
    if (minAge !== undefined) filter.ageMonths.$gte = Math.round(minAge * 12);
    if (maxAge !== undefined) filter.ageMonths.$lte = Math.round(maxAge * 12);
  }

  // An animal listed as "both" should appear in adoption AND foster searches.
  if (q.listingType === 'adoption' || q.listingType === 'foster') filter.listingType = { $in: [q.listingType, 'both'] };
  else if (q.listingType === 'both') filter.listingType = 'both';

  // Animal must have ALL the selected temperament tags.
  const tags = toList(q.temperament).filter((t) => TEMPERAMENT_TAGS.includes(t));
  if (tags.length) filter.temperament = { $all: tags };

  if (q.vaccinated !== undefined) filter['health.vaccinated'] = toBool(q.vaccinated);
  if (q.sterilised !== undefined) filter['health.sterilised'] = toBool(q.sterilised);

  // Aggregation pipelines don't auto-convert strings to ObjectIds like find() does.
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

/**
 * GET /api/animals — search with filters, distance and pagination.
 *
 * Distance search: if lat & lng are sent, the pipeline starts with $geoNear.
 * $geoNear uses the 2dsphere index to:
 *   1. keep only animals within radiusKm (maxDistance, in metres),
 *   2. add each animal's distance from the user ("distanceMeters"),
 *   3. sort nearest first.
 * (It's the aggregation version of $near; $near itself can't be used with a total count for pagination.)
 *
 * $facet then runs two sub-pipelines on the same results: one page of animals, and the total count.
 */
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

  // $geoNear already sorts by distance; any other sort (or no location) needs an explicit $sort.
  const sortKey = q.sort || (near ? 'distance' : 'newest');
  if (sortKey !== 'distance' || !near) pipeline.push({ $sort: SORTS[sortKey] || SORTS.newest });

  pipeline.push({
    $facet: {
      animals: [
        { $skip: skip },
        { $limit: limit },
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
      ],
      total: [{ $count: 'count' }],
    },
  });

  const [result] = await Animal.aggregate(pipeline);
  const total = result.total[0]?.count || 0;

  res.json({
    success: true,
    animals: result.animals,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
};

/**
 * GET /api/animals/map?lat=&lng=&radiusKm=25 — lightweight markers for the map view.
 * Uses $geoWithin + $centerSphere: "every point inside a circle", no sorting needed.
 * $centerSphere takes the radius in radians, which is km / Earth's radius.
 */
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

// GET /api/animals/:id — full details. Adds distanceKm if ?lat=&lng= are sent.
exports.getAnimal = async (req, res) => {
  assertId(req.params.id, 'animal id');
  const animal = await Animal.findById(req.params.id).populate('shelter', SHELTER_FIELDS).lean();
  if (!animal) throw new AppError('Animal not found', 404);

  const from = toGeoPoint(req.query.lat, req.query.lng) || req.user?.location;
  if (from) animal.distanceKm = distanceKm(from, animal.location);
  if (req.user) animal.isFavourite = req.user.favourites.some((f) => f.equals(animal._id));

  res.json({ success: true, animal });
};

// GET /api/animals/mine — the logged-in shelter's own listings, any status.
exports.myAnimals = async (req, res) => {
  const filter = { shelter: req.user._id };
  const statuses = toList(req.query.status).filter((s) => ANIMAL_STATUSES.includes(s));
  if (statuses.length) filter.status = { $in: statuses };
  const { page, limit, skip } = pagination(req.query, 20);

  const [animals, total] = await Promise.all([
    Animal.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Animal.countDocuments(filter),
  ]);
  res.json({ success: true, animals, page, limit, total, totalPages: Math.ceil(total / limit) });
};

// POST /api/animals/:id/favourite — toggles the animal in the adopter's favourites.
exports.toggleFavourite = async (req, res) => {
  assertId(req.params.id, 'animal id');
  if (!(await Animal.exists({ _id: req.params.id }))) throw new AppError('Animal not found', 404);

  const isFav = req.user.favourites.some((f) => f.equals(req.params.id));
  // $addToSet / $pull are atomic, so double-clicks can't create duplicates.
  const update = isFav ? { $pull: { favourites: req.params.id } } : { $addToSet: { favourites: req.params.id } };
  const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });

  res.json({ success: true, favourited: !isFav, favourites: user.favourites });
};

// GET /api/animals/favourites — the adopter's saved animals.
exports.myFavourites = async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'favourites',
    populate: { path: 'shelter', select: 'name shelter.orgName shelter.isVerified' },
  });
  res.json({ success: true, animals: user.favourites });
};
