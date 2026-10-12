const jwt = require('jsonwebtoken');

/**
 * Creates a signed JWT for a user.
 * The payload only holds the user id and role; everything else is loaded from the DB on each request.
 */
function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

module.exports = { signToken };
