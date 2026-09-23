// Central error handler. Any error passed to next(err) ends up here.
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : "Something went wrong on the server.";

  if (!err.isOperational) {
    // Log unexpected/programming errors so we can debug them
    console.error("UNEXPECTED ERROR:", err);
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
}

// Catches requests to routes that don't exist
function notFound(req, res, next) {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
}

module.exports = { errorHandler, notFound };
