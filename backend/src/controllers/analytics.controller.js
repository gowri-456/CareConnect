const Booking = require("../models/Booking");
const ProviderProfile = require("../models/ProviderProfile");
const Dispute = require("../models/Dispute");
const Invoice = require("../models/Invoice");
const catchAsync = require("../utils/catchAsync");

// GET /api/v1/analytics/bookings-summary  [admin, ops]
const bookingsSummary = catchAsync(async (req, res) => {
  const summary = await Booking.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  res.status(200).json({ success: true, data: summary });
});

// GET /api/v1/analytics/provider-performance  [admin, ops]
const providerPerformance = catchAsync(async (req, res) => {
  const providers = await ProviderProfile.find()
    .populate("user", "name email")
    .sort({ ratingAvg: -1 })
    .limit(20);

  res.status(200).json({ success: true, data: providers });
});

// GET /api/v1/analytics/disputes-summary  [admin, ops]
const disputesSummary = catchAsync(async (req, res) => {
  const summary = await Dispute.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  res.status(200).json({ success: true, data: summary });
});

const paymentSummary = catchAsync(async (req, res) => {
  const [totals, providers] = await Promise.all([
    Invoice.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, totalCollected: { $sum: "$total" }, platformFees: { $sum: "$platformFee" }, providerEarnings: { $sum: "$providerAmount" }, paidInvoices: { $sum: 1 } } },
    ]),
    Invoice.aggregate([
      { $match: { status: "paid" } },
      { $lookup: { from: "bookings", localField: "booking", foreignField: "_id", as: "booking" } },
      { $unwind: "$booking" },
      { $lookup: { from: "providerprofiles", localField: "booking.provider", foreignField: "_id", as: "provider" } },
      { $unwind: "$provider" },
      { $lookup: { from: "users", localField: "provider.user", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      { $group: { _id: "$provider._id", providerName: { $first: "$user.name" }, totalCollected: { $sum: "$total" }, providerEarnings: { $sum: "$providerAmount" }, platformFees: { $sum: "$platformFee" }, paidInvoices: { $sum: 1 } } },
      { $sort: { providerEarnings: -1 } },
    ]),
  ]);
  res.status(200).json({ success: true, data: { totals: totals[0] || { totalCollected: 0, platformFees: 0, providerEarnings: 0, paidInvoices: 0 }, providers } });
});

const providerEarnings = catchAsync(async (req, res) => {
  const profile = await ProviderProfile.findOne({ user: req.user._id }).select("_id");
  if (!profile) return res.status(200).json({ success: true, data: { totalCollected: 0, providerEarnings: 0, platformFees: 0, paidInvoices: 0 } });
  const [summary] = await Invoice.aggregate([
    { $match: { status: "paid" } },
    { $lookup: { from: "bookings", localField: "booking", foreignField: "_id", as: "booking" } },
    { $unwind: "$booking" },
    { $match: { "booking.provider": profile._id } },
    { $group: { _id: null, totalCollected: { $sum: "$total" }, providerEarnings: { $sum: "$providerAmount" }, platformFees: { $sum: "$platformFee" }, paidInvoices: { $sum: 1 } } },
  ]);
  res.status(200).json({ success: true, data: summary || { totalCollected: 0, providerEarnings: 0, platformFees: 0, paidInvoices: 0 } });
});

module.exports = { bookingsSummary, providerPerformance, disputesSummary, paymentSummary, providerEarnings };
