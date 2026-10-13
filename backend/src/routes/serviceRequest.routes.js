const express = require("express");
const {
  acceptServiceRequest,
  cancelServiceRequest,
  completeServiceRequest,
  confirmServiceRequest,
  createServiceRequest,
  listServiceRequests,
  payServiceRequest,
  rejectCompletionServiceRequest,
  reviewServiceRequest,
  startServiceRequest,
} = require("../controllers/serviceRequest.controller");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);
router.get("/", listServiceRequests);
router.post("/", authorize("customer"), createServiceRequest);
router.post("/:id/accept", authorize("provider"), acceptServiceRequest);
router.post("/:id/cancel", authorize("customer", "admin", "ops_manager"), cancelServiceRequest);
router.post("/:id/start", authorize("provider"), startServiceRequest);
router.post("/:id/complete", authorize("provider"), completeServiceRequest);
router.post("/:id/confirm", authorize("customer"), confirmServiceRequest);
router.post("/:id/reject-completion", authorize("customer"), rejectCompletionServiceRequest);
router.post("/:id/pay", authorize("customer"), payServiceRequest);
router.post("/:id/review", authorize("customer"), reviewServiceRequest);

module.exports = router;