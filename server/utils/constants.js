/**
 * Allowed values shared by the models, validators and the matching algorithm.
 * Keeping them in one place means a new tag or species only has to be added here.
 */
module.exports = {
  ROLES: ['adopter', 'shelter', 'admin'],

  SPECIES: ['dog', 'cat', 'rabbit', 'bird', 'other'],
  SIZES: ['small', 'medium', 'large'],
  GENDERS: ['male', 'female'],
  ENERGY_LEVELS: ['low', 'medium', 'high'],
  TEMPERAMENT_TAGS: [
    'friendly',
    'kid-friendly',
    'good with dogs',
    'good with cats',
    'energetic',
    'calm',
    'shy',
    'playful',
    'house-trained',
    'needs experienced owner',
  ],

  LISTING_TYPES: ['adoption', 'foster', 'both'],
  ANIMAL_STATUSES: ['available', 'pending', 'adopted', 'fostered'],

  // Application lifecycle: submitted -> under_review -> approved/rejected -> completed.
  // "withdrawn" lets an adopter cancel before a decision.
  APPLICATION_TYPES: ['adoption', 'foster'],
  APPLICATION_STATUSES: ['submitted', 'under_review', 'approved', 'rejected', 'completed', 'withdrawn'],

  HOME_TYPES: ['apartment', 'independent house', 'farm'],
  EXPERIENCE_LEVELS: ['none', 'some', 'experienced'],

  NOTIFICATION_TYPES: ['application', 'message', 'checkin', 'review', 'verification', 'system'],
  CHECKIN_STATUSES: ['upcoming', 'due', 'completed', 'missed'],

  // Post-adoption check-ins are scheduled this many days after the adoption is completed.
  CHECKIN_SCHEDULE: [
    { label: '1 week', days: 7 },
    { label: '1 month', days: 30 },
    { label: '3 months', days: 90 },
  ],

  // Used when the browser can't share a location.
  DEFAULT_LOCATION: { lat: 17.385, lng: 78.4867, city: 'Hyderabad' },
};
