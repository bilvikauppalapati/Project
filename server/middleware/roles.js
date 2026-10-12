const AppError = require('../utils/AppError');

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(`This action requires role: ${roles.join(' or ')}`, 403);
    }
    next();
  };
}

module.exports = { authorize };
