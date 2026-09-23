const express = require("express");
const {
  bookingsSummary,
  providerPerformance,
  disputesSummary,
  paymentSummary,
  providerEarnings,
} = require("../controllers/analytics.controller");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/bookings-summary", authorize("admin", "ops_manager"), bookingsSummary);
router.get("/provider-performance", authorize("admin", "ops_manager"), providerPerformance);
router.get("/disputes-summary", authorize("admin", "ops_manager"), disputesSummary);
router.get("/payments-summary", authorize("admin", "ops_manager"), paymentSummary);
router.get("/my-earnings", authorize("provider"), providerEarnings);

module.exports = router;
