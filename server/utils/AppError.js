/**
 * An error with an HTTP status code.
 * Throw it from any controller (e.g. `throw new AppError('Animal not found', 404)`)
 * and the central error handler turns it into a JSON response.
 */
class AppError extends Error {
  constructor(message, statusCode = 400, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details; // optional extra info, e.g. per-field validation errors
  }
}

module.exports = AppError;
