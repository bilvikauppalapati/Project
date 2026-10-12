const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    shelter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    adopter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true, unique: true },
    rating: { type: Number, required: [true, 'Rating is required'], min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

reviewSchema.index({ shelter: 1, createdAt: -1 });

reviewSchema.statics.calcShelterRating = async function calcShelterRating(shelterUserId) {
  const [stats] = await this.aggregate([
    { $match: { shelter: new mongoose.Types.ObjectId(String(shelterUserId)) } },
    { $group: { _id: '$shelter', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  await mongoose.model('ShelterProfile').updateOne(
    { user: shelterUserId },
    {
      averageRating: stats ? Math.round(stats.avg * 10) / 10 : 0,
      reviewCount: stats ? stats.count : 0,
    }
  );
};

reviewSchema.post('save', async function updateRating() {
  await this.constructor.calcShelterRating(this.shelter);
});

module.exports = mongoose.model('Review', reviewSchema);
