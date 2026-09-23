const Quote = require("../models/Quote");
const Booking = require("../models/Booking");
const Job = require("../models/Job");
const ServiceRequest = require("../models/ServiceRequest");
const AvailabilitySlot = require("../models/AvailabilitySlot");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const { notify } = require("../services/notification.service");

function isOperationsRole(role) {
  return ["admin", "ops_manager", "support_agent"].includes(role);
}

async function canAccessBooking(booking, user) {
  if (isOperationsRole(user.role)) return true;
  if (String(booking.customer) === String(user._id)) return true;
  if (user.role === "provider") {
    const ProviderProfile = require("../models/ProviderProfile");
    const profile = await ProviderProfile.findOne({ user: user._id }).select("_id");
    return profile && String(booking.provider) === String(profile._id);
  }
  return false;
}

// PATCH /api/v1/quotes/:id/accept  [customer]
// This is the key "request-to-book" step: accepting a quote creates the
// Booking, creates its Job, marks the slot (if provided) as booked, and
// rejects all other quotes on that request.
const acceptQuote = catchAsync(async (req, res, next) => {
  const { slotId } = req.body; // optional - a specific AvailabilitySlot to reserve

  const quote = await Quote.findById(req.params.id);
  if (!quote) return next(new AppError("Quote not found.", 404));
  if (quote.status !== "submitted") return next(new AppError("This quote is no longer available.", 400));

  const request = await ServiceRequest.findById(quote.serviceRequest);
  if (!request) return next(new AppError("Service request not found.", 404));
  if (!["open_for_quotes", "quoted"].includes(request.status)) {
    return next(new AppError("This request is no longer available for booking.", 400));
  }
  if (String(request.customer) !== String(req.user._id)) {
    return next(new AppError("You do not have permission to accept this quote.", 403));
  }

  let slot = null;
  if (slotId) {
    slot = await AvailabilitySlot.findById(slotId);
    if (!slot) return next(new AppError("Availability slot not found.", 404));
    if (slot.isBooked) return next(new AppError("This slot is already booked.", 400));
    if (String(slot.provider) !== String(quote.provider)) {
      return next(new AppError("This slot does not belong to the quoting provider.", 400));
    }
  }

  // 1. Accept this quote, reject all others on the same request
  quote.status = "accepted";
  await quote.save();
  await Quote.updateMany(
    { serviceRequest: request._id, _id: { $ne: quote._id }, status: "submitted" },
    { status: "rejected" }
  );

  // 2. Create the booking
  const booking = await Booking.create({
    serviceRequest: request._id,
    quote: quote._id,
    customer: request.customer,
    provider: quote.provider,
    slot: slot ? slot._id : null,
    scheduledDate: slot ? slot.startTime : request.preferredDate || new Date(),
  });

  // 3. Reserve the slot if one was chosen
  if (slot) {
    slot.isBooked = true;
    slot.booking = booking._id;
    await slot.save();
  }

  // 4. Create the job that tracks the actual work
  await Job.create({ booking: booking._id });

  // 5. Update the service request
  request.status = "booked";
  await request.save();

  await notify(request.customer, "booking_confirmed", "Your booking has been confirmed.", {
    type: "Booking",
    id: booking._id,
  });
  const providerProfile = await require("../models/ProviderProfile").findById(quote.provider).select("user");
  if (providerProfile) {
    await notify(providerProfile.user, "booking_confirmed", "A customer accepted your quote and created a booking.", {
      type: "Booking",
      id: booking._id,
    });
  }

  res.status(201).json({ success: true, data: booking });
});

// GET /api/v1/bookings  [role-scoped]
const getBookings = catchAsync(async (req, res) => {
  const filter = {};
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);

  if (req.user.role === "customer") {
    filter.customer = req.user._id;
  } else if (req.user.role === "provider") {
    const ProviderProfile = require("../models/ProviderProfile");
    const profile = await ProviderProfile.findOne({ user: req.user._id });
    filter.provider = profile ? profile._id : null;
  }
  // admin / ops_manager / support_agent see everything, optionally filtered:
  if (req.query.status) filter.status = req.query.status;

  const bookings = await Booking.find(filter)
    .populate("customer", "name email")
    .populate({ path: "provider", populate: { path: "user", select: "name email" } })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Booking.countDocuments(filter);
  res.status(200).json({ success: true, count: bookings.length, pagination: { page, limit, total, pages: Math.ceil(total / limit) }, data: bookings });
});

// GET /api/v1/bookings/:id
const getBookingById = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) return next(new AppError("Booking not found.", 404));
  if (!(await canAccessBooking(booking, req.user))) return next(new AppError("You do not have permission to view this booking.", 403));
  const populatedBooking = await Booking.findById(req.params.id)
    .populate("customer", "name email phone")
    .populate({ path: "provider", populate: { path: "user", select: "name email phone" } })
    .populate("serviceRequest")
    .populate("quote");
  res.status(200).json({ success: true, data: populatedBooking });
});

// PATCH /api/v1/bookings/:id/reschedule  [customer, provider, ops]
const rescheduleBooking = catchAsync(async (req, res, next) => {
  const { scheduledDate } = req.body;
  if (!scheduledDate) return next(new AppError("scheduledDate is required.", 400));

  const booking = await Booking.findById(req.params.id);
  if (!booking) return next(new AppError("Booking not found.", 404));
  if (!(await canAccessBooking(booking, req.user))) return next(new AppError("You do not have permission to reschedule this booking.", 403));
  if (["completed", "cancelled"].includes(booking.status)) return next(new AppError("This booking cannot be rescheduled.", 400));
  if (new Date(scheduledDate) <= new Date()) return next(new AppError("scheduledDate must be in the future.", 400));
  booking.scheduledDate = scheduledDate;
  await booking.save();

  res.status(200).json({ success: true, data: booking });
});

// PATCH /api/v1/bookings/:id/cancel
const cancelBooking = catchAsync(async (req, res, next) => {
  const { reason } = req.body;

  const booking = await Booking.findById(req.params.id);
  if (!booking) return next(new AppError("Booking not found.", 404));
  if (!(await canAccessBooking(booking, req.user))) return next(new AppError("You do not have permission to cancel this booking.", 403));
  if (["completed", "cancelled"].includes(booking.status)) {
    return next(new AppError("This booking cannot be cancelled.", 400));
  }

  booking.status = "cancelled";
  booking.cancellation = { by: req.user._id, reason: reason || "", at: new Date() };
  await booking.save();

  // Free up the slot again, if one was reserved
  if (booking.slot) {
    await AvailabilitySlot.findByIdAndUpdate(booking.slot, { isBooked: false, booking: null });
  }

  res.status(200).json({ success: true, data: booking });
});

module.exports = { acceptQuote, getBookings, getBookingById, rescheduleBooking, cancelBooking };
