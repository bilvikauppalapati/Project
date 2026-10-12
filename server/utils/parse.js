const toBool = (v) => v === true || v === 'true' || v === 'on' || v === '1' || v === 1;

function toList(v) {
  if (v === undefined || v === null || v === '') return [];
  if (Array.isArray(v)) return v.flatMap(toList);
  const s = String(v).trim();
  if (s.startsWith('[')) {
    try {
      return toList(JSON.parse(s));
    } catch {
    }
  }
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function toNum(v) {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

function pagination(query, defaultLimit = 12, maxLimit = 50) {
  const page = Math.max(1, Math.floor(toNum(query.page) || 1));
  const limit = Math.min(maxLimit, Math.max(1, Math.floor(toNum(query.limit) || defaultLimit)));
  return { page, limit, skip: (page - 1) * limit };
}

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { toBool, toList, toNum, pagination, escapeRegex };
