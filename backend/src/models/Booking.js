const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    serviceRequest: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceRequest", required: true },
    quote: { type: mongoose.Schema.Types.ObjectId, ref: "Quote", required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "ProviderProfile", required: true },
    slot: { type: mongoose.Schema.Types.ObjectId, ref: "AvailabilitySlot", default: null },
    scheduledDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "cancelled", "disputed"],
      default: "scheduled",
    },
    cancellation: {
      by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      reason: { type: String, default: "" },
      at: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
