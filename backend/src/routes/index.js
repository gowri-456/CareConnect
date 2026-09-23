const express = require("express");

const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const categoryRoutes = require("./category.routes");
const providerRoutes = require("./provider.routes");
const serviceRequestRoutes = require("./serviceRequest.routes");
const quoteRoutes = require("./quote.routes");
const bookingRoutes = require("./booking.routes");
const invoiceRoutes = require("./invoice.routes");
const disputeRoutes = require("./dispute.routes");
const notificationRoutes = require("./notification.routes");
const analyticsRoutes = require("./analytics.routes");
const faqController = require("../controllers/faq.controller");
const { authenticate } = require("../middleware/auth");
const { toggleFavorite, getFavorites } = require("../controllers/favorite.controller");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/categories", categoryRoutes);
router.use("/providers", providerRoutes);
router.use("/service-requests", serviceRequestRoutes);
router.use("/quotes", quoteRoutes);
router.use("/bookings", bookingRoutes);
router.use("/invoices", invoiceRoutes);
router.use("/disputes", disputeRoutes);
router.use("/notifications", notificationRoutes);
router.use("/analytics", analyticsRoutes);
router.post("/support/faq", authenticate, faqController.answerFaq);
router.post("/providers/:id/favorite", authenticate, require("../middleware/auth").authorize("customer"), toggleFavorite);
router.get("/providers/favorites", authenticate, require("../middleware/auth").authorize("customer"), getFavorites);

module.exports = router;
