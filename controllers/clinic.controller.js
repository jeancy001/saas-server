// clinic.controller.js
import mongoose from "mongoose";
import { Clinic } from "../models/clinic.model.js";

const BASE_URL = process.env.CLINIC_BASE_URL || "http://localhost:3000/clinic/";

// -----------------------------
// Helper to format clinic response
// -----------------------------
const formatClinic = (clinic) => ({
  ...clinic.toObject(),
  clinicLink: `${BASE_URL}${clinic.clinicId}`,
});

// -----------------------------
// CREATE CLINIC
// -----------------------------
export const createClinic = async (req, res) => {
  try {
    const { name, email, phone, blogContent, logo } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Clinic name is required" });
    }

    // Determine logo URL: uploaded file or pasted URL
    let logoUrl = logo || null;
    if (req.file) {
      // Convert uploaded file to local URL (or store file and return path)
      // Here we just store as base64 string for demo purposes
      logoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }

    const clinic = await Clinic.create({ name, email, phone, logo: logoUrl, blogContent });

    return res.status(201).json({ success: true, data: formatClinic(clinic) });
  } catch (error) {
    console.error("Create clinic error:", error);
    return res.status(500).json({ success: false, message: "Failed to create clinic", error: error.message });
  }
};

// -----------------------------
// UPDATE CLINIC
// -----------------------------
export const updateClinic = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid clinic ID" });
    }

    const updates = { ...req.body };

    if (req.file) {
      // Convert uploaded file to base64 URL
      updates.logo = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
    }

    const clinic = await Clinic.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!clinic) return res.status(404).json({ success: false, message: "Clinic not found" });

    return res.status(200).json({ success: true, data: formatClinic(clinic) });
  } catch (error) {
    console.error("Update clinic error:", error);
    return res.status(500).json({ success: false, message: "Failed to update clinic", error: error.message });
  }
};

// -----------------------------
// GET ALL CLINICS
// -----------------------------
export const getClinics = async (req, res) => {
  try {
    const clinics = await Clinic.find().sort({ createdAt: -1 });
    const formatted = clinics.map(formatClinic);

    return res.status(200).json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    console.error("Get clinics error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch clinics", error: error.message });
  }
};

// -----------------------------
// GET CLINIC BY MONGODB ID
// -----------------------------
export const getClinicById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid clinic ID" });
    }

    const clinic = await Clinic.findById(id);
    if (!clinic) return res.status(404).json({ success: false, message: "Clinic not found" });

    return res.status(200).json({ success: true, data: formatClinic(clinic) });
  } catch (error) {
    console.error("Get clinic by id error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch clinic", error: error.message });
  }
};

// -----------------------------
// GET CLINIC BY clinicId (PUBLIC LINK)
// -----------------------------
export const getClinicByClinicId = async (req, res) => {
  try {
    const { clinicId } = req.params;
    const clinic = await Clinic.findOne({ clinicId });

    if (!clinic) return res.status(404).json({ success: false, message: "Clinic not found" });
    return res.status(200).json({ success: true, data: formatClinic(clinic) });
  } catch (error) {
    console.error("Get clinic by clinicId error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch clinic", error: error.message });
  }
};

// -----------------------------
// DELETE CLINIC
// -----------------------------
export const deleteClinic = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid clinic ID" });
    }

    const clinic = await Clinic.findByIdAndDelete(id);
    if (!clinic) return res.status(404).json({ success: false, message: "Clinic not found" });

    return res.status(200).json({ success: true, message: "Clinic deleted successfully" });
  } catch (error) {
    console.error("Delete clinic error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete clinic", error: error.message });
  }
};