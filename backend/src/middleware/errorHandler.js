function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error.code === 11000) {
    if (error.keyPattern?.email || error.message?.includes("email")) {
      return res.status(400).json({ success: false, message: "An account with this email already exists." });
    }
    return res.status(400).json({ success: false, message: "A duplicate record already exists in the system." });
  }

  console.error("Request failed:", error);
  return res.status(500).json({ success: false, message: error.message || "Something went wrong on the server." });
}

module.exports = { errorHandler, notFound };