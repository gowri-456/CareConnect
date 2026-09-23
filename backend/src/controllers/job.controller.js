const Job = require("../models/Job");
const Booking = require("../models/Booking");
const Invoice = require("../models/Invoice");
const Quote = require("../models/Quote");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");
const { notify } = require("../services/notification.service");

async function getBookingForUser(bookingId, user) {
  const booking = await Booking.findById(bookingId);
  if (!booking) return null;
  if (["admin", "ops_manager", "support_agent"].includes(user.role)) return booking;
  if (String(booking.customer) === String(user._id)) return booking;
  if (user.role === "provider") {
    const ProviderProfile = require("../models/ProviderProfile");
    const profile = await ProviderProfile.findOne({ user: user._id }).select("_id");
    if (profile && String(booking.provider) === String(profile._id)) return booking;
  }
  return false;
}

// GET /api/v1/bookings/:id/job
const getJobForBooking = catchAsync(async (req, res, next) => {
  const booking = await getBookingForUser(req.params.id, req.user);
  if (booking === false) return next(new AppError("You do not have permission to view this job.", 403));
  if (!booking) return next(new AppError("Booking not found.", 404));
  const job = await Job.findOne({ booking: req.params.id }).populate("notes.author", "name role");
  if (!job) return next(new AppError("Job not found.", 404));
  res.status(200).json({ success: true, data: job });
});

// PATCH /api/v1/bookings/:id/job/status  [provider]
const updateJobStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const allowed = ["not_started", "in_progress", "completed"]; // customer_confirmed is set separately
  if (!allowed.includes(status)) {
    return next(new AppError(`status must be one of: ${allowed.join(", ")}`, 400));
  }

  const job = await Job.findOne({ booking: req.params.id });
  if (!job) return next(new AppError("Job not found.", 404));
  const booking = await getBookingForUser(req.params.id, req.user);
  if (booking !== false && (!booking || req.user.role !== "provider")) return next(new AppError("Only the assigned provider can update job status.", 403));
  if (booking === false) return next(new AppError("Only the assigned provider can update this job.", 403));

  job.status = status;
  await job.save();

  // Keep the booking's own status roughly in sync
  const bookingStatus = status === "completed" ? "completed" : status === "in_progress" ? "in_progress" : "scheduled";
  await Booking.findByIdAndUpdate(req.params.id, { status: bookingStatus });

  res.status(200).json({ success: true, data: job });
});

// POST /api/v1/bookings/:id/job/notes  [provider, ops]
const addJobNote = catchAsync(async (req, res, next) => {
  const { text } = req.body;
  if (!text) return next(new AppError("Note text is required.", 400));
  const booking = await getBookingForUser(req.params.id, req.user);
  if (booking === false || !booking) return next(new AppError("You do not have permission to add notes here.", booking ? 403 : 404));

  const job = await Job.findOneAndUpdate(
    { booking: req.params.id },
    { $push: { notes: { author: req.user._id, text } } },
    { new: true }
  );
  if (!job) return next(new AppError("Job not found.", 404));

  res.status(200).json({ success: true, data: job });
});

// POST /api/v1/bookings/:id/job/evidence  [provider]
// body: { stage: "before" | "after", urls: ["...", "..."] }
const addJobEvidence = catchAsync(async (req, res, next) => {
  const { stage, urls } = req.body;
  if (!["before", "after"].includes(stage) || !Array.isArray(urls) || urls.length === 0) {
    return next(new AppError("stage must be 'before' or 'after', and urls must be a non-empty array.", 400));
  }
  const booking = await getBookingForUser(req.params.id, req.user);
  if (booking === false || !booking || req.user.role !== "provider") return next(new AppError("Only the assigned provider can add evidence.", booking ? 403 : 404));

  const field = stage === "before" ? "beforeEvidence" : "afterEvidence";
  const job = await Job.findOneAndUpdate(
    { booking: req.params.id },
    { $push: { [field]: { $each: urls } } },
    { new: true }
  );
  if (!job) return next(new AppError("Job not found.", 404));

  res.status(200).json({ success: true, data: job });
});

// PATCH /api/v1/bookings/:id/job/confirm  [customer] - customer confirms the work is done
const confirmJob = catchAsync(async (req, res, next) => {
  const bookingAccess = await getBookingForUser(req.params.id, req.user);
  if (bookingAccess === false || !bookingAccess || req.user.role !== "customer") return next(new AppError("Only the booking customer can confirm the job.", bookingAccess ? 403 : 404));
  const job = await Job.findOne({ booking: req.params.id });
  if (!job) return next(new AppError("Job not found.", 404));
  if (job.status !== "completed") {
    return next(new AppError("The provider must mark the job as completed first.", 400));
  }

  job.status = "customer_confirmed";
  job.customerConfirmedAt = new Date();
  await job.save();

  const booking = await Booking.findByIdAndUpdate(req.params.id, { status: "completed" }, { new: true });

  const existingInvoice = await Invoice.findOne({ booking: booking._id });
  if (!existingInvoice) {
    const quote = await Quote.findById(booking.quote).select("price");
    const total = Number(quote?.price || 0);
    await Invoice.create({
      job: job._id,
      booking: booking._id,
      lineItems: [{ description: "Completed service", amount: total }],
      subtotal: total,
      total,
      status: "issued",
    });
  }

  await notify(booking.provider, "job_confirmed", "The customer confirmed your completed job.", {
    type: "Job",
    id: job._id,
  });
  await notify(booking.customer, "payment_ready", "Your completed service is ready for payment.", {
    type: "Booking",
    id: booking._id,
  });

  res.status(200).json({ success: true, data: job });
});

module.exports = { getJobForBooking, updateJobStatus, addJobNote, addJobEvidence, confirmJob };
