import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

const pin = (bg, content, size = 38) =>
  L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${bg};border:3px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,.3);display:grid;place-items:center"><span style="transform:rotate(45deg);font-size:${Math.round(size * 0.45)}px;line-height:1">${content}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });

export const shelterIcon = pin('#1f3b33', '🏠', 42);
export const verifiedShelterIcon = pin('#059669', '🏠', 42);
export const youIcon = L.divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.25)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const SPECIES_PIN = { dog: '🐶', cat: '🐱', rabbit: '🐰', bird: '🐦', other: '🐾' };
const cache = {};
export const animalIcon = (species) => (cache[species] ||= pin('#f0a04b', SPECIES_PIN[species] || '🐾', 34));

export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
