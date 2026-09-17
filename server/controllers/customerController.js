const mongoose = require("mongoose");
const Customer = require("../models/Customer");

/**
 * POST /api/customers
 * Create a new customer belonging to the authenticated owner.
 */
const createCustomer = async (req, res, next) => {
  try {
    const { name, phone, address } = req.body;

    if (!name || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: "Name, phone, and address are required"
      });
    }

    const customer = await Customer.create({
      name,
      phone,
      address,
      ownerId: req.user.id // Always from JWT, never from body
    });

    res.status(201).json({
      success: true,
      customer
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/customers
 * List customers belonging to the authenticated owner.
 * Supports: search (name/phone), pagination, sorting.
 *
 * Query params:
 *   search - partial match on name or phone (case-insensitive)
 *   page   - page number (default 1)
 *   limit  - items per page (default 10)
 *   sort   - field to sort by (default "createdAt")
 *   order  - "asc" or "desc" (default "asc")
 */
const getCustomers = async (req, res, next) => {
  try {
    const {
      search,
      page = 1,
      limit = 10,
      sort = "createdAt",
      order = "asc"
    } = req.query;

    // Always scope to the authenticated owner
    const filter = { ownerId: req.user.id };

    // Add search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const sortOrder = order === "desc" ? -1 : 1;
    const sortOptions = { [sort]: sortOrder };

    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Customer.countDocuments(filter)
    ]);

    res.json({
      success: true,
      customers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/customers/:id
 * Get a single customer by ID (owner-scoped).
 */
const getCustomerById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format"
      });
    }

    const customer = await Customer.findOne({
      _id: req.params.id,
      ownerId: req.user.id
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    res.json({
      success: true,
      customer
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/customers/:id
 * Update a customer (owner-scoped).
 */
const updateCustomer = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format"
      });
    }

    const { name, phone, address } = req.body;

    const customer = await Customer.findOneAndUpdate(
      {
        _id: req.params.id,
        ownerId: req.user.id
      },
      { name, phone, address },
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    res.json({
      success: true,
      customer
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/customers/phone/:phone
 * Look up a customer by phone number (owner-scoped).
 */
const getCustomerByPhone = async (req, res, next) => {
  try {
    const customer = await Customer.findOne({
      phone: req.params.phone,
      ownerId: req.user.id
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    res.json({
      success: true,
      customer
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  getCustomerByPhone
};
