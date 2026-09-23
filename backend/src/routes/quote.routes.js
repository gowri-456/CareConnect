const express = require("express");
const { rejectQuote, withdrawQuote } = require("../controllers/quote.controller");
const { acceptQuote } = require("../controllers/booking.controller");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.patch("/:id/accept", authorize("customer"), acceptQuote);
router.patch("/:id/reject", authorize("customer"), rejectQuote);
router.patch("/:id/withdraw", authorize("provider"), withdrawQuote);

module.exports = router;
