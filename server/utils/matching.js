const { distanceKm } = require('./geo');

const WEIGHTS = {
  species: 15,
  size: 10,
  age: 5,
  kids: 15,
  otherPets: 15,
  activity: 10,
  home: 10,
  distance: 15,
  experience: 5,
};

const LEVEL = { low: 0, medium: 1, high: 2 };

const hasTag = (animal, tag) => (animal.temperamentTags || []).includes(tag);
const full = (factor, reason) => ({ points: WEIGHTS[factor], reason, good: true });
const part = (factor, share, reason, good = false) => ({ points: Math.round(WEIGHTS[factor] * share), reason, good });

function speciesFactor(prefs, animal) {
  const wanted = prefs.species || [];
  if (!wanted.length) return part('species', 0.8, 'Open to any species', true);
  return wanted.includes(animal.species) ? full('species', `You like ${animal.species}s`) : part('species', 0, `You prefer ${wanted.join('/')}s`);
}

function sizeFactor(prefs, animal) {
  const wanted = prefs.sizes || [];
  if (!wanted.length) return part('size', 0.8, 'Open to any size', true);
  return wanted.includes(animal.size) ? full('size', `${animal.size} size suits you`) : part('size', 0, `You prefer ${wanted.join('/')} animals`);
}

function ageFactor(prefs, animal) {
  const min = prefs.ageRange?.min;
  const max = prefs.ageRange?.max;
  if (min === undefined && max === undefined) return part('age', 0.8, 'Open to any age', true);
  const years = animal.ageMonths / 12;
  if ((min === undefined || years >= min) && (max === undefined || years <= max)) return full('age', 'In your preferred age range');
  return part('age', 0, 'Outside your preferred age range');
}

function kidsFactor(prefs, animal) {
  if (!prefs.hasKids) return full('kids', 'No kids to consider');
  if (hasTag(animal, 'kid-friendly')) return full('kids', 'Kid-friendly');
  if (hasTag(animal, 'shy') || hasTag(animal, 'needs-experienced-owner')) return part('kids', 0, 'May not suit a home with kids');
  return part('kids', 0.5, 'Not yet tested with kids');
}

function otherPetsFactor(prefs, animal) {
  const types = prefs.hasOtherPets ? prefs.otherPetTypes || [] : [];
  const checks = types.filter((t) => t === 'dog' || t === 'cat');
  if (!prefs.hasOtherPets) return full('otherPets', 'No other pets to consider');
  if (!checks.length) return part('otherPets', 0.7, 'Check how they get on with your pets', true);

  const okWith = checks.filter((t) => hasTag(animal, `good-with-${t}s`));
  const share = (okWith.length + (checks.length - okWith.length) * 0.3) / checks.length;
  if (okWith.length === checks.length) return part('otherPets', share, `Good with ${checks.map((t) => `${t}s`).join(' and ')}`, true);
  const missing = checks.filter((t) => !okWith.includes(t));
  return part('otherPets', share, `Not known to be good with ${missing.map((t) => `${t}s`).join(' or ')}`);
}

function activityFactor(prefs, animal) {
  const gap = Math.abs(LEVEL[prefs.activityLevel || 'medium'] - LEVEL[animal.activityLevel || 'medium']);
  if (gap === 0) return full('activity', `Matches your ${prefs.activityLevel || 'medium'} activity level`);
  if (gap === 1) return part('activity', 0.5, `${animal.activityLevel} energy, close to yours`);
  return part('activity', 0, `${animal.activityLevel} energy, very different from yours`);
}

function homeFactor(prefs, animal) {
  let share = 1;
  const notes = [];
  if (prefs.homeType === 'apartment' && animal.size === 'large') {
    share -= 0.6;
    notes.push('large for an apartment');
  }
  if (!prefs.hasYard && animal.activityLevel === 'high' && animal.species === 'dog') {
    share -= 0.4;
    notes.push('high-energy dog without a yard');
  }
  if (notes.length) return part('home', Math.max(0, share), `Home may be tight: ${notes.join(', ')}`);
  return full('home', prefs.hasYard ? 'Your yard is a bonus' : `Fits your ${prefs.homeType || 'home'}`);
}

function distanceFactor(prefs, km) {
  const max = prefs.maxDistanceKm || 25;
  if (km === undefined || km === null) return part('distance', 0.5, 'Distance unknown');
  if (km <= max / 2) return full('distance', `Within ${Math.max(1, Math.ceil(km))} km`);
  if (km <= max) return part('distance', 0.7, `${km} km away, inside your ${max} km range`, true);
  if (km <= max * 2) return part('distance', 0.3, `${km} km away, beyond your ${max} km range`);
  return part('distance', 0, `${km} km away, far outside your range`);
}

function experienceFactor(prefs, animal) {
  if (!hasTag(animal, 'needs-experienced-owner')) return full('experience', 'Good for first-time owners');
  if (prefs.experience === 'experienced') return full('experience', 'Needs an experienced owner, like you');
  if (prefs.experience === 'some') return part('experience', 0.5, 'Needs an experienced owner');
  return part('experience', 0, 'Needs an experienced owner');
}

function matchAnimal(adopter, animal, km) {
  const prefs = adopter?.preferences || {};
  const distance = km ?? distanceKm(adopter?.location, animal.location);

  const factors = {
    species: speciesFactor(prefs, animal),
    size: sizeFactor(prefs, animal),
    age: ageFactor(prefs, animal),
    kids: kidsFactor(prefs, animal),
    otherPets: otherPetsFactor(prefs, animal),
    activity: activityFactor(prefs, animal),
    home: homeFactor(prefs, animal),
    distance: distanceFactor(prefs, distance),
    experience: experienceFactor(prefs, animal),
  };

  const breakdown = Object.entries(factors).map(([factor, f]) => ({ factor, max: WEIGHTS[factor], ...f }));
  const score = breakdown.reduce((sum, f) => sum + f.points, 0);
  const reasons = breakdown
    .filter((f) => f.good && f.points === f.max && !/^No |^Open to|^Good for first/.test(f.reason))
    .map((f) => f.reason)
    .slice(0, 3);
  const concerns = breakdown.filter((f) => !f.good && f.points < f.max).map((f) => f.reason);

  return { score, reasons, concerns, breakdown };
}

module.exports = { matchAnimal, WEIGHTS };
