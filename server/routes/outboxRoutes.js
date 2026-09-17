const express = require("express");
const router = express.Router();
const { getOutbox, clearOutbox } = require("../controllers/outboxController");
const { optionalProtect } = require("../middleware/authMiddleware");

// GET /outbox and /api/outbox
router.get("/", optionalProtect, getOutbox);

// DELETE /outbox and /api/outbox (clears outbox)
router.delete("/", optionalProtect, clearOutbox);

module.exports = router;
