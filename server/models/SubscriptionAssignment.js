const mongoose = require("mongoose");

const subscriptionAssignmentSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Indexes to quickly find active assignment by date range and owner
subscriptionAssignmentSchema.index({ ownerId: 1, subscriptionId: 1, startDate: 1 });
subscriptionAssignmentSchema.index({ ownerId: 1, customerId: 1 });

module.exports = mongoose.model("SubscriptionAssignment", subscriptionAssignmentSchema);
