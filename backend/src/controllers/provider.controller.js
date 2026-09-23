const ProviderProfile = require("../models/ProviderProfile");
const AuditLog = require("../models/AuditLog");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// GET /api/v1/providers  [public] - search/filter providers
const getProviders = catchAsync(async (req, res) => {
  const filter = {};

  if (req.query.skill) filter.skills = req.query.skill;
  if (req.query.city) filter.serviceAreas = req.query.city;
  if (req.query.verificationStatus) filter.verificationStatus = req.query.verificationStatus;
  if (req.query.available === "true") filter.isAvailableForWork = true;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 24, 1), 100);

  const [providers, total] = await Promise.all([
    ProviderProfile.find(filter).populate("user", "name email phone profilePicture").sort({ ratingAvg: -1 }).skip((page - 1) * limit).limit(limit),
    ProviderProfile.countDocuments(filter),
  ]);
  const favoriteIds = req.user?.role === "customer" ? (req.user.favorites || []).map(String) : [];
  res.status(200).json({ success: true, count: providers.length, pagination: { page, limit, total, pages: Math.ceil(total / limit) }, data: providers.map((provider) => ({ ...provider.toObject(), isFavorite: favoriteIds.includes(String(provider._id)) })) });
});

// GET /api/v1/providers/:id  [public]
const getProviderById = catchAsync(async (req, res, next) => {
  const provider = await ProviderProfile.findById(req.params.id).populate("user", "name email phone");
  if (!provider) return next(new AppError("Provider not found.", 404));
  res.status(200).json({ success: true, data: provider });
});

// GET /api/v1/providers/me  [provider]
const getMyProviderProfile = catchAsync(async (req, res, next) => {
  const profile = await ProviderProfile.findOne({ user: req.user._id });
  if (!profile) return next(new AppError("Provider profile not found.", 404));
  res.status(200).json({ success: true, data: profile });
});

// PATCH /api/v1/providers/me  [provider] - update own profile
const updateMyProviderProfile = catchAsync(async (req, res, next) => {
  const { bio, skills, serviceAreas, experienceYears, hourlyRate, isAvailableForWork, location } = req.body;
  const safeLocation = location && Number.isFinite(Number(location.latitude)) && Number.isFinite(Number(location.longitude))
    ? { latitude: Number(location.latitude), longitude: Number(location.longitude) }
    : { latitude: null, longitude: null };

  const profile = await ProviderProfile.findOneAndUpdate(
    { user: req.user._id },
    { bio, skills, serviceAreas, experienceYears, hourlyRate, isAvailableForWork, location: safeLocation },
    { new: true, runValidators: true, upsert: true } // upsert in case profile wasn't auto-created
  );

  res.status(200).json({ success: true, data: profile });
});

// POST /api/v1/providers/me/documents  [provider] - add a verification document
const addMyDocument = catchAsync(async (req, res, next) => {
  const { type, url } = req.body;
  if (!type || !url) return next(new AppError("Document type and url are required.", 400));

  const profile = await ProviderProfile.findOneAndUpdate(
    { user: req.user._id },
    { $push: { documents: { type, url, status: "pending" } } },
    { new: true }
  );
  if (!profile) return next(new AppError("Provider profile not found.", 404));

  res.status(200).json({ success: true, data: profile });
});

// PATCH /api/v1/providers/:id/verify  [admin] - approve or reject a provider
const verifyProvider = catchAsync(async (req, res, next) => {
  const { verificationStatus } = req.body; // "verified" or "rejected"
  if (!["verified", "rejected", "pending"].includes(verificationStatus)) {
    return next(new AppError("verificationStatus must be verified, rejected, or pending.", 400));
  }

  const profile = await ProviderProfile.findByIdAndUpdate(
    req.params.id,
    { verificationStatus },
    { new: true }
  );
  if (!profile) return next(new AppError("Provider not found.", 404));

  await AuditLog.create({
    actor: req.user._id,
    action: "provider.verify",
    entityType: "ProviderProfile",
    entityId: profile._id,
    details: { verificationStatus },
  });

  res.status(200).json({ success: true, data: profile });
});

module.exports = {
  getProviders,
  getProviderById,
  getMyProviderProfile,
  updateMyProviderProfile,
  addMyDocument,
  verifyProvider,
};
