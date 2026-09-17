const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const Subscription = require("../models/Subscription");
const PausePeriod = require("../models/PausePeriod");

const SubscriptionAssignment = require("../models/SubscriptionAssignment");

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

    // Create initial subscription assignment for historical tracking (T6)
    await SubscriptionAssignment.create({
      ownerId: req.user.id,
      subscriptionId: subscription._id,
      customerId: customer._id,
      startDate: subscription.startDate,
      endDate: null
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

    const [pausePeriods, assignments] = await Promise.all([
      PausePeriod.find({
        subscriptionId: subscription._id,
        ownerId: req.user.id
      }).sort({ createdAt: -1 }),
      SubscriptionAssignment.find({
        subscriptionId: subscription._id,
        ownerId: req.user.id
      })
        .populate("customerId", "name phone address")
        .sort({ startDate: 1 })
    ]);

    res.json({
      success: true,
      subscription,
      pausePeriods,
      assignments
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

/**
 * POST /api/subscriptions/:id/transfer
 * Transfer a subscription to a new customer mid-cycle (T6).
 * Supports:
 * - Existing customer: { newCustomerId, transferDate }
 * - New customer creation: { newCustomer: { name, phone, address }, transferDate }
 * Wrapped in transaction/rollback safety so customer is not orphaned if transfer fails.
 */
const transferSubscription = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format"
      });
    }

    const { newCustomerId, newCustomer, transferDate } = req.body;

    if (!transferDate) {
      return res.status(400).json({
        success: false,
        message: "transferDate is required"
      });
    }

    if (!newCustomerId && !newCustomer) {
      return res.status(400).json({
        success: false,
        message: "Target customer (newCustomerId or newCustomer) is required"
      });
    }

    // 1. Validate subscription ownership
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
      return res.status(400).json({
        success: false,
        message: "Cannot transfer a subscription while it is paused. Please resume first."
      });
    }

    // 2. Validate transfer date format & cycle bounds
    const transferDateMatch = String(transferDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!transferDateMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid transferDate format. Expected YYYY-MM-DD"
      });
    }

    const tYear = parseInt(transferDateMatch[1], 10);
    const tMonth = parseInt(transferDateMatch[2], 10);
    const tDay = parseInt(transferDateMatch[3], 10);
    const transferUtcMs = Date.UTC(tYear, tMonth - 1, tDay);

    const subStartDate = new Date(subscription.startDate);
    const subStartUtcMs = Date.UTC(
      subStartDate.getUTCFullYear(),
      subStartDate.getUTCMonth(),
      subStartDate.getUTCDate()
    );

    if (transferUtcMs < subStartUtcMs) {
      return res.status(400).json({
        success: false,
        message: "Transfer date cannot be before subscription start date"
      });
    }

    let targetCustomerId = newCustomerId;
    let trimmedName = "";
    let trimmedPhone = "";
    let trimmedAddress = "";

    if (newCustomer) {
      // 3. Validate new customer data
      if (!newCustomer.name || !newCustomer.phone || !newCustomer.address) {
        return res.status(400).json({
          success: false,
          message: "Name, phone, and address are required for new customer"
        });
      }

      trimmedName = String(newCustomer.name).trim();
      trimmedPhone = String(newCustomer.phone).trim();
      trimmedAddress = String(newCustomer.address).trim();

      if (!trimmedName || !trimmedPhone || !trimmedAddress) {
        return res.status(400).json({
          success: false,
          message: "Name, phone, and address cannot be empty"
        });
      }

      // 4. Check phone uniqueness for owner
      const phoneConflict = await Customer.findOne({
        ownerId: req.user.id,
        phone: trimmedPhone
      });

      if (phoneConflict) {
        return res.status(409).json({
          success: false,
          message: "Customer with this phone number already exists"
        });
      }
    } else {
      // Validate existing customer
      if (!mongoose.Types.ObjectId.isValid(newCustomerId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID format"
        });
      }

      const existingCustomer = await Customer.findOne({
        _id: newCustomerId,
        ownerId: req.user.id
      });

      if (!existingCustomer) {
        return res.status(404).json({
          success: false,
          message: "Target customer not found"
        });
      }

      if (String(subscription.customerId) === String(newCustomerId)) {
        return res.status(400).json({
          success: false,
          message: "Cannot transfer subscription to the same customer"
        });
      }

      const existingActiveForTarget = await Subscription.findOne({
        customerId: newCustomerId,
        ownerId: req.user.id,
        status: "active",
        _id: { $ne: subscription._id }
      });

      if (existingActiveForTarget) {
        return res.status(409).json({
          success: false,
          message: "Target customer already has an active subscription"
        });
      }
    }

    // Session-based transaction with fallback rollback safety
    let session = null;
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      try {
        session = await mongoose.startSession();
        session.startTransaction();
      } catch {
        session = null;
      }
    }


    let newlyCreatedCustomer = null;

    try {
      // 5. Create Customer if newCustomer
      if (newCustomer) {
        newlyCreatedCustomer = await Customer.create({
          name: trimmedName,
          phone: trimmedPhone,
          address: trimmedAddress,
          ownerId: req.user.id
        });
        targetCustomerId = newlyCreatedCustomer._id;
      }

      // 6. Find currently active assignment
      let currentAssignment = await SubscriptionAssignment.findOne({
        subscriptionId: subscription._id,
        ownerId: req.user.id,
        endDate: null
      });

      // If no assignments exist yet (legacy), create initial assignment
      if (!currentAssignment) {
        currentAssignment = await SubscriptionAssignment.create({
          ownerId: req.user.id,
          subscriptionId: subscription._id,
          customerId: subscription.customerId,
          startDate: subscription.startDate,
          endDate: null
        });
      }

      // 7. Close previous assignment on the day before transferDate (inclusive)
      const dayBeforeTransferUtcMs = transferUtcMs - 86400000;
      currentAssignment.endDate = new Date(dayBeforeTransferUtcMs);
      await currentAssignment.save();

      // Create new assignment starting on transferDate
      const newAssignment = await SubscriptionAssignment.create({
        ownerId: req.user.id,
        subscriptionId: subscription._id,
        customerId: targetCustomerId,
        startDate: new Date(transferUtcMs),
        endDate: null
      });

      // 8. Update Subscription active customer pointer
      const previousCustomerId = subscription.customerId;
      subscription.customerId = targetCustomerId;
      await subscription.save();

      // 9. Commit transaction
      if (session) {
        await session.commitTransaction();
      }

      return res.status(200).json({
        success: true,
        message: "Subscription transferred successfully",
        subscription,
        newCustomer: newlyCreatedCustomer,
        transfer: {
          previousCustomerId,
          newCustomerId: targetCustomerId,
          transferDate: `${tYear}-${String(tMonth).padStart(2, "0")}-${String(tDay).padStart(2, "0")}`,
          newAssignmentId: newAssignment._id
        }
      });
    } catch (err) {
      if (session) {
        try {
          await session.abortTransaction();
        } catch {}
      }
      // Rollback newly created customer if transfer failed downstream
      if (newlyCreatedCustomer && newlyCreatedCustomer._id) {
        try {
          await Customer.deleteOne({ _id: newlyCreatedCustomer._id, ownerId: req.user.id });
        } catch {}
      }
      throw err;
    } finally {
      if (session) {
        session.endSession();
      }
    }
  } catch (error) {
    next(error);
  }
};


module.exports = {
  createSubscription,
  getSubscriptions,
  getSubscriptionById,
  pauseSubscription,
  resumeSubscription,
  transferSubscription
};
