const mongoose = require("mongoose");

const quoteSchema = new mongoose.Schema(
  {
    serviceRequest: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceRequest", required: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "ProviderProfile", required: true },
    price: { type: Number, required: true },
    estimatedDurationMins: { type: Number, default: 60 },
    message: { type: String, default: "" },
    aiSummary: { type: String, default: "" },
    status: {
      type: String,
      enum: ["submitted", "accepted", "rejected", "withdrawn"],
      default: "submitted",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quote", quoteSchema);
