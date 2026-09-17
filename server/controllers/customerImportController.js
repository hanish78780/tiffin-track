const Customer = require("../models/Customer");
const Subscription = require("../models/Subscription");
const SubscriptionAssignment = require("../models/SubscriptionAssignment");
const {
  normalizePhone,
  normalizeDate,
  parseCSV
} = require("../utils/importUtils");

/**
 * POST /api/customers/import
 * Imports a messy CSV customer list into clean customers and subscriptions (T4).
 * Returns { imported, deduped, rejected } with detailed line reports.
 *
 * Scoped strictly to authenticated owner (req.user.id).
 */
const importCustomers = async (req, res, next) => {
  try {
    let csvContent = "";

    if (typeof req.body === "string") {
      csvContent = req.body;
    } else if (req.body?.csv) {
      csvContent = req.body.csv;
    } else if (req.body?.data) {
      csvContent = req.body.data;
    }

    if (!csvContent || typeof csvContent !== "string" || !csvContent.trim()) {
      return res.status(400).json({
        success: false,
        message: "CSV data is required in request body (as text/csv or JSON { csv: '...' })"
      });
    }

    const rows = parseCSV(csvContent);

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid rows found in CSV. Ensure headers exist (name, phone, address, planName, monthlyPrice, startDate)"
      });
    }

    const imported = [];
    const deduped = [];
    const rejected = [];
    const seenPhonesInBatch = new Set();

    for (const rowItem of rows) {
      const { rowNumber, data } = rowItem;

      // Extract and normalize fields
      const name = data.name?.trim();
      const rawPhone = data.phone;
      const planName = data.planname?.trim() || data.plan?.trim();
      const rawPrice = data.monthlyprice || data.price;
      const rawStartDate = data.startdate || data.date;
      const address = data.address?.trim() || "Address not provided";

      // 1. Validate required name
      if (!name) {
        rejected.push({
          row: rowNumber,
          reason: "Missing required name"
        });
        continue;
      }

      // 2. Validate and normalize phone
      const normalizedPhone = normalizePhone(rawPhone);
      if (!normalizedPhone) {
        rejected.push({
          row: rowNumber,
          name,
          phone: rawPhone || "",
          reason: "Missing or invalid 10-digit phone number"
        });
        continue;
      }

      // 3. Validate planName
      if (!planName) {
        rejected.push({
          row: rowNumber,
          name,
          reason: "Missing required planName"
        });
        continue;
      }

      // 4. Validate monthlyPrice
      const monthlyPrice = parseFloat(rawPrice);
      if (isNaN(monthlyPrice) || monthlyPrice <= 0) {
        rejected.push({
          row: rowNumber,
          name,
          price: rawPrice || "",
          reason: "Monthly price must be a positive number"
        });
        continue;
      }

      // 5. Validate startDate
      const normalizedStartDate = normalizeDate(rawStartDate);
      if (!normalizedStartDate) {
        rejected.push({
          row: rowNumber,
          name,
          startDate: rawStartDate || "",
          reason: "Invalid start date format (supported: YYYY-MM-DD, DD/MM/YYYY, etc.)"
        });
        continue;
      }

      // 6. Check for duplicate within the same batch
      if (seenPhonesInBatch.has(normalizedPhone)) {
        deduped.push({
          row: rowNumber,
          name,
          phone: normalizedPhone,
          reason: "Duplicate phone in import file"
        });
        continue;
      }

      // 7. Check for existing customer in database for this owner
      const existingCustomer = await Customer.findOne({
        ownerId: req.user.id,
        phone: normalizedPhone
      });

      if (existingCustomer) {
        deduped.push({
          row: rowNumber,
          name,
          phone: normalizedPhone,
          reason: "Customer with this phone already exists in your account"
        });
        continue;
      }

      // 8. Create Customer and Subscription atomically per row
      try {
        const customer = await Customer.create({
          name,
          phone: normalizedPhone,
          address,
          ownerId: req.user.id
        });

        const subscription = await Subscription.create({
          customerId: customer._id,
          ownerId: req.user.id,
          planName,
          monthlyPrice,
          startDate: normalizedStartDate,
          status: "active"
        });

        await SubscriptionAssignment.create({
          ownerId: req.user.id,
          subscriptionId: subscription._id,
          customerId: customer._id,
          startDate: normalizedStartDate,
          endDate: null
        });

        seenPhonesInBatch.add(normalizedPhone);

        imported.push({
          row: rowNumber,
          customerId: customer._id,
          subscriptionId: subscription._id,
          customerName: name,
          phone: normalizedPhone,
          planName,
          monthlyPrice
        });
      } catch (err) {
        // Handle race conditions or database uniqueness constraint
        if (err.code === 11000) {
          deduped.push({
            row: rowNumber,
            name,
            phone: normalizedPhone,
            reason: "Duplicate phone in account (database constraint)"
          });
        } else {
          rejected.push({
            row: rowNumber,
            name,
            reason: `Database error: ${err.message}`
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      imported: imported.length,
      deduped: deduped.length,
      rejected: rejected.length,
      summary: {
        imported: imported.length,
        deduped: deduped.length,
        rejected: rejected.length
      },
      details: {
        imported,
        deduped,
        rejected
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  importCustomers
};
