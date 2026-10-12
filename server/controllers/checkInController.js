const CheckIn = require('../models/CheckIn');
const Application = require('../models/Application');
const AppError = require('../utils/AppError');
const { assertId } = require('../utils/validate');
const { toBool, toNum, toList } = require('../utils/parse');
const { notify } = require('../utils/notify');
const { fileUrl, removeUploads } = require('../middleware/upload');
const { CHECKIN_STATUSES } = require('../utils/constants');

const populateCheckIn = (query) =>
  query
    .populate('animal', 'name species breed photos')
    .populate('adopter', 'name city')
    .populate('shelter', 'name shelter.orgName');

function readUpdate(body = {}, file) {
  const update = {
    notes: body.notes?.trim(),
    weightKg: toNum(body.weightKg),
    vetVisit: toBool(body.vetVisit),
    vetNotes: body.vetNotes?.trim(),
    wellbeing: body.wellbeing || 'good',
  };
  if (file) update.photo = fileUrl(file);
  if (!update.notes) throw new AppError('Please add a few notes about how the animal is doing', 400);
  return update;
}

function assertAccess(checkIn, user) {
  const ids = [checkIn.adopter, checkIn.shelter].map((x) => String(x._id || x));
  if (!ids.includes(String(user._id)) && user.role !== 'admin') {
    throw new AppError('You do not have access to this check-in', 403);
  }
}

exports.myCheckIns = async (req, res) => {
  const filter = { adopter: req.user._id };
  const statuses = toList(req.query.status).filter((s) => CHECKIN_STATUSES.includes(s));
  if (statuses.length) filter.status = { $in: statuses };
  const checkIns = await populateCheckIn(CheckIn.find(filter).sort({ dueDate: 1 }));
  res.json({ success: true, checkIns });
};

exports.shelterCheckIns = async (req, res) => {
  const filter = { shelter: req.user._id };
  const statuses = toList(req.query.status).filter((s) => CHECKIN_STATUSES.includes(s));
  if (statuses.length) filter.status = { $in: statuses };
  if (req.query.animal) {
    assertId(req.query.animal, 'animal id');
    filter.animal = req.query.animal;
  }
  const checkIns = await populateCheckIn(CheckIn.find(filter).sort({ dueDate: -1 }).limit(200));
  res.json({ success: true, checkIns });
};

exports.applicationCheckIns = async (req, res) => {
  assertId(req.params.applicationId, 'application id');
  const app = await Application.findById(req.params.applicationId).select('adopter shelter');
  if (!app) throw new AppError('Application not found', 404);
  assertAccess(app, req.user);
  const checkIns = await populateCheckIn(CheckIn.find({ application: app._id }).sort({ dueDate: 1 }));
  res.json({ success: true, checkIns });
};

exports.getCheckIn = async (req, res) => {
  assertId(req.params.id, 'check-in id');
  const checkIn = await populateCheckIn(CheckIn.findById(req.params.id));
  if (!checkIn) throw new AppError('Check-in not found', 404);
  assertAccess(checkIn, req.user);
  res.json({ success: true, checkIn });
};

exports.completeCheckIn = async (req, res) => {
  try {
    assertId(req.params.id, 'check-in id');
    const checkIn = await CheckIn.findById(req.params.id).populate('animal', 'name');
    if (!checkIn) throw new AppError('Check-in not found', 404);
    if (!checkIn.adopter.equals(req.user._id)) throw new AppError('Only the adopter can complete this check-in', 403);
    if (checkIn.status === 'completed') throw new AppError('This check-in has already been completed', 409);

    checkIn.update = readUpdate(req.body, req.file);
    checkIn.status = 'completed';
    checkIn.completedAt = new Date();
    await checkIn.save();

    await notify(checkIn.shelter, {
      type: 'checkin',
      title: `${checkIn.label} check-in: ${checkIn.animal.name}`,
      message: `${req.user.name} says ${checkIn.animal.name} is doing ${checkIn.update.wellbeing}.`,
      link: `/checkins/${checkIn._id}`,
    });

    res.json({ success: true, checkIn: await populateCheckIn(CheckIn.findById(checkIn._id)) });
  } catch (err) {
    if (req.file) removeUploads([fileUrl(req.file)]);
    throw err;
  }
};

exports.logHealthUpdate = async (req, res) => {
  try {
    assertId(req.params.applicationId, 'application id');
    const app = await Application.findById(req.params.applicationId).populate('animal', 'name');
    if (!app) throw new AppError('Application not found', 404);
    if (!app.adopter.equals(req.user._id)) throw new AppError('Only the adopter can log health updates', 403);
    if (app.status !== 'completed') throw new AppError('Health updates can be logged once the adoption is completed', 409);

    const now = new Date();
    const checkIn = await CheckIn.create({
      application: app._id,
      animal: app.animal._id,
      adopter: app.adopter,
      shelter: app.shelter,
      label: 'Health update',
      dueDate: now,
      status: 'completed',
      completedAt: now,
      update: readUpdate(req.body, req.file),
    });

    await notify(app.shelter, {
      type: 'checkin',
      title: `Health update: ${app.animal.name}`,
      message: `${req.user.name} shared a new update.`,
      link: `/checkins/${checkIn._id}`,
    });

    res.status(201).json({ success: true, checkIn: await populateCheckIn(CheckIn.findById(checkIn._id)) });
  } catch (err) {
    if (req.file) removeUploads([fileUrl(req.file)]);
    throw err;
  }
};
