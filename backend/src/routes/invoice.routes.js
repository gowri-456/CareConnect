const express = require("express");
const { payInvoice } = require("../controllers/invoice.controller");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

router.patch("/:id/pay", authenticate, authorize("customer"), payInvoice);

module.exports = router;
