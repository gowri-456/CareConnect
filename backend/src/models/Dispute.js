const mongoose = require("mongoose");

const disputeSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["quality", "no_show", "pricing", "damage", "other"],
      default: "other",
    },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ["open", "investigating", "resolved", "rejected"],
      default: "open",
    },
    assignedAgent: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolution: {
      outcome: { type: String, default: "" },
      notes: { type: String, default: "" },
      refundAmount: { type: Number, default: 0 },
      resolvedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Dispute", disputeSchema);
