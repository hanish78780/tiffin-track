const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  getCustomerByPhone,
  deleteCustomer
} = require("../controllers/customerController");
const { importCustomers } = require("../controllers/customerImportController");

// All customer routes require authentication
// Specific routes defined before /:id to prevent parameter matching collisions
router.get("/phone/:phone", protect, getCustomerByPhone);
router.post("/import", protect, importCustomers);

router.post("/", protect, createCustomer);
router.get("/", protect, getCustomers);
router.get("/:id", protect, getCustomerById);
router.put("/:id", protect, updateCustomer);
router.delete("/:id", protect, deleteCustomer);


module.exports = router;
