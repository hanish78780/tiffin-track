const mongoose = require("mongoose");

const pausePeriodSchema = new mongoose.Schema(
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
      required: [true, "Subscription ID is required"],
      index: true
    },
    startDate: {
      type: Date,
      required: [true, "Pause start date is required"]
    },
    endDate: {
      type: Date,
      default: null
    },
    reason: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("PausePeriod", pausePeriodSchema);
