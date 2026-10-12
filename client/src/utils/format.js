import { API_ORIGIN } from '../api/client';

export const cap = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);

export const label = (s = '') => cap(String(s).replace(/[_-]/g, ' '));

export function ageLabel(months) {
  if (months === undefined || months === null) return '';
  if (months < 12) return `${months} month${months === 1 ? '' : 's'}`;
  const years = months / 12;
  const rounded = Number.isInteger(years) ? years : Math.round(years * 2) / 2;
  return `${rounded} year${rounded === 1 ? '' : 's'}`;
}

export function imageUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${API_ORIGIN}${path}`;
}

export function timeAgo(date) {
  if (!date) return '';
  const seconds = Math.round((Date.now() - new Date(date).getTime()) / 1000);
  if (Math.abs(seconds) < 45) return 'just now';
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [name, size] of units) {
    const value = Math.floor(Math.abs(seconds) / size);
    if (value >= 1) return seconds > 0 ? `${value} ${name}${value > 1 ? 's' : ''} ago` : `in ${value} ${name}${value > 1 ? 's' : ''}`;
  }
  return 'just now';
}

export const formatDate = (date) =>
  date ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const formatTime = (date) =>
  date ? new Date(date).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '';

export const profileOf = (entity) => entity?.shelterProfile || (entity?.organisationName ? entity : null);

export const shelterName = (entity) => profileOf(entity)?.organisationName || entity?.name || 'Shelter';

export const isCaregiver = (entity) => profileOf(entity)?.type === 'individual caregiver';

export const displayName = (user) => (user?.role === 'shelter' ? shelterName(user) : user?.name || 'User');

export function getBrowserLocation(timeout = 8000) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout, maximumAge: 10 * 60 * 1000 }
    );
  });
}
