const { distanceKm } = require('./geo');

const WEIGHTS = {
  species: 20,
  size: 15,
  kids: 15,
  otherPets: 15,
  activity: 15,
  distance: 15,
  experience: 5,
};

const ENERGY_RANK = { low: 0, medium: 1, high: 2 };

const has = (animal, tag) => (animal.temperament || []).includes(tag);

function speciesFactor(prefs, animal) {
  const wanted = prefs.species || [];
  if (!wanted.length) return { points: WEIGHTS.species, reason: 'No species preference' };
  return wanted.includes(animal.species)
    ? { points: WEIGHTS.species, reason: `You prefer ${animal.species}s` }
    : { points: 0, reason: `You prefer ${wanted.join('/')}` };
}

function sizeFactor(prefs, animal) {
  const wanted = prefs.sizes || [];
  if (!wanted.length) return { points: WEIGHTS.size, reason: 'No size preference' };
  return wanted.includes(animal.size)
    ? { points: WEIGHTS.size, reason: `${animal.size} size suits you` }
    : { points: 0, reason: `You prefer ${wanted.join('/')} animals` };
}

function kidsFactor(prefs, animal) {
  if (!prefs.hasKids) return { points: WEIGHTS.kids, reason: 'No kids at home' };
  if (has(animal, 'kid-friendly')) return { points: WEIGHTS.kids, reason: 'Kid-friendly' };
  if (has(animal, 'shy') || has(animal, 'needs experienced owner')) {
    return { points: 0, reason: 'May not be comfortable around kids' };
  }
  return { points: Math.round(WEIGHTS.kids / 2), reason: 'Not tested with kids' };
}

function otherPetsFactor(prefs, animal) {
  const needs = [];
  if (prefs.hasDogs) needs.push(['dogs', 'good with dogs']);
  if (prefs.hasCats) needs.push(['cats', 'good with cats']);
  if (!needs.length) return { points: WEIGHTS.otherPets, reason: 'No other pets at home' };

  const ok = needs.filter(([, tag]) => has(animal, tag)).map(([pet]) => pet);
  const missing = needs.filter(([, tag]) => !has(animal, tag)).map(([pet]) => pet);
  const share = (ok.length + missing.length * 0.3) / needs.length;
  const points = Math.round(WEIGHTS.otherPets * share);

  if (!missing.length) return { points, reason: `Good with your ${ok.join(' and ')}` };
  return { points, reason: `Not known to be good with ${missing.join(' or ')}` };
}

function activityFactor(prefs, animal) {
  const gap = Math.abs(ENERGY_RANK[prefs.activityLevel || 'medium'] - ENERGY_RANK[animal.energyLevel || 'medium']);
  if (gap === 0) return { points: WEIGHTS.activity, reason: `Energy level matches your ${prefs.activityLevel || 'medium'} lifestyle` };
  if (gap === 1) return { points: Math.round(WEIGHTS.activity / 2), reason: `Energy level is ${animal.energyLevel}, close to yours` };
  return { points: 0, reason: `Energy level is ${animal.energyLevel}, very different from yours` };
}

function distanceFactor(prefs, animal, km) {
  const max = prefs.maxDistanceKm || 25;
  if (km === undefined) return { points: Math.round(WEIGHTS.distance / 2), reason: 'Distance unknown' };
  if (km <= max / 2) return { points: WEIGHTS.distance, reason: `${km} km away` };
  if (km <= max) return { points: Math.round(WEIGHTS.distance * 0.7), reason: `${km} km away, within your ${max} km range` };
  if (km <= max * 2) return { points: Math.round(WEIGHTS.distance * 0.3), reason: `${km} km away, beyond your ${max} km range` };
  return { points: 0, reason: `${km} km away, far outside your range` };
}

function experienceFactor(prefs, animal) {
  if (!has(animal, 'needs experienced owner')) return { points: WEIGHTS.experience, reason: 'Suitable for first-time owners' };
  const level = prefs.experience || 'none';
  if (level === 'experienced') return { points: WEIGHTS.experience, reason: 'Needs an experienced owner, like you' };
  if (level === 'some') return { points: Math.round(WEIGHTS.experience / 2), reason: 'Needs an experienced owner' };
  return { points: 0, reason: 'Needs an experienced owner' };
}

function matchAnimal(adopter, animal, km) {
  const prefs = adopter.preferences || {};
  const distance = km !== undefined ? km : distanceKm(adopter.location, animal.location);

  const factors = {
    species: speciesFactor(prefs, animal),
    size: sizeFactor(prefs, animal),
    kids: kidsFactor(prefs, animal),
    otherPets: otherPetsFactor(prefs, animal),
    activity: activityFactor(prefs, animal),
    distance: distanceFactor(prefs, animal, distance),
    experience: experienceFactor(prefs, animal),
  };

  const breakdown = Object.entries(factors).map(([factor, f]) => ({ factor, max: WEIGHTS[factor], ...f }));
  const score = breakdown.reduce((sum, f) => sum + f.points, 0);

  return { score, breakdown };
}

module.exports = { matchAnimal, WEIGHTS };
