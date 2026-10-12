const Review = require('../models/Review');
const Application = require('../models/Application');
const ShelterProfile = require('../models/ShelterProfile');
const AppError = require('../utils/AppError');
const { assertId } = require('../utils/validate');
const { toNum, pagination } = require('../utils/parse');
const { notify } = require('../utils/notify');

function readRating(value) {
  const rating = toNum(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new AppError('Rating must be a whole number from 1 to 5', 400);
  return rating;
}

exports.createReview = async (req, res) => {
  const body = req.body || {};
  assertId(body.applicationId, 'application id');
  const rating = readRating(body.rating);

  const app = await Application.findById(body.applicationId).populate('animal', 'name');
  if (!app) throw new AppError('Application not found', 404);
  if (!app.adopter.equals(req.user._id)) throw new AppError('You can only review your own adoptions', 403);
  if (app.status !== 'completed') throw new AppError('You can review a shelter once your adoption is completed', 409);
  if (await Review.exists({ application: app._id })) throw new AppError('You have already reviewed this adoption', 409);

  const review = await Review.create({
    shelter: app.shelter,
    adopter: req.user._id,
    application: app._id,
    rating,
    comment: body.comment,
  });

  await notify(app.shelter, {
    type: 'review',
    title: `New ${rating}-star review`,
    body: `${req.user.name} reviewed the adoption of ${app.animal?.name || 'an animal'}.`,
    link: `/shelters/${app.shelter}`,
  });

  res.status(201).json({ success: true, review });
};

exports.shelterReviews = async (req, res) => {
  assertId(req.params.shelterId, 'shelter id');
  const { page, limit, skip } = pagination(req.query, 10);
  const filter = { shelter: req.params.shelterId };
  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('adopter', 'name city')
      .populate({ path: 'application', select: 'animal type', populate: { path: 'animal', select: 'name species' } }),
    Review.countDocuments(filter),
  ]);
  res.json({ success: true, reviews, page, limit, total, totalPages: Math.ceil(total / limit) });
};

exports.myReviews = async (req, res) => {
  const reviews = await Review.find({ adopter: req.user._id })
    .sort({ createdAt: -1 })
    .populate({ path: 'shelter', select: 'name', populate: { path: 'shelterProfile', select: 'organisationName' } });
  res.json({ success: true, reviews });
};

exports.updateReview = async (req, res) => {
  assertId(req.params.id, 'review id');
  const review = await Review.findById(req.params.id);
  if (!review) throw new AppError('Review not found', 404);
  if (!review.adopter.equals(req.user._id)) throw new AppError('You can only edit your own review', 403);

  const body = req.body || {};
  if (body.rating !== undefined) review.rating = readRating(body.rating);
  if (body.comment !== undefined) review.comment = body.comment;
  await review.save();
  res.json({ success: true, review });
};

exports.deleteReview = async (req, res) => {
  assertId(req.params.id, 'review id');
  const review = await Review.findById(req.params.id);
  if (!review) throw new AppError('Review not found', 404);
  if (!review.adopter.equals(req.user._id) && req.user.role !== 'admin') {
    throw new AppError('You can only delete your own review', 403);
  }
  await review.deleteOne();
  await Review.calcShelterRating(review.shelter);
  const profile = await ShelterProfile.findOne({ user: review.shelter }).select('averageRating reviewCount');
  res.json({ success: true, rating: profile });
};
