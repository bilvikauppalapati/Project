const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');

const loadUser = (id) => User.findById(id).populate('shelterProfile');

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

  const user = await loadUser(payload.id);
  if (!user) throw new AppError('The user for this token no longer exists.', 401);

  req.user = user;
  next();
}

async function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
      req.user = await loadUser(payload.id);
    } catch {
      req.user = undefined;
    }
  }
  next();
}

module.exports = { protect, optionalAuth, loadUser };
