const express = require("express");
const authRoutes = require("./auth.routes");
const dashboardRoutes = require("./dashboard.routes");
const workspaceRoutes = require("./workspace.routes");
const serviceRequestRoutes = require("./serviceRequest.routes");
const adminRoutes = require("./admin.routes");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

router.use("/auth", authRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/service-requests", serviceRequestRoutes);
router.use("/admin", adminRoutes);
router.use("/", workspaceRoutes);

module.exports = router;