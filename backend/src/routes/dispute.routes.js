const express = require("express");
const {
  createDispute,
  getDisputes,
  getDisputeById,
  assignDispute,
  resolveDispute,
} = require("../controllers/dispute.controller");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.post("/", authorize("customer", "provider"), createDispute);
router.get("/", authorize("support_agent", "admin", "ops_manager"), getDisputes);
router.get("/:id", authorize("support_agent", "admin", "ops_manager"), getDisputeById);
router.patch("/:id/assign", authorize("admin"), assignDispute);
router.patch("/:id/resolve", authorize("support_agent", "admin", "ops_manager"), resolveDispute);

module.exports = router;
