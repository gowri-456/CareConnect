const express = require("express");
const {
  getBookings,
  getBookingById,
  rescheduleBooking,
  cancelBooking,
} = require("../controllers/booking.controller");
const {
  getJobForBooking,
  updateJobStatus,
  addJobNote,
  addJobEvidence,
  confirmJob,
} = require("../controllers/job.controller");
const { getInvoiceForBooking, createInvoice } = require("../controllers/invoice.controller");
const { createReview } = require("../controllers/review.controller");
const { getMessages, createMessage } = require("../controllers/message.controller");
const { createDispute } = require("../controllers/dispute.controller");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/", getBookings);
router.get("/:id", getBookingById);
router.patch("/:id/reschedule", rescheduleBooking);
router.patch("/:id/cancel", cancelBooking);

// Job tracking, nested under booking
router.get("/:id/job", getJobForBooking);
router.patch("/:id/job/status", authorize("provider"), updateJobStatus);
router.post("/:id/job/notes", authorize("provider", "ops_manager"), addJobNote);
router.post("/:id/job/evidence", authorize("provider"), addJobEvidence);
router.patch("/:id/job/confirm", authorize("customer"), confirmJob);

// Invoice, nested under booking
router.get("/:id/invoice", getInvoiceForBooking);
router.post("/:id/invoice", authorize("provider", "ops_manager", "admin"), createInvoice);

// Review, nested under booking
router.post("/:id/review", authorize("customer", "provider"), createReview);
router.get("/:id/messages", getMessages);
router.post("/:id/messages", createMessage);

module.exports = router;
