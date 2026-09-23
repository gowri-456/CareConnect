const express = require("express");
const {
  getProviders,
  getProviderById,
  getMyProviderProfile,
  updateMyProviderProfile,
  addMyDocument,
  verifyProvider,
} = require("../controllers/provider.controller");
const {
  getProviderAvailability,
  createAvailabilitySlot,
  deleteAvailabilitySlot,
} = require("../controllers/availability.controller");
const { getReviewsForProvider } = require("../controllers/review.controller");
const { getFavorites } = require("../controllers/favorite.controller");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// Public
router.get("/", getProviders);
router.get("/favorites", authenticate, authorize("customer"), getFavorites);

// Provider-only "me" routes (must be defined BEFORE /:id so "me" isn't treated as an id)
router.get("/me", authenticate, authorize("provider"), getMyProviderProfile);
router.patch("/me", authenticate, authorize("provider"), updateMyProviderProfile);
router.post("/me/documents", authenticate, authorize("provider"), addMyDocument);
router.post("/me/availability", authenticate, authorize("provider"), createAvailabilitySlot);
router.delete("/me/availability/:slotId", authenticate, authorize("provider"), deleteAvailabilitySlot);

// Public, parameterized
router.get("/:id", getProviderById);
router.get("/:id/availability", getProviderAvailability);
router.get("/:id/reviews", getReviewsForProvider);

// Admin
router.patch("/:id/verify", authenticate, authorize("admin"), verifyProvider);

module.exports = router;
