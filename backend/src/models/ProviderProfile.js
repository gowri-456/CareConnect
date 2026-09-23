const mongoose = require("mongoose");

const providerProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    bio: { type: String, default: "" },
    skills: [{ type: String }],
    serviceAreas: [{ type: String }], // simple city/zip strings, e.g. "Hyderabad", "500081"
    location: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
    },
    experienceYears: { type: Number, default: 0 },
    hourlyRate: { type: Number, default: 0 },
    documents: [
      {
        type: { type: String }, // e.g. "license", "insurance", "id_proof"
        url: { type: String },
        status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    verificationStatus: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
    },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    isAvailableForWork: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProviderProfile", providerProfileSchema);
