const Review = require("../models/Review");
const Booking = require("../models/Booking");
const ProviderProfile = require("../models/ProviderProfile");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// POST /api/v1/bookings/:id/review  [customer, provider]
const createReview = catchAsync(async (req, res, next) => {
  const { rating, comment } = req.body;
  if (!rating) return next(new AppError("rating is required.", 400));

  const booking = await Booking.findById(req.params.id);
  if (!booking) return next(new AppError("Booking not found.", 404));
  if (booking.status !== "completed") {
    return next(new AppError("You can only review a completed booking.", 400));
  }

  const isCustomer = String(booking.customer) === String(req.user._id);
  let reviewerRole = "customer";
  let ratedUser = null;
  if (isCustomer) {
    ratedUser = (await ProviderProfile.findById(booking.provider).select("user")).user;
  } else if (req.user.role === "provider") {
    const profile = await ProviderProfile.findOne({ user: req.user._id }).select("_id");
    if (!profile || String(profile._id) !== String(booking.provider)) return next(new AppError("Only the booking participants can leave a rating.", 403));
    reviewerRole = "provider";
    ratedUser = booking.customer;
  } else return next(new AppError("Only the booking participants can leave a rating.", 403));

  const existing = await Review.findOne({ booking: booking._id, reviewer: req.user._id });
  if (existing) return next(new AppError("You have already reviewed this booking.", 400));

  const review = await Review.create({
    booking: booking._id,
    customer: booking.customer,
    provider: booking.provider,
    reviewer: req.user._id,
    ratedUser,
    reviewerRole,
    rating,
    comment,
  });

  // Recalculate the provider's average rating
  const providerReviews = await Review.find({ provider: booking.provider, reviewerRole: { $in: ["customer", null] } });
  const avg =
    providerReviews.reduce((sum, r) => sum + r.rating, 0) / providerReviews.length;

  await ProviderProfile.findByIdAndUpdate(booking.provider, {
    ratingAvg: Number(avg.toFixed(2)),
    ratingCount: providerReviews.length,
  });

  if (reviewerRole === "provider") {
    const User = require("../models/User");
    const customerReviews = await Review.find({ ratedUser, reviewerRole: "provider" });
    const score = customerReviews.reduce((sum, item) => sum + item.rating, 0) / customerReviews.length;
    await User.findByIdAndUpdate(ratedUser, { customerReliabilityScore: Number(score.toFixed(2)), customerReliabilityCount: customerReviews.length });
  }

  res.status(201).json({ success: true, data: review });
});

// GET /api/v1/providers/:id/reviews  [public]
const getReviewsForProvider = catchAsync(async (req, res) => {
  const reviews = await Review.find({ provider: req.params.id })
    .populate("customer", "name")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: reviews.length, data: reviews });
});

module.exports = { createReview, getReviewsForProvider };
