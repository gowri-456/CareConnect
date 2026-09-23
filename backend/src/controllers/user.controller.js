const User = require("../models/User");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// GET /api/v1/users  [admin only]
const getAllUsers = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true";
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ]);
  res.status(200).json({ success: true, count: users.length, pagination: { page, limit, total, pages: Math.ceil(total / limit) }, data: users });
});

// GET /api/v1/users/:id  [admin or self]
const getUserById = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError("User not found.", 404));
  res.status(200).json({ success: true, data: user });
});

// PATCH /api/v1/users/:id  [admin or self]
const updateUser = catchAsync(async (req, res, next) => {
  const { name, phone, profilePicture } = req.body;
  if (req.user.role !== "admin" && req.user._id.toString() !== req.params.id) {
    return next(new AppError("You can only update your own profile.", 403));
  }
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { name, phone, profilePicture },
    { new: true, runValidators: true }
  );
  if (!user) return next(new AppError("User not found.", 404));
  res.status(200).json({ success: true, data: user });
});

// PATCH /api/v1/users/:id/status  [admin only] - activate/deactivate an account
const updateUserStatus = catchAsync(async (req, res, next) => {
  const { isActive } = req.body;
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive },
    { new: true }
  );
  if (!user) return next(new AppError("User not found.", 404));
  res.status(200).json({ success: true, data: user });
});

// DELETE /api/v1/users/:id [admin only]
const deleteUser = catchAsync(async (req, res, next) => {
  if (req.user._id.toString() === req.params.id) {
    return next(new AppError("You cannot delete your own admin account.", 400));
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return next(new AppError("User not found.", 404));
  res.status(200).json({ success: true, message: "User deleted." });
});

module.exports = { getAllUsers, getUserById, updateUser, updateUserStatus, deleteUser };
