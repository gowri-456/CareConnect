const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false }, // hashed, never returned by default
    role: {
      type: String,
      enum: ["admin", "ops_manager", "manager", "provider", "customer", "support_agent"],
      default: "customer",
    },
    phone: { type: String },
    profilePicture: { type: String, default: "" },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "ProviderProfile" }],
    customerReliabilityScore: { type: Number, default: 0 },
    customerReliabilityCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
