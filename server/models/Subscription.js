const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer ID is required"],
      index: true
    },
    planName: {
      type: String,
      required: [true, "Plan name is required"],
      trim: true
    },
    monthlyPrice: {
      type: Number,
      required: [true, "Monthly price is required"],
      min: [0.01, "Monthly price must be positive"]
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"]
    },
    status: {
      type: String,
      enum: {
        values: ["active", "paused"],
        message: "Status must be either active or paused"
      },
      default: "active"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscription", subscriptionSchema);
