// clinic.controller.js
import mongoose from "mongoose";
import { Clinic } from "../models/clinic.model.js";
import { connectDB } from "../config/db.js";

const BASE_URL =
  process.env.CLINIC_BASE_URL || "http://localhost:3000/clinic/";

/* ----------------------------- */
/* HELPER */
/* ----------------------------- */
const formatClinic = (clinic) => {
  const obj = clinic.toObject();
  return {
    ...obj,
    clinicLink: `${BASE_URL}${obj.clinicId}`,
  };
};

/* ----------------------------- */
/* CREATE CLINIC */
/* ----------------------------- */
export const createClinic = async (req, res) => {
  try {
    await connectDB(); // ✅ FIX

    const { name, email, phone, blogContent, logo } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Clinic name is required",
      });
    }

    let logoUrl = logo || null;

    if (req.file) {
      logoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString(
        "base64"
      )}`;
    }

    const clinic = await Clinic.create({
      name: name.trim(),
      email,
      phone,
      logo: logoUrl,
      blogContent,
    });

    return res.status(201).json({
      success: true,
      data: formatClinic(clinic),
    });
  } catch (error) {
    console.error("❌ Create clinic error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create clinic",
      error: error.message,
    });
  }
};

/* ----------------------------- */
/* UPDATE CLINIC */
/* ----------------------------- */
export const updateClinic = async (req, res) => {
  try {
    await connectDB(); // ✅ FIX

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid clinic ID",
      });
    }

    const updates = { ...req.body };

    if (req.file) {
      updates.logo = `data:${req.file.mimetype};base64,${req.file.buffer.toString(
        "base64"
      )}`;
    }

    const clinic = await Clinic.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: "Clinic not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: formatClinic(clinic),
    });
  } catch (error) {
    console.error("❌ Update clinic error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update clinic",
      error: error.message,
    });
  }
};

/* ----------------------------- */
/* GET ALL CLINICS */
/* ----------------------------- */
export const getClinics = async (req, res) => {
  try {
    await connectDB(); // ✅ FIX

    const clinics = await Clinic.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: clinics.length,
      data: clinics.map(formatClinic),
    });
  } catch (error) {
    console.error("❌ Get clinics error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch clinics",
      error: error.message,
    });
  }
};

/* ----------------------------- */
/* GET CLINIC BY ID */
/* ----------------------------- */
export const getClinicById = async (req, res) => {
  try {
    await connectDB(); // ✅ FIX

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid clinic ID",
      });
    }

    const clinic = await Clinic.findById(id);

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: "Clinic not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: formatClinic(clinic),
    });
  } catch (error) {
    console.error("❌ Get clinic by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch clinic",
      error: error.message,
    });
  }
};

/* ----------------------------- */
/* GET CLINIC BY clinicId */
/* ----------------------------- */
export const getClinicByClinicId = async (req, res) => {
  try {
    await connectDB(); // ✅ FIX

    const { clinicId } = req.params;

    const clinic = await Clinic.findOne({ clinicId });

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: "Clinic not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: formatClinic(clinic),
    });
  } catch (error) {
    console.error("❌ Get clinic by clinicId error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch clinic",
      error: error.message,
    });
  }
};

/* ----------------------------- */
/* DELETE CLINIC */
/* ----------------------------- */
export const deleteClinic = async (req, res) => {
  try {
    await connectDB(); // ✅ FIX

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid clinic ID",
      });
    }

    const clinic = await Clinic.findByIdAndDelete(id);

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: "Clinic not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Clinic deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete clinic error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete clinic",
      error: error.message,
    });
  }
};