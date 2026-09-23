const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const catchAsync = require("../utils/catchAsync");

// Verifies the JWT sent in the Authorization header and attaches the user to req.user
const authenticate = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("You are not logged in. Please log in to continue.", 401));
  }

  const token = authHeader.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return next(new AppError("Invalid or expired token. Please log in again.", 401));
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new AppError("The user belonging to this token no longer exists.", 401));
  }
  if (!user.isActive) {
    return next(new AppError("Your account has been deactivated.", 403));
  }

  req.user = user; // now available in every controller after this middleware
  next();
});

// Restricts a route to specific roles. Usage: authorize("admin", "ops_manager")
function authorize(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user.role === "manager" ? "ops_manager" : req.user.role;
    if (!allowedRoles.includes(userRole)) {
      return next(new AppError("You do not have permission to perform this action.", 403));
    }
    next();
  };
}

module.exports = { authenticate, authorize };
