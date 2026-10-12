/**
 * Helpers to read form values. Multipart forms (used for photo uploads) send everything as strings,
 * so "true", "3" and "friendly,calm" need converting to real types.
 */

// "true" / "on" / "1" / true -> true
const toBool = (v) => v === true || v === 'true' || v === 'on' || v === '1' || v === 1;

// Accepts an array, a JSON array string '["a","b"]', or a comma list "a,b". Returns trimmed non-empty strings.
function toList(v) {
  if (v === undefined || v === null || v === '') return [];
  if (Array.isArray(v)) return v.flatMap(toList);
  const s = String(v).trim();
  if (s.startsWith('[')) {
    try {
      return toList(JSON.parse(s));
    } catch {
      /* not JSON: fall through to comma split */
    }
  }
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

// Number or undefined (for optional numeric query params).
function toNum(v) {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

// Reads ?page=&limit= with sensible bounds.
function pagination(query, defaultLimit = 12, maxLimit = 50) {
  const page = Math.max(1, Math.floor(toNum(query.page) || 1));
  const limit = Math.min(maxLimit, Math.max(1, Math.floor(toNum(query.limit) || defaultLimit)));
  return { page, limit, skip: (page - 1) * limit };
}

// Escapes user text before using it inside a RegExp (so "(" or "*" can't break the query).
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { toBool, toList, toNum, pagination, escapeRegex };
