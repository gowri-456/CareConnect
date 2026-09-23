const bcrypt = require("bcryptjs");
const User = require("../models/User");
const ProviderProfile = require("../models/ProviderProfile");
const generateToken = require("../utils/generateToken");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// POST /api/v1/auth/register
const register = catchAsync(async (req, res, next) => {
  const { name, email, password, role, phone } = req.body;

  if (!name || !email || !password) {
    return next(new AppError("Name, email and password are required.", 400));
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return next(new AppError("An account with this email already exists.", 400));
  }

  // Only allow these roles to self-register. Admin accounts should be created via seed/DB directly.
  const allowedSelfRoles = ["customer", "provider", "support_agent"];
  const finalRole = allowedSelfRoles.includes(role) ? role : "customer";

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role: finalRole,
    phone,
  });

  // If they registered as a provider, auto-create an empty provider profile for them
  if (finalRole === "provider") {
    await ProviderProfile.create({ user: user._id });
  }

  const token = generateToken(user);

  res.status(201).json({
    success: true,
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

// POST /api/v1/auth/login
const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Email and password are required.", 400));
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user) {
    return next(new AppError("Invalid email or password.", 401));
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return next(new AppError("Invalid email or password.", 401));
  }

  if (!user.isActive) {
    return next(new AppError("Your account has been deactivated.", 403));
  }

  const token = generateToken(user);

  res.status(200).json({
    success: true,
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

// GET /api/v1/auth/me
const getMe = catchAsync(async (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

module.exports = { register, login, getMe };
