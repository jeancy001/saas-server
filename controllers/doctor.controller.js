import mongoose from "mongoose";
import { Doctor } from "../models/doctor.model.js";
import { Clinic } from "../models/clinic.model.js";

/* =========================
   NORMALIZE CLINIC ID (SAFE + FALLBACK)
========================= */
const resolveClinicId = async (clinicId) => {
  if (!clinicId) return null;

  // 1. Try slug first
  let clinic = await Clinic.findOne({ clinicId });

  if (clinic) return clinic.clinicId;

  // 2. Fallback ObjectId (old system support)
  if (mongoose.Types.ObjectId.isValid(clinicId)) {
    const byId = await Clinic.findById(clinicId);

    if (byId) {
      // 🔥 auto-fix future requests (optional but powerful)
      return byId.clinicId;
    }
  }

  return null;
};

/* =========================
   SAFE CLINIC EXTRACTOR (NEW 🔥)
========================= */
const getClinicFromRequest = async (req) => {
  const rawClinicId = req.user?.clinicId;

  if (!rawClinicId) return null;

  return await resolveClinicId(rawClinicId);
};

/* =========================
   CREATE DOCTOR (ADMIN ONLY)
========================= */
export const createDoctor = async (req, res) => {
  try {
    const clinicId = await getClinicFromRequest(req); // 🔥 FIXED

    const { name, email, phone, specialty, available = true, availableMedicines = [] } = req.body;

    if (!name || !email || !specialty) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (!clinicId) {
      return res.status(401).json({
        success: false,
        message: "Clinic session expired. Please login again.",
      });
    }

    const exists = await Doctor.findOne({
      email: email.trim().toLowerCase(),
      clinicId,
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Doctor already exists in this clinic",
      });
    }

    const doctor = await Doctor.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim(),
      specialty: specialty.trim(),
      clinicId, // ✅ always slug
      available,
      availableMedicines,
    });

    return res.status(201).json({
      success: true,
      data: doctor,
    });
  } catch (err) {
    console.error("CREATE DOCTOR ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================
   GET DOCTORS
========================= */
export const getDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find()
      .populate("clinicId", "name clinicId logo")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors,
    });
  } catch (err) {
    console.error("GET DOCTORS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================
   GET SINGLE DOCTOR
========================= */
export const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;
    const clinicId = await getClinicFromRequest(req);

    if (!clinicId) {
      return res.status(401).json({
        success: false,
        message: "Invalid session",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctorId",
      });
    }

    const doctor = await Doctor.findOne({ _id: id, clinicId });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    return res.json({
      success: true,
      data: doctor,
    });
  } catch (err) {
    console.error("GET DOCTOR ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================
   UPDATE DOCTOR
========================= */
export const updateDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const clinicId = await getClinicFromRequest(req);

    if (!clinicId) {
      return res.status(401).json({
        success: false,
        message: "Invalid session",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctorId",
      });
    }

    const updateData = { ...req.body };

    if (updateData.email) updateData.email = updateData.email.trim().toLowerCase();
    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.specialty) updateData.specialty = updateData.specialty.trim();

    const doctor = await Doctor.findOneAndUpdate(
      { _id: id, clinicId },
      { $set: updateData },
      { new: true }
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    return res.json({
      success: true,
      data: doctor,
    });
  } catch (err) {
    console.error("UPDATE DOCTOR ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================
   DELETE DOCTOR
========================= */
export const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const clinicId = await getClinicFromRequest(req);

    if (!clinicId) {
      return res.status(401).json({
        success: false,
        message: "Invalid session",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctorId",
      });
    }

    const doctor = await Doctor.findOneAndDelete({ _id: id, clinicId });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    return res.json({
      success: true,
      message: "Doctor deleted successfully",
    });
  } catch (err) {
    console.error("DELETE DOCTOR ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};