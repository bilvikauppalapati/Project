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

  APPLICATION_TYPES: ['adoption', 'foster'],
  APPLICATION_STATUSES: ['submitted', 'under_review', 'approved', 'rejected', 'completed', 'withdrawn'],

  HOME_TYPES: ['apartment', 'independent house', 'farm'],
  EXPERIENCE_LEVELS: ['none', 'some', 'experienced'],

  NOTIFICATION_TYPES: ['application', 'message', 'checkin', 'review', 'verification', 'system'],
  CHECKIN_STATUSES: ['upcoming', 'due', 'completed', 'missed'],

  CHECKIN_SCHEDULE: [
    { label: '1 week', days: 7 },
    { label: '1 month', days: 30 },
    { label: '3 months', days: 90 },
  ],

  DEFAULT_LOCATION: { lat: 17.385, lng: 78.4867, city: 'Hyderabad' },
};
