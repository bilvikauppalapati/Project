const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');

/**
 * protect: only lets the request through if it carries a valid JWT.
 *
 * Flow:
 *   1. The client sends `Authorization: Bearer <token>`.
 *   2. We verify the token's signature with JWT_SECRET (so it can't be forged) and its expiry.
 *   3. We load the user from the DB and attach it as `req.user` for the controllers.
 */
async function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new AppError('Not logged in. Please log in to continue.', 401);

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : 'Invalid token.';
    throw new AppError(msg, 401);
  }

  const user = await User.findById(payload.id);
  if (!user) throw new AppError('The user for this token no longer exists.', 401);

  req.user = user;
  next();
}

/**
 * optionalAuth: like protect, but never rejects.
 * Used on public routes (e.g. browsing animals) that show extra info, like match %, when logged in.
 */
async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
      req.user = await User.findById(payload.id);
    } catch {
      // A bad token on a public route is ignored: the request continues as a guest.
    }
  }
  next();
}

/**
 * authorize('shelter', 'admin'): role-based access. Must run after protect.
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(`This action requires role: ${roles.join(' or ')}`, 403);
    }
    next();
  };
}

module.exports = { protect, optionalAuth, authorize };
