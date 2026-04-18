// services/payment.service.js
import { Payment } from "../models/payment.model.js";
import crypto from "crypto";

/* ---------------- CREATE PAYMENT ---------------- */
export const createPaymentRecord = async ({
  userId,
  clinicId,
  appointmentId,
  amount,
  currency = "USD",
  provider = "gofreshpay",
  phone,
  email,
  firstname,
}) => {
  // ✅ STRING validation ONLY (NO ObjectId)
  if (!clinicId || typeof clinicId !== "string") {
    throw new Error("Invalid clinicId");
  }

  // normalize
  const normalizedClinicId = clinicId.trim();

  // optional appointmentId validation (KEEP ObjectId only here if needed)
  if (appointmentId && typeof appointmentId !== "string") {
    throw new Error("Invalid appointmentId");
  }

  const reference = crypto.randomUUID();

  const payment = await Payment.create({
    userId: userId || null,
    clinicId: normalizedClinicId, // ✅ STRING STORED AS-IS
    appointmentId: appointmentId || null,
    amount,
    currency,
    provider,
    reference,
    status: "pending",

    metadata: {
      phone,
      email,
      firstname,
    },
  });

  return payment;
};

/* ---------------- MARK SUCCESS ---------------- */
export const markPaymentSuccess = async (reference, transactionId) => {
  const payment = await Payment.findOneAndUpdate(
    { reference },
    {
      status: "paid",
      transactionId,
      paidAt: new Date(),
    },
    { new: true }
  );

  if (!payment) {
    throw new Error("Payment not found");
  }

  return payment;
};

/* ---------------- MARK FAILED ---------------- */
export const markPaymentFailed = async (reference) => {
  const payment = await Payment.findOneAndUpdate(
    { reference },
    {
      status: "failed",
      failedAt: new Date(),
    },
    { new: true }
  );

  if (!payment) {
    throw new Error("Payment not found");
  }

  return payment;
};