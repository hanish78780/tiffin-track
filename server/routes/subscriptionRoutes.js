const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  createSubscription,
  getSubscriptions,
  getSubscriptionById,
  pauseSubscription,
  resumeSubscription,
  transferSubscription
} = require("../controllers/subscriptionController");

// All subscription routes require authentication
router.post("/", protect, createSubscription);
router.get("/", protect, getSubscriptions);
router.get("/:id", protect, getSubscriptionById);
router.post("/:id/pause", protect, pauseSubscription);
router.post("/:id/resume", protect, resumeSubscription);
router.post("/:id/transfer", protect, transferSubscription);

module.exports = router;
