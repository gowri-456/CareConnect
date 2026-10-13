const express = require("express");
const { getMapProviders, getNotifications, getPayments, markAllNotificationsRead } = require("../controllers/workspace.controller");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.get("/payments", authenticate, getPayments);
router.get("/notifications", authenticate, getNotifications);
router.post("/notifications/read-all", authenticate, markAllNotificationsRead);
router.get("/map/providers", authenticate, getMapProviders);

module.exports = router;