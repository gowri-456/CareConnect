// A simple custom error class so controllers can throw errors with a status code.
// Example: throw new AppError("Booking not found", 404);
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // marks this as a "known" error, not a bug
  }
}

module.exports = AppError;
