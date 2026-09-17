const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const Subscription = require("../models/Subscription");
const PausePeriod = require("../models/PausePeriod");

/**
 * POST /api/subscriptions
 * Create a new subscription for a customer owned by the authenticated user.
 * Prevents duplicate active subscriptions for the same customer.
 */
const createSubscription = async (req, res, next) => {
  try {
    const { customerId, planName, monthlyPrice, startDate } = req.body;

    if (!customerId || !planName || !monthlyPrice || !startDate) {
      return res.status(400).json({
        success: false,
        message: "customerId, planName, monthlyPrice, and startDate are required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID format"
      });
    }

    if (monthlyPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Monthly price must be positive"
      });
    }

    // Verify customer exists AND belongs to authenticated owner
    const customer = await Customer.findOne({
      _id: customerId,
      ownerId: req.user.id
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    // Prevent duplicate active subscriptions for the same customer
    const existingActive = await Subscription.findOne({
      customerId: customer._id,
      ownerId: req.user.id,
      status: "active"
    });

    if (existingActive) {
      return res.status(409).json({
        success: false,
        message: "Customer already has an active subscription"
      });
    }

    const subscription = await Subscription.create({
      customerId: customer._id,
      ownerId: req.user.id,
      planName,
      monthlyPrice,
      startDate,
      status: "active"
    });

    res.status(201).json({
      success: true,
      subscription
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/subscriptions
 * List subscriptions belonging to the authenticated owner.
 * Supports: status filter, pagination, sorting.
 *
 * Query params:
 *   status - "active" or "paused"
 *   page, limit, sort, order
 */
const getSubscriptions = async (req, res, next) => {
  try {
    const {
      status,
      page = 1,
      limit = 10,
      sort = "createdAt",
      order = "asc",
      customerId
    } = req.query;

    const filter = { ownerId: req.user.id };

    if (status && ["active", "paused"].includes(status)) {
      filter.status = status;
    }

    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {
      filter.customerId = customerId;
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const sortOrder = order === "desc" ? -1 : 1;
    const sortOptions = { [sort]: sortOrder };

    const [subscriptions, total] = await Promise.all([
      Subscription.find(filter)
        .populate("customerId", "name phone address")
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Subscription.countDocuments(filter)
    ]);

    res.json({
      success: true,
      subscriptions,
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
 * GET /api/subscriptions/:id
 * Get a single subscription by ID (owner-scoped).
 */
const getSubscriptionById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format"
      });
    }

    const subscription = await Subscription.findOne({
      _id: req.params.id,
      ownerId: req.user.id
    }).populate("customerId", "name phone address");

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found"
      });
    }

    const pausePeriods = await PausePeriod.find({
      subscriptionId: subscription._id,
      ownerId: req.user.id
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      subscription,
      pausePeriods
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/subscriptions/:id/pause
 * Pause an active subscription.
 * Creates a PausePeriod and sets subscription status to "paused".
 */
const pauseSubscription = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format"
      });
    }

    const { startDate, reason } = req.body;

    if (!startDate) {
      return res.status(400).json({
        success: false,
        message: "Pause start date is required"
      });
    }

    // Find subscription owned by authenticated user
    const subscription = await Subscription.findOne({
      _id: req.params.id,
      ownerId: req.user.id
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found"
      });
    }

    if (subscription.status === "paused") {
      return res.status(409).json({
        success: false,
        message: "Subscription is already paused"
      });
    }

    // Verify no open pause period already exists
    const openPause = await PausePeriod.findOne({
      subscriptionId: subscription._id,
      ownerId: req.user.id,
      endDate: null
    });

    if (openPause) {
      return res.status(409).json({
        success: false,
        message: "An open pause period already exists"
      });
    }

    // Create pause period
    const pausePeriod = await PausePeriod.create({
      subscriptionId: subscription._id,
      ownerId: req.user.id,
      startDate,
      endDate: null,
      reason: reason || ""
    });

    // Update subscription status
    subscription.status = "paused";
    await subscription.save();

    res.status(201).json({
      success: true,
      subscription,
      pausePeriod
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/subscriptions/:id/resume
 * Resume a paused subscription.
 * Closes the open PausePeriod and sets subscription status to "active".
 */
const resumeSubscription = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format"
      });
    }

    const { resumeDate } = req.body;

    if (!resumeDate) {
      return res.status(400).json({
        success: false,
        message: "Resume date is required"
      });
    }

    // Find subscription owned by authenticated user
    const subscription = await Subscription.findOne({
      _id: req.params.id,
      ownerId: req.user.id
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found"
      });
    }

    if (subscription.status !== "paused") {
      return res.status(409).json({
        success: false,
        message: "Subscription is not currently paused"
      });
    }

    // Find the open pause period
    const pausePeriod = await PausePeriod.findOne({
      subscriptionId: subscription._id,
      ownerId: req.user.id,
      endDate: null
    });

    if (!pausePeriod) {
      return res.status(404).json({
        success: false,
        message: "No open pause period found"
      });
    }

    // Close the pause period
    pausePeriod.endDate = resumeDate;
    await pausePeriod.save();

    // Resume subscription
    subscription.status = "active";
    await subscription.save();

    res.json({
      success: true,
      subscription,
      pausePeriod
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSubscription,
  getSubscriptions,
  getSubscriptionById,
  pauseSubscription,
  resumeSubscription
};
