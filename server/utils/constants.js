module.exports = {
  ROLES: ['adopter', 'shelter', 'admin'],
  SHELTER_TYPES: ['shelter', 'individual caregiver'],

  SPECIES: ['dog', 'cat', 'rabbit', 'bird', 'other'],
  SIZES: ['small', 'medium', 'large'],
  GENDERS: ['male', 'female'],
  ACTIVITY_LEVELS: ['low', 'medium', 'high'],
  TEMPERAMENT_TAGS: [
    'friendly',
    'calm',
    'energetic',
    'playful',
    'kid-friendly',
    'good-with-dogs',
    'good-with-cats',
    'house-trained',
    'shy',
    'needs-experienced-owner',
  ],

  LISTING_TYPES: ['adoption', 'foster', 'both'],
  ANIMAL_STATUSES: ['available', 'pending', 'adopted', 'fostered'],

  APPLICATION_TYPES: ['adoption', 'foster'],
  APPLICATION_STATUSES: ['submitted', 'under_review', 'approved', 'rejected', 'completed', 'withdrawn'],
  ACTIVE_APPLICATION_STATUSES: ['submitted', 'under_review', 'approved'],

  HOME_TYPES: ['apartment', 'house'],
  EXPERIENCE_LEVELS: ['none', 'some', 'experienced'],
  PET_TYPES: ['dog', 'cat', 'rabbit', 'bird', 'other'],

  NOTIFICATION_TYPES: ['application', 'message', 'checkin', 'review', 'verification', 'system'],
  CHECKIN_STATUSES: ['upcoming', 'due', 'completed', 'missed'],
  MOODS: ['happy', 'okay', 'unwell'],

  CHECKIN_SCHEDULE: [
    { label: '1 week', days: 7 },
    { label: '1 month', days: 30 },
    { label: '3 months', days: 90 },
  ],

  MAX_PHOTOS: 5,
  PASSWORD_RULE: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/,
  PASSWORD_MESSAGE: 'Password must be at least 8 characters and include a letter, a number and a special character',

  DEFAULT_LOCATION: { lat: 17.385, lng: 78.4867, city: 'Hyderabad' },
};
