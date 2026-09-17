const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const { getBill } = require("../controllers/billingController");

// Billing route requires authentication
router.get("/:customerId", protect, getBill);

module.exports = router;
