const Dispute = require("../models/Dispute");
const Booking = require("../models/Booking");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const { notify } = require("../services/notification.service");

// POST /api/v1/disputes  [customer, provider]
const createDispute = catchAsync(async (req, res, next) => {
  const { bookingId, type, description } = req.body;
  if (!bookingId || !description) {
    return next(new AppError("bookingId and description are required.", 400));
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) return next(new AppError("Booking not found.", 404));

  let canRaise = String(booking.customer) === String(req.user._id);
  if (req.user.role === "provider") {
    const ProviderProfile = require("../models/ProviderProfile");
    const profile = await ProviderProfile.findOne({ user: req.user._id }).select("_id");
    canRaise = Boolean(profile && String(booking.provider) === String(profile._id));
  }
  if (!canRaise) return next(new AppError("Only the customer or assigned provider can raise this dispute.", 403));

  const dispute = await Dispute.create({
    booking: bookingId,
    raisedBy: req.user._id,
    type,
    description,
  });

  booking.status = "disputed";
  await booking.save();

  res.status(201).json({ success: true, data: dispute });
});

// GET /api/v1/disputes  [support_agent, admin]
const getDisputes = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;

  const disputes = await Dispute.find(filter)
    .populate("raisedBy", "name email role")
    .populate("assignedAgent", "name email")
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: disputes.length, data: disputes });
});

// GET /api/v1/disputes/:id
const getDisputeById = catchAsync(async (req, res, next) => {
  const dispute = await Dispute.findById(req.params.id)
    .populate("raisedBy", "name email role")
    .populate("assignedAgent", "name email")
    .populate("booking");
  if (!dispute) return next(new AppError("Dispute not found.", 404));
  res.status(200).json({ success: true, data: dispute });
});

// PATCH /api/v1/disputes/:id/assign  [admin]
const assignDispute = catchAsync(async (req, res, next) => {
  const { agentId } = req.body;
  if (!agentId) return next(new AppError("agentId is required.", 400));

  const dispute = await Dispute.findByIdAndUpdate(
    req.params.id,
    { assignedAgent: agentId, status: "investigating" },
    { new: true }
  );
  if (!dispute) return next(new AppError("Dispute not found.", 404));

  res.status(200).json({ success: true, data: dispute });
});

// PATCH /api/v1/disputes/:id/resolve  [support_agent]
const resolveDispute = catchAsync(async (req, res, next) => {
  const { outcome, notes, refundAmount } = req.body;
  if (!outcome) return next(new AppError("outcome is required.", 400));

  const dispute = await Dispute.findByIdAndUpdate(
    req.params.id,
    {
      status: "resolved",
      resolution: { outcome, notes, refundAmount: refundAmount || 0, resolvedAt: new Date() },
    },
    { new: true }
  );
  if (!dispute) return next(new AppError("Dispute not found.", 404));

  await notify(dispute.raisedBy, "dispute_resolved", `Your dispute has been resolved: ${outcome}`, {
    type: "Dispute",
    id: dispute._id,
  });

  res.status(200).json({ success: true, data: dispute });
});

module.exports = { createDispute, getDisputes, getDisputeById, assignDispute, resolveDispute };
