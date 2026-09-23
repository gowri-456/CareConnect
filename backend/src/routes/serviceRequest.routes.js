const express = require("express");
const {
  createServiceRequest,
  getAllServiceRequests,
  getMyServiceRequests,
  getServiceRequestById,
  classifyServiceRequest,
  updateServiceRequest,
  getSuggestedProviders,
  cancelServiceRequest,
} = require("../controllers/serviceRequest.controller");
const { createQuote, getQuotesForRequest } = require("../controllers/quote.controller");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.post("/", authorize("customer"), createServiceRequest);
router.get("/", authorize("admin", "ops_manager", "provider", "support_agent"), getAllServiceRequests);
router.get("/mine", authorize("customer"), getMyServiceRequests);
router.get("/:id", getServiceRequestById);
router.patch("/:id", authorize("customer"), updateServiceRequest);
router.post("/:id/classify", authorize("admin", "ops_manager"), classifyServiceRequest);
router.get("/:id/suggested-providers", authorize("customer", "admin", "ops_manager"), getSuggestedProviders);
router.patch("/:id/cancel", authorize("customer", "admin", "ops_manager"), cancelServiceRequest);
router.delete("/:id", authorize("customer", "admin", "ops_manager"), cancelServiceRequest);

// Quotes nested under a service request
router.post("/:id/quotes", authorize("provider"), createQuote);
router.get("/:id/quotes", authorize("customer", "admin", "ops_manager"), getQuotesForRequest);

module.exports = router;
