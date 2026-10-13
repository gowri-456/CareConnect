const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function authenticate(req, res, next) {
  const authorization = req.headers.authorization || "";
  if (!authorization.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "You are not logged in. Please log in to continue." });
  }

  try {
    const { id } = jwt.verify(authorization.slice(7), process.env.JWT_SECRET);
    const user = await User.findById(id);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: "Invalid or inactive account." });
    }
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token. Please log in again." });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    const role = req.user?.role === "manager" ? "ops_manager" : req.user?.role;
    if (!roles.includes(role)) {
      return res.status(403).json({ success: false, message: "You do not have permission to perform this action." });
    }
    return next();
  };
}

module.exports = { authenticate, authorize };