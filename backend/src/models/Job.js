const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed", "customer_confirmed"],
      default: "not_started",
    },
    hoursWorked: { type: Number, default: 0, min: 0 },
    notes: [
      {
        author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        text: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    beforeEvidence: [{ type: String }], // image URLs
    afterEvidence: [{ type: String }],
    customerConfirmedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", jobSchema);
