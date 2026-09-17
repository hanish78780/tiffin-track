const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  getCustomerByPhone
} = require("../controllers/customerController");

// All customer routes require authentication
// Phone lookup must be defined before /:id to avoid matching "phone" as an id
router.get("/phone/:phone", protect, getCustomerByPhone);

router.post("/", protect, createCustomer);
router.get("/", protect, getCustomers);
router.get("/:id", protect, getCustomerById);
router.put("/:id", protect, updateCustomer);

module.exports = router;
