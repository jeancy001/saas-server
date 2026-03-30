import mongoose from "mongoose";
import { Doctor } from "../models/doctor.model.js";

/* =========================
   CREATE DOCTOR
========================= */
export const createDoctor = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      specialty,
      clinicId,
      available = true,
      availableMedicines = [],
    } = req.body;

    if (!name || !email || !specialty || !clinicId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(clinicId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid clinicId",
      });
    }

    const exists = await Doctor.findOne({ email, clinicId });

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
      clinicId,
      available,
      availableMedicines,
    });

    res.status(201).json({
      success: true,
      data: doctor,
    });
  } catch (err) {
    console.error("CREATE DOCTOR ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* =========================
   GET DOCTORS (SCOPED)
========================= */
export const getDoctors = async (req, res) => {
  try {
    const { clinicId } = req.query;

    const filter = {};

    if (clinicId) {
      if (!mongoose.Types.ObjectId.isValid(clinicId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid clinicId",
        });
      }
      filter.clinicId = clinicId;
    }

    const doctors = await Doctor.find(filter)
      .populate("clinicId", "name address")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: doctors,
    });
  } catch (err) {
    console.error("GET DOCTORS ERROR:", err);
    res.status(500).json({
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctorId",
      });
    }

    const doctor = await Doctor.findById(id).populate(
      "clinicId",
      "name address"
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    res.json({
      success: true,
      data: doctor,
    });
  } catch (err) {
    console.error("GET DOCTOR ERROR:", err);
    res.status(500).json({
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctorId",
      });
    }

    const updateData = { ...req.body };

    if (updateData.email) {
      updateData.email = updateData.email.trim().toLowerCase();
    }

    if (updateData.name) {
      updateData.name = updateData.name.trim();
    }

    if (updateData.specialty) {
      updateData.specialty = updateData.specialty.trim();
    }

    const doctor = await Doctor.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    res.json({
      success: true,
      data: doctor,
    });
  } catch (err) {
    console.error("UPDATE DOCTOR ERROR:", err);
    res.status(500).json({
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctorId",
      });
    }

    const doctor = await Doctor.findByIdAndDelete(id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    res.json({
      success: true,
      message: "Doctor deleted successfully",
    });
  } catch (err) {
    console.error("DELETE DOCTOR ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};