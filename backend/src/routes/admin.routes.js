const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const {
  getProviders,
  createProvider,
  deleteProvider,
  getProviderEarnings,
} = require("../controllers/admin.controller");

const router = express.Router();

// All admin routes require admin authentication
router.use(authenticate);
router.use(authorize("admin"));

router.get("/providers", getProviders);
router.post("/providers", createProvider);
router.delete("/providers/:id", deleteProvider);
router.get("/providers/:id/earnings", getProviderEarnings);

module.exports = router;
