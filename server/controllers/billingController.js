const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const Subscription = require("../models/Subscription");
const PausePeriod = require("../models/PausePeriod");
const { calculateBill } = require("../utils/billing");

const SubscriptionAssignment = require("../models/SubscriptionAssignment");

/**
 * GET /api/billing/:customerId?month=YYYY-MM
 * Calculate the pro-rated monthly bill for a customer.
 * All ownership checks enforce that the customer, subscription,
 * and pause periods belong to the authenticated owner.
 * Supports split billing for transferred subscriptions (T6).
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
    // First check if customer is current subscription holder
    let subscription = await Subscription.findOne({
      customerId: customer._id,
      ownerId: req.user.id
    });

    // If not current customer, check if customer was historically assigned during this month (T6)
    const monthStart = new Date(Date.UTC(year, monthNum - 1, 1));
    const daysInMonth = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
    const monthEnd = new Date(Date.UTC(year, monthNum - 1, daysInMonth, 23, 59, 59, 999));

    if (!subscription) {
      const historicalAssignment = await SubscriptionAssignment.findOne({
        customerId: customer._id,
        ownerId: req.user.id,
        startDate: { $lte: monthEnd },
        $or: [{ endDate: null }, { endDate: { $gte: monthStart } }]
      });

      if (historicalAssignment) {
        subscription = await Subscription.findOne({
          _id: historicalAssignment.subscriptionId,
          ownerId: req.user.id
        });
      }
    }

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

    // Retrieve all assignments for this subscription to calculate split billing (T6)
    const assignments = await SubscriptionAssignment.find({
      subscriptionId: subscription._id,
      ownerId: req.user.id
    }).populate("customerId", "name phone");

    // Calculate the bill
    const billing = calculateBill({
      monthlyPrice: subscription.monthlyPrice,
      year,
      month: monthNum,
      pausePeriods,
      assignments,
      defaultCustomer: { id: customer._id, name: customer.name }
    });

    // Determine if this is a split subscription and find this customer's portion
    const myLine = billing.customerBreakdown?.find(
      (c) => String(c.customerId) === String(customer._id)
    );

    const customerServedDays = myLine !== undefined ? myLine.servedDays : billing.servedDays;
    const customerBill = myLine !== undefined ? myLine.amount : billing.totalBill;

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
        monthlyPrice: billing.monthlyPrice,
        totalWeekdays: billing.totalWeekdays,
        pausedDays: billing.pausedDays,
        servedDays: customerServedDays,
        dailyRate: billing.dailyRate,
        totalBill: customerBill,
        planTotalBill: billing.totalBill,
        planTotalServedDays: billing.servedDays,
        customerBreakdown: billing.customerBreakdown || []
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
