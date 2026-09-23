const express = require("express");
const { getMyNotifications, markNotificationRead } = require("../controllers/notification.controller");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.use(authenticate);

router.get("/mine", getMyNotifications);
router.patch("/:id/read", markNotificationRead);

module.exports = router;
