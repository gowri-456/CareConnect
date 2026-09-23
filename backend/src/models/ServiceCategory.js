const mongoose = require("mongoose");

const serviceCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "" },
    requiredSkills: [{ type: String }], // used by the AI classifier for matching
    basePriceMin: { type: Number, default: 0 },
    basePriceMax: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ServiceCategory", serviceCategorySchema);
