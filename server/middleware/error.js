const AppError = require('../utils/AppError');

function notFound(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let details = err.details;

  if (err.name === 'ValidationError') {
    status = 400;
    details = Object.fromEntries(Object.entries(err.errors).map(([field, e]) => [field, e.message]));
    message = `Validation failed: ${Object.values(details).join(', ')}`;
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for ${err.path}: ${JSON.stringify(err.value)}`;
  } else if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `That ${field} is already in use`;
  } else if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Image too large (max 5 MB)' : err.message;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON';
  }

  if (status >= 500) console.error(err);

  res.status(status).json({ success: false, message, ...(details && { details }) });
}

module.exports = { notFound, errorHandler };
