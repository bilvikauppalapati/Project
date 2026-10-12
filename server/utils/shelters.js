const ShelterProfile = require('../models/ShelterProfile');

const CARD_FIELDS = 'user organisationName type city isVerified averageRating reviewCount';

const shelterLookupStages = (localField = 'shelter', as = 'shelterProfile') => [
  {
    $lookup: {
      from: 'shelterprofiles',
      localField,
      foreignField: 'user',
      as,
      pipeline: [{ $project: { organisationName: 1, type: 1, city: 1, isVerified: 1, averageRating: 1, reviewCount: 1 } }],
    },
  },
  { $unwind: { path: `$${as}`, preserveNullAndEmptyArrays: true } },
];

async function profilesByUser(userIds) {
  const profiles = await ShelterProfile.find({ user: { $in: userIds } }).select(CARD_FIELDS).lean();
  return Object.fromEntries(profiles.map((p) => [String(p.user), p]));
}

async function attachProfiles(docs, field = 'shelter') {
  const ids = docs.map((d) => d[field]?._id || d[field]).filter(Boolean);
  const byUser = await profilesByUser(ids);
  return docs.map((d) => ({ ...d, shelterProfile: byUser[String(d[field]?._id || d[field])] || null }));
}

module.exports = { shelterLookupStages, profilesByUser, attachProfiles, CARD_FIELDS };
