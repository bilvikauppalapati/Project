const Application = require('../models/Application');
const Animal = require('../models/Animal');
const AppError = require('../utils/AppError');
const { assertId } = require('../utils/validate');
const { toBool, toNum, toList, pagination } = require('../utils/parse');
const { matchAnimal } = require('../utils/matching');
const { notify } = require('../utils/notify');
const { APPLICATION_STATUSES } = require('../utils/constants');

const ACTIVE = ['submitted', 'under_review', 'approved'];

const TRANSITIONS = {
  submitted: ['under_review', 'approved', 'rejected', 'withdrawn'],
  under_review: ['approved', 'rejected', 'withdrawn'],
  approved: ['completed', 'rejected'],
  rejected: [],
  completed: [],
  withdrawn: [],
};

const STATUS_LABELS = {
  submitted: 'Submitted',
  under_review: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
  completed: 'Completed',
  withdrawn: 'Withdrawn',
};

function readQuestionnaire(input = {}) {
  return {
    homeType: input.homeType,
    hasYard: toBool(input.hasYard),
    otherPets: input.otherPets || 'None',
    hasKids: toBool(input.hasKids),
    kidsAges: input.kidsAges,
    experience: input.experience,
    workHoursPerDay: toNum(input.workHoursPerDay),
    reason: input.reason,
  };
}

async function loadApplication(id, user) {
  assertId(id, 'application id');
  const app = await Application.findById(id);
  if (!app) throw new AppError('Application not found', 404);

  const isAdopter = app.adopter.equals(user._id);
  const isShelter = app.shelter.equals(user._id);
  if (!isAdopter && !isShelter && user.role !== 'admin') {
    throw new AppError('You do not have access to this application', 403);
  }
  return { app, isAdopter, isShelter };
}

const populateApp = (query) =>
  query
    .populate('animal', 'name species breed ageMonths size photos status listingType city')
    .populate('adopter', 'name email phone city preferences')
    .populate('shelter', 'name email phone city shelter.orgName shelter.isVerified');

exports.createApplication = async (req, res) => {
  const body = req.body || {};
  assertId(body.animalId, 'animal id');
  const type = body.type || 'adoption';
  if (!['adoption', 'foster'].includes(type)) throw new AppError('type must be adoption or foster', 400);

  const animal = await Animal.findById(body.animalId);
  if (!animal) throw new AppError('Animal not found', 404);
  if (animal.status !== 'available') throw new AppError(`${animal.name} is no longer available`, 409);
  if (animal.listingType !== 'both' && animal.listingType !== type) {
    throw new AppError(`${animal.name} is listed for ${animal.listingType} only`, 400);
  }

  const duplicate = await Application.exists({ animal: animal._id, adopter: req.user._id, status: { $in: ACTIVE } });
  if (duplicate) throw new AppError(`You already have an active application for ${animal.name}`, 409);

  const { score } = matchAnimal(req.user, animal);

  const app = await Application.create({
    animal: animal._id,
    adopter: req.user._id,
    shelter: animal.shelter,
    type,
    questionnaire: readQuestionnaire(body.questionnaire),
    matchScore: score,
    timeline: [{ status: 'submitted', by: req.user._id, note: 'Application submitted' }],
  });

  await notify(animal.shelter, {
    type: 'application',
    title: `New ${type} application for ${animal.name}`,
    message: `${req.user.name} applied (${score}% match).`,
    link: `/applications/${app._id}`,
  });

  res.status(201).json({ success: true, application: await populateApp(Application.findById(app._id)) });
};

exports.myApplications = async (req, res) => {
  const filter = { adopter: req.user._id };
  const statuses = toList(req.query.status).filter((s) => APPLICATION_STATUSES.includes(s));
  if (statuses.length) filter.status = { $in: statuses };

  const applications = await populateApp(Application.find(filter).sort({ updatedAt: -1 }));
  res.json({ success: true, applications });
};

exports.incomingApplications = async (req, res) => {
  const filter = { shelter: req.user._id };
  const statuses = toList(req.query.status).filter((s) => APPLICATION_STATUSES.includes(s));
  if (statuses.length) filter.status = { $in: statuses };
  if (req.query.animal) {
    assertId(req.query.animal, 'animal id');
    filter.animal = req.query.animal;
  }
  const { page, limit, skip } = pagination(req.query, 20);

  const [applications, total] = await Promise.all([
    populateApp(Application.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)),
    Application.countDocuments(filter),
  ]);
  res.json({ success: true, applications, page, limit, total, totalPages: Math.ceil(total / limit) });
};

exports.getApplication = async (req, res) => {
  const { app } = await loadApplication(req.params.id, req.user);
  const application = await populateApp(Application.findById(app._id)).populate('timeline.by', 'name role');
  res.json({ success: true, application });
};

async function applySideEffects(app, next, actor) {
  const animal = await Animal.findById(app.animal);
  if (!animal) return;

  if (next === 'approved') {
    animal.status = 'pending';
    await animal.save();
  }

  if (next === 'rejected' && app.status === 'approved') {
    animal.status = 'available';
    await animal.save();
  }

  if (next === 'completed') {
    animal.status = app.type === 'foster' ? 'fostered' : 'adopted';
    await animal.save();
    app.completedAt = new Date();

    const others = await Application.find({ animal: animal._id, _id: { $ne: app._id }, status: { $in: ACTIVE } });
    for (const other of others) {
      other.status = 'rejected';
      other.shelterNote = `${animal.name} has found a home with another family.`;
      other.timeline.push({ status: 'rejected', by: actor._id, note: other.shelterNote });
      await other.save();
      await notify(other.adopter, {
        type: 'application',
        title: `Update on ${animal.name}`,
        message: other.shelterNote,
        link: `/applications/${other._id}`,
      });
    }
  }
}

exports.updateStatus = async (req, res) => {
  const body = req.body || {};
  const next = body.status;
  if (!APPLICATION_STATUSES.includes(next)) {
    throw new AppError(`status must be one of: ${APPLICATION_STATUSES.join(', ')}`, 400);
  }

  const { app, isAdopter, isShelter } = await loadApplication(req.params.id, req.user);
  const isAdmin = req.user.role === 'admin';

  if (next === 'withdrawn' && !isAdopter) throw new AppError('Only the applicant can withdraw an application', 403);
  if (next !== 'withdrawn' && !isShelter && !isAdmin) throw new AppError('Only the shelter can change this status', 403);

  if (!TRANSITIONS[app.status].includes(next)) {
    throw new AppError(`Cannot move an application from "${STATUS_LABELS[app.status]}" to "${STATUS_LABELS[next]}"`, 409);
  }

  if (next === 'approved') {
    const otherApproved = await Application.exists({ animal: app.animal, _id: { $ne: app._id }, status: 'approved' });
    if (otherApproved) throw new AppError('Another application for this animal is already approved', 409);
  }

  await applySideEffects(app, next, req.user);

  app.status = next;
  if (body.note && !isAdopter) app.shelterNote = body.note;
  app.timeline.push({ status: next, by: req.user._id, note: body.note });
  await app.save();

  const animal = await Animal.findById(app.animal).select('name');
  const recipient = isAdopter ? app.shelter : app.adopter;
  await notify(recipient, {
    type: 'application',
    title: `Application ${STATUS_LABELS[next].toLowerCase()}: ${animal?.name || 'animal'}`,
    message: body.note || `The application is now "${STATUS_LABELS[next]}".`,
    link: `/applications/${app._id}`,
  });

  const application = await populateApp(Application.findById(app._id)).populate('timeline.by', 'name role');
  res.json({ success: true, application });
};

module.exports.ACTIVE_STATUSES = ACTIVE;
