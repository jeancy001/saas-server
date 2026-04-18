// controllers/payment.controller.js
import axios from "axios";
import { createPaymentRecord } from "../services/payment.service.js";

/* ---------------- GET GOFRESHPAY TOKEN ---------------- */
const getGoFreshToken = async () => {
  const response = await axios.post(
    "https://moko.gofreshpay.com/api/v1/auth/parent/login",
    {
      merchant_code: process.env.GOFRESHPAY_MERCHANT_CODE,
      institution_code: process.env.GOFRESHPAY_INSTITUTION_CODE,
      merchant_secrete: process.env.GOFRESHPAY_SECRET,
    }
  );

  return response.data?.token;
};

/* ---------------- INITIATE PAYMENT ---------------- */
export const initiatePayment = async (req, res) => {
  try {
    const {
      clinicId,
      appointmentId,
      amount,
      phone,
      email,
      firstname,
      lastname = "User",
      method = "airtel",
    } = req.body;

    /* ---------------- VALIDATION ---------------- */

    if (!clinicId || typeof clinicId !== "string" || !clinicId.trim()) {
      return res.status(400).json({
        success: false,
        message: "Invalid clinicId",
      });
    }

    const normalizedClinicId = clinicId.trim();

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid amount",
      });
    }

    if (!phone || !email) {
      return res.status(400).json({
        success: false,
        message: "Phone and email required",
      });
    }

    /* ---------------- USER ---------------- */
    const userId = req.user?._id || null;

    /* ---------------- CREATE PAYMENT RECORD ---------------- */
    const payment = await createPaymentRecord({
      userId,
      clinicId: normalizedClinicId,
      appointmentId: appointmentId || null,
      amount: Number(amount),
      phone,
      email,
      firstname,
    });

    /* ---------------- GET AUTH TOKEN ---------------- */
    const token = await getGoFreshToken();

    if (!token) {
      return res.status(500).json({
        success: false,
        message: "Failed to authenticate payment provider",
      });
    }

    /* ---------------- GATEWAY REQUEST ---------------- */
    const response = await axios.post(
      "https://moko.gofreshpay.com/api/v1/payments/initiate",
      {
        merchant_id: process.env.GOFRESHPAY_MERCHANT_ID,
        merchant_secret: process.env.GOFRESHPAY_SECRET,

        amount: Number(amount),
        currency: "CDF",
        action: "debit",

        customer_number: phone,
        firstname: firstname || "User",
        lastname,
        email,

        reference: payment.reference,
        method,

        callback_url: `${process.env.BASE_URL}/api/v1/payments/callback`,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`, // ✅ FIXED HERE
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    /* ---------------- RESPONSE ---------------- */
    return res.status(200).json({
      success: true,
      payment,
      gateway: response.data,
    });
  } catch (error) {
    console.error(
      "Payment Error:",
      error?.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message:
        error?.response?.data?.message ||
        error.message ||
        "Payment initiation failed",
    });
  }
};