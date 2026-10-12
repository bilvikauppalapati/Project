const EARTH_RADIUS_KM = 6378.1;

function distanceKm(pointA, pointB) {
  if (!pointA?.coordinates || !pointB?.coordinates) return undefined;
  const [lng1, lat1] = pointA.coordinates;
  const [lng2, lat2] = pointB.coordinates;
  const R = EARTH_RADIUS_KM;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

module.exports = { distanceKm, EARTH_RADIUS_KM };
