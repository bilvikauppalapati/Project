export const SPECIES = ['dog', 'cat', 'rabbit', 'bird', 'other'];
export const SIZES = ['small', 'medium', 'large'];
export const GENDERS = ['male', 'female'];
export const ACTIVITY_LEVELS = ['low', 'medium', 'high'];
export const LISTING_TYPES = ['adoption', 'foster', 'both'];
export const ANIMAL_STATUSES = ['available', 'pending', 'adopted', 'fostered'];
export const HOME_TYPES = ['apartment', 'house'];
export const EXPERIENCE_LEVELS = ['none', 'some', 'experienced'];
export const PET_TYPES = ['dog', 'cat', 'rabbit', 'bird', 'other'];
export const SHELTER_TYPES = ['shelter', 'individual caregiver'];
export const MOODS = ['happy', 'okay', 'unwell'];
export const TEMPERAMENT_TAGS = [
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
];

export const MAX_PHOTOS = 5;
export const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
export const PASSWORD_HINT = 'At least 8 characters, with a letter, a number and a special character';

export const DEFAULT_LOCATION = { lat: 17.385, lng: 78.4867, city: 'Hyderabad' };

export const APPLICATION_STEPS = ['submitted', 'under_review', 'approved', 'completed'];

export const STATUS_STYLES = {
  available: 'bg-emerald-600 text-white',
  pending: 'bg-amber-400 text-forest',
  adopted: 'bg-forest text-white',
  fostered: 'bg-sky-600 text-white',
  submitted: 'bg-sky-100 text-sky-800',
  under_review: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-700',
  completed: 'bg-forest text-white',
  withdrawn: 'bg-stone-200 text-stone-600',
  upcoming: 'bg-sky-100 text-sky-800',
  due: 'bg-amber-100 text-amber-800',
  missed: 'bg-red-100 text-red-700',
};

export const SPECIES_EMOJI = { dog: '🐶', cat: '🐱', rabbit: '🐰', bird: '🐦', other: '🐾' };
export const MOOD_LABEL = { happy: '😄 Happy', okay: '🙂 Okay', unwell: '🤒 Unwell' };
