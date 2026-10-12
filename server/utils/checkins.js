const CheckIn = require('../models/CheckIn');
const Animal = require('../models/Animal');
const { notify } = require('./notify');
const { CHECKIN_SCHEDULE } = require('./constants');

const DAY = 24 * 60 * 60 * 1000;
const REMIND_DAYS_BEFORE = 1;
const MISSED_AFTER_DAYS = 7;

async function scheduleCheckIns(application) {
  const start = application.completedAt || new Date();
  const docs = CHECKIN_SCHEDULE.map(({ label, days }) => ({
    application: application._id,
    animal: application.animal,
    adopter: application.adopter,
    shelter: application.shelter,
    label,
    dueDate: new Date(start.getTime() + days * DAY),
  }));
  return CheckIn.insertMany(docs);
}

async function sendDueReminders(now = new Date()) {
  const dueSoon = await CheckIn.find({
    status: 'upcoming',
    dueDate: { $lte: new Date(now.getTime() + REMIND_DAYS_BEFORE * DAY) },
  });

  for (const checkIn of dueSoon) {
    const animal = await Animal.findById(checkIn.animal).select('name');
    const name = animal?.name || 'your pet';

    checkIn.status = 'due';
    checkIn.reminderSentAt = now;
    await checkIn.save();

    await notify(checkIn.adopter, {
      type: 'checkin',
      title: `${checkIn.label} check-in for ${name} is due`,
      body: `Please share how ${name} is doing: notes, weight, mood, a photo and any vet visits.`,
      link: `/checkins/${checkIn._id}`,
      email: true,
    });
  }
  return dueSoon.length;
}

async function markMissed(now = new Date()) {
  const overdue = await CheckIn.find({
    status: 'due',
    dueDate: { $lt: new Date(now.getTime() - MISSED_AFTER_DAYS * DAY) },
  });

  for (const checkIn of overdue) {
    checkIn.status = 'missed';
    await checkIn.save();
    const animal = await Animal.findById(checkIn.animal).select('name');
    await notify(checkIn.shelter, {
      type: 'checkin',
      title: `Missed check-in: ${animal?.name || 'animal'}`,
      body: `The ${checkIn.label} check-in is more than ${MISSED_AFTER_DAYS} days overdue. You may want to message the adopter.`,
      link: `/checkins/${checkIn._id}`,
      email: true,
    });
  }
  return overdue.length;
}

async function runCheckInJobs(now = new Date()) {
  const reminded = await sendDueReminders(now);
  const missed = await markMissed(now);
  return { reminded, missed, ranAt: now };
}

module.exports = { scheduleCheckIns, runCheckInJobs, sendDueReminders, markMissed };
