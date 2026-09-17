const express = require("express");
const router = express.Router();
const { advanceClock } = require("../controllers/clockController");
const { optionalProtect } = require("../middleware/authMiddleware");

// POST /clock and POST /api/clock
router.post("/", optionalProtect, advanceClock);

module.exports = router;
