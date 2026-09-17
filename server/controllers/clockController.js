const Subscription = require("../models/Subscription");
const Customer = require("../models/Customer");
const PausePeriod = require("../models/PausePeriod");
const NotificationOutbox = require("../models/NotificationOutbox");

/**
 * Normalizes date to UTC midnight timestamp
 */
const toUTCMidnight = (d) => {
  const date = new Date(d);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

/**
 * POST /clock (and /api/clock)
 * Advances the clock to a specific date and processes morning delivery notifications.
 *
 * Eligible criteria:
 * 1. Date is Monday-Friday (no weekend delivery)
 * 2. Subscription is active and started on or before target date
 * 3. Subscription is not paused on target date
 * 4. Belongs to authenticated owner (if request is authenticated)
 * 5. Deterministic and idempotent via unique deliveryEventKey (${subscriptionId}_${date})
 */
const advanceClock = async (req, res, next) => {
  try {
    const rawDate =
      req.body?.date ||
      req.body?.today ||
      req.body?.currentDate ||
      req.body?.iso ||
      req.query?.date ||
      new Date().toISOString().slice(0, 10);

    // Validate YYYY-MM-DD
    const dateMatch = String(rawDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!dateMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Expected YYYY-MM-DD"
      });
    }

    const year = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10);
    const day = parseInt(dateMatch[3], 10);

    const dateUtcMs = Date.UTC(year, month - 1, day);
    const dateObj = new Date(dateUtcMs);
    const dayOfWeek = dateObj.getUTCDay();
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    // Check if weekend (0 = Sunday, 6 = Saturday)
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    if (!isWeekday) {
      return res.status(200).json({
        success: true,
        date: dateStr,
        isWeekday: false,
        message: "Weekend — no lunch delivery scheduled",
        eligible: 0,
        notified: 0,
        events: []
      });
    }

    // Build subscription query
    const subFilter = {
      status: "active"
    };

    if (req.user?.id) {
      subFilter.ownerId = req.user.id;
    } else if (req.body?.ownerId) {
      subFilter.ownerId = req.body.ownerId;
    }

    const activeSubscriptions = await Subscription.find(subFilter);

    // We dynamically require SubscriptionAssignment in case T6 is present
    let SubscriptionAssignment = null;
    try {
      SubscriptionAssignment = require("../models/SubscriptionAssignment");
    } catch {
      // not yet loaded
    }

    const eligibleEvents = [];
    const newlyCreatedEvents = [];

    for (const sub of activeSubscriptions) {
      // Must have started on or before target date
      const subStartMs = toUTCMidnight(sub.startDate);
      if (subStartMs > dateUtcMs) {
        continue;
      }

      // Check pause periods for this subscription
      const pausePeriods = await PausePeriod.find({
        subscriptionId: sub._id
      });

      let isPausedToday = false;
      for (const pause of pausePeriods) {
        const pauseStartMs = toUTCMidnight(pause.startDate);
        const pauseEndMs = pause.endDate ? toUTCMidnight(pause.endDate) : Infinity;

        if (dateUtcMs >= pauseStartMs && dateUtcMs <= pauseEndMs) {
          isPausedToday = true;
          break;
        }
      }

      if (isPausedToday) {
        continue;
      }

      // Determine active customer (supports T6 transfer history if present)
      let effectiveCustomerId = sub.customerId;
      if (SubscriptionAssignment) {
        const assignment = await SubscriptionAssignment.findOne({
          subscriptionId: sub._id,
          startDate: { $lte: new Date(dateUtcMs) },
          $or: [
            { endDate: null },
            { endDate: { $gte: new Date(dateUtcMs) } }
          ]
        }).sort({ startDate: -1 });

        if (assignment) {
          effectiveCustomerId = assignment.customerId;
        }
      }

      const customer = await Customer.findById(effectiveCustomerId);
      if (!customer) {
        continue;
      }

      const deliveryEventKey = `${sub._id}_${dateStr}`;
      eligibleEvents.push({
        subscriptionId: sub._id,
        customerId: customer._id,
        customerName: customer.name,
        phone: customer.phone,
        planName: sub.planName,
        deliveryDate: dateStr,
        deliveryEventKey
      });

      // Idempotent insertion using unique deliveryEventKey
      try {
        const created = await NotificationOutbox.create({
          ownerId: sub.ownerId,
          customerId: customer._id,
          subscriptionId: sub._id,
          customerName: customer.name,
          phone: customer.phone,
          planName: sub.planName || "Monthly Lunch",
          type: "tiffin_delivery",
          deliveryDate: dateStr,
          deliveryEventKey,
          status: "delivered"
        });
        newlyCreatedEvents.push(created);
      } catch (err) {
        // E11000 duplicate key error means already notified for this date
        if (err.code !== 11000) {
          throw err;
        }
      }
    }

    res.status(200).json({
      success: true,
      date: dateStr,
      isWeekday: true,
      eligible: eligibleEvents.length,
      notified: newlyCreatedEvents.length,
      events: newlyCreatedEvents.map((e) => ({
        id: e._id,
        type: e.type,
        customerId: e.customerId,
        customerName: e.customerName,
        phone: e.phone,
        deliveryDate: e.deliveryDate,
        subscriptionId: e.subscriptionId
      }))
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  advanceClock
};
