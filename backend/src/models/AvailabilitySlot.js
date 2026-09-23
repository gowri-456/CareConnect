const mongoose = require("mongoose");

const availabilitySlotSchema = new mongoose.Schema(
  {
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "ProviderProfile", required: true },
    date: { type: Date, required: true }, // the calendar day
    startTime: { type: Date, required: true }, // full datetime of slot start
    endTime: { type: Date, required: true }, // full datetime of slot end
    isBooked: { type: Boolean, default: false },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AvailabilitySlot", availabilitySlotSchema);
