const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true
    }
  },
  { timestamps: true }
);

// Phone is unique per owner, not globally
customerSchema.index({ ownerId: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model("Customer", customerSchema);
