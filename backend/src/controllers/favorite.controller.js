const User = require("../models/User");
const ProviderProfile = require("../models/ProviderProfile");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

const toggleFavorite = catchAsync(async (req, res, next) => {
  const provider = await ProviderProfile.findById(req.params.id).select("_id");
  if (!provider) return next(new AppError("Provider not found.", 404));
  const favorites = (req.user.favorites || []).map(String);
  const isFavorite = !favorites.includes(String(provider._id));
  await User.findByIdAndUpdate(req.user._id, isFavorite ? { $addToSet: { favorites: provider._id } } : { $pull: { favorites: provider._id } });
  res.status(200).json({ success: true, data: { isFavorite } });
});

const getFavorites = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id).select("favorites").populate({ path: "favorites", populate: { path: "user", select: "name email phone profilePicture" } });
  res.status(200).json({ success: true, data: user.favorites || [] });
});

module.exports = { toggleFavorite, getFavorites };