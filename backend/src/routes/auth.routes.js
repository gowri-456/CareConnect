const express = require("express");
const { register, login, getMe } = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth");
const rateLimit = require("../middleware/rateLimit");

const router = express.Router();

router.post("/register", rateLimit({ max: 10 }), register);
router.post("/login", rateLimit({ max: 10 }), login);
router.get("/me", authenticate, getMe);

module.exports = router;
