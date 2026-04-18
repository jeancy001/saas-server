// models/payment.model.js
import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },

    clinicId: {
      type: String,
      required: true,
    },

    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "USD",
    },

    provider: {
      type: String,
      enum: ["gofreshpay", "stripe", "manual"],
      default: "gofreshpay",
    },

    status: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled"],
      default: "pending",
    },

    transactionId: {
      type: String,
      default: null,
    },

    reference: {
      type: String,
      unique: true,
    },

    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

export const Payment = mongoose.model("Payment", paymentSchema);