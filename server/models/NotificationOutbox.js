const mongoose = require("mongoose");

const notificationOutboxSchema = new mongoose.Schema(
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
      required: true,
      index: true
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
      index: true
    },
    type: {
      type: String,
      default: "tiffin_delivery"
    },
    phone: {
      type: String,
      required: true
    },
    customerName: {
      type: String,
      required: true
    },
    planName: {
      type: String,
      default: ""
    },
    deliveryDate: {
      type: String,
      required: true,
      index: true
    },
    deliveryEventKey: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    status: {
      type: String,
      enum: ["delivered", "pending", "failed"],
      default: "delivered"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("NotificationOutbox", notificationOutboxSchema);
