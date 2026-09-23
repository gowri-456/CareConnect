const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true }, // e.g. "quote_received", "booking_confirmed"
    message: { type: String, required: true },
    relatedEntity: {
      type: { type: String, default: null }, // e.g. "Booking", "Quote"
      id: { type: mongoose.Schema.Types.ObjectId, default: null },
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
