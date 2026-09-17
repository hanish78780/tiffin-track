const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const Subscription = require("../models/Subscription");
const PausePeriod = require("../models/PausePeriod");
const { calculateBill } = require("../utils/billing");

/**
 * GET /api/billing/:customerId?month=YYYY-MM
 * Calculate the pro-rated monthly bill for a customer.
 * All ownership checks enforce that the customer, subscription,
 * and pause periods belong to the authenticated owner.
 */
const getBill = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const { month } = req.query;

    // Validate customer ID format
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer ID format"
      });
    }

    // Validate month format (YYYY-MM)
    if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({
        success: false,
        message: "Month is required in YYYY-MM format (e.g. 2026-09)"
      });
    }

    const [yearStr, monthStr] = month.split("-");
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);

    // Verify customer belongs to the authenticated owner
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

    // Find the customer's subscription (owner-scoped)
    const subscription = await Subscription.findOne({
      customerId: customer._id,
      ownerId: req.user.id
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "No subscription found for this customer"
      });
    }

    // Retrieve all pause periods for this subscription (owner-scoped)
    const pausePeriods = await PausePeriod.find({
      subscriptionId: subscription._id,
      ownerId: req.user.id
    });

    // Calculate the bill
    const billing = calculateBill({
      monthlyPrice: subscription.monthlyPrice,
      year,
      month: monthNum,
      pausePeriods
    });

    res.json({
      success: true,
      customer: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone
      },
      subscription: {
        planName: subscription.planName,
        monthlyPrice: subscription.monthlyPrice,
        status: subscription.status
      },
      billing: {
        month,
        ...billing
      },
      pausePeriods: pausePeriods.map((p) => ({
        startDate: p.startDate,
        endDate: p.endDate,
        reason: p.reason
      }))
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getBill };
