const Booking = require("../models/Booking");
const Message = require("../models/Message");
const ProviderProfile = require("../models/ProviderProfile");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

async function getBookingForUser(id, user) {
  const booking = await Booking.findById(id);
  if (!booking) return null;
  if (["admin", "ops_manager", "support_agent"].includes(user.role)) return booking;
  if (String(booking.customer) === String(user._id)) return booking;
  if (user.role === "provider") {
    const profile = await ProviderProfile.findOne({ user: user._id }).select("_id");
    if (profile && String(booking.provider) === String(profile._id)) return booking;
  }
  return false;
}

const getMessages = catchAsync(async (req, res, next) => {
  const booking = await getBookingForUser(req.params.id, req.user);
  if (booking === false) return next(new AppError("You do not have permission to view this conversation.", 403));
  if (!booking) return next(new AppError("Booking not found.", 404));
  const messages = await Message.find({ booking: booking._id }).populate("sender", "name role").sort({ createdAt: 1 });
  await Message.updateMany({ booking: booking._id, sender: { $ne: req.user._id }, readAt: null }, { readAt: new Date() });
  res.status(200).json({ success: true, data: messages });
});

const createMessage = catchAsync(async (req, res, next) => {
  const booking = await getBookingForUser(req.params.id, req.user);
  if (booking === false) return next(new AppError("You do not have permission to message this booking.", 403));
  if (!booking) return next(new AppError("Booking not found.", 404));
  if (!String(req.body.body || "").trim()) return next(new AppError("Message text is required.", 400));
  const message = await Message.create({ booking: booking._id, sender: req.user._id, body: req.body.body.trim() });
  await message.populate("sender", "name role");
  res.status(201).json({ success: true, data: message });
});

module.exports = { getMessages, createMessage };