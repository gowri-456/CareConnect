const Notification = require("../models/Notification");
const catchAsync = require("../utils/catchAsync");

// GET /api/v1/notifications/mine
const getMyNotifications = catchAsync(async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
  const filter = { user: req.user._id };
  const [notifications, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, isRead: false }),
  ]);
  res.status(200).json({ success: true, count: notifications.length, unread, pagination: { page, limit, total, pages: Math.ceil(total / limit) }, data: notifications });
});

// PATCH /api/v1/notifications/:id/read
const markNotificationRead = catchAsync(async (req, res, next) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { isRead: true },
    { new: true }
  );
  res.status(200).json({ success: true, data: notification });
});

module.exports = { getMyNotifications, markNotificationRead };
