const AvailabilitySlot = require("../models/AvailabilitySlot");
const ProviderProfile = require("../models/ProviderProfile");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// GET /api/v1/providers/:id/availability  [public]
const getProviderAvailability = catchAsync(async (req, res) => {
  const filter = { provider: req.params.id };
  if (req.query.onlyOpen === "true") filter.isBooked = false;

  const slots = await AvailabilitySlot.find(filter).sort({ startTime: 1 });
  res.status(200).json({ success: true, count: slots.length, data: slots });
});

// POST /api/v1/providers/me/availability  [provider]
// This is the "availability engine": it rejects a new slot if it overlaps
// with any existing slot the provider already has.
const createAvailabilitySlot = catchAsync(async (req, res, next) => {
  const { date, startTime, endTime } = req.body;
  if (!date || !startTime || !endTime) {
    return next(new AppError("date, startTime and endTime are required.", 400));
  }

  const profile = await ProviderProfile.findOne({ user: req.user._id });
  if (!profile) return next(new AppError("Provider profile not found.", 404));

  const newStart = new Date(startTime);
  const newEnd = new Date(endTime);

  if (Number.isNaN(newStart.getTime()) || Number.isNaN(newEnd.getTime())) {
    return next(new AppError("startTime and endTime must be valid dates.", 400));
  }
  if (newStart <= new Date()) {
    return next(new AppError("Availability must start in the future.", 400));
  }
  if (newStart >= newEnd) {
    return next(new AppError("startTime must be before endTime.", 400));
  }

  // Overlap check: an existing slot overlaps if it starts before the new slot ends
  // AND ends after the new slot starts.
  const overlapping = await AvailabilitySlot.findOne({
    provider: profile._id,
    startTime: { $lt: newEnd },
    endTime: { $gt: newStart },
  });

  if (overlapping) {
    return next(new AppError("This slot overlaps with an existing availability slot.", 400));
  }

  const slot = await AvailabilitySlot.create({
    provider: profile._id,
    date,
    startTime: newStart,
    endTime: newEnd,
  });

  res.status(201).json({ success: true, data: slot });
});

// DELETE /api/v1/providers/me/availability/:slotId  [provider]
const deleteAvailabilitySlot = catchAsync(async (req, res, next) => {
  const profile = await ProviderProfile.findOne({ user: req.user._id });
  if (!profile) return next(new AppError("Provider profile not found.", 404));

  const slot = await AvailabilitySlot.findOne({ _id: req.params.slotId, provider: profile._id });
  if (!slot) return next(new AppError("Slot not found.", 404));
  if (slot.isBooked) return next(new AppError("Cannot delete a slot that is already booked.", 400));

  await slot.deleteOne();
  res.status(200).json({ success: true, message: "Slot deleted." });
});

module.exports = { getProviderAvailability, createAvailabilitySlot, deleteAvailabilitySlot };
