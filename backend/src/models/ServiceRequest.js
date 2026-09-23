const mongoose = require("mongoose");

const serviceRequestSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    descriptionText: { type: String, required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceCategory", default: null },
    aiClassification: {
      category: { type: String, default: null },
      confidence: { type: Number, default: 0 },
      suggestedSkills: [{ type: String }],
    },
    location: {
      address: { type: String, default: "" },
      city: { type: String, default: "" },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    preferredDate: { type: Date },
    urgency: { type: String, enum: ["low", "normal", "urgent"], default: "normal" },
    status: {
      type: String,
      enum: [
        "pending_classification",
        "open_for_quotes",
        "quoted",
        "booked",
        "completed",
        "cancelled",
      ],
      default: "pending_classification",
    },
    attachments: [{ type: String }], // image URLs
    activity: [
      {
        type: { type: String, required: true },
        message: { type: String, required: true },
        actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("ServiceRequest", serviceRequestSchema);
