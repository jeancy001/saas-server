import { Clinic } from "../models/clinic.model.js";

const BASE_URL = "http://localhost:3000/clinic/";


// CREATE CLINIC
export const createClinic = async (req, res) => {
  try {

    const { name, logo, blogContent } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Clinic name is required"
      });
    }

    const clinic = new Clinic({
      name,
      logo,
      blogContent
    });

    const savedClinic = await clinic.save();

    return res.status(201).json({
      success: true,
      data: {
        ...savedClinic.toObject(),
        clinicLink: BASE_URL + savedClinic.clinicId
      }
    });

  } catch (error) {

    console.error("Create clinic error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create clinic",
      error: error.message
    });

  }
};



// GET ALL CLINICS
export const getClinics = async (req, res) => {
  try {

    const clinics = await Clinic.find().sort({ createdAt: -1 });

    const formatted = clinics.map((clinic) => ({
      ...clinic.toObject(),
      clinicLink: BASE_URL + clinic.clinicId
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted
    });

  } catch (error) {

    console.error("Get clinics error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch clinics",
      error: error.message
    });

  }
};



// GET SINGLE CLINIC BY MONGODB ID
export const getClinicById = async (req, res) => {
  try {

    const { id } = req.params;

    const clinic = await Clinic.findById(id);

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: "Clinic not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...clinic.toObject(),
        clinicLink: BASE_URL + clinic.clinicId
      }
    });

  } catch (error) {

    console.error("Get clinic by id error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch clinic",
      error: error.message
    });

  }
};



// GET CLINIC BY clinicId (USED BY SaaS LINK)
export const getClinicByClinicId = async (req, res) => {
  try {

    const { clinicId } = req.params;

    const clinic = await Clinic.findOne({ clinicId });

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: "Clinic not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: clinic
    });

  } catch (error) {

    console.error("Get clinic by clinicId error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch clinic",
      error: error.message
    });

  }
};



// UPDATE CLINIC
export const updateClinic = async (req, res) => {
  try {

    const { id } = req.params;

    const clinic = await Clinic.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: "Clinic not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: clinic
    });

  } catch (error) {

    console.error("Update clinic error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update clinic",
      error: error.message
    });

  }
};



// DELETE CLINIC
export const deleteClinic = async (req, res) => {
  try {

    const { id } = req.params;

    const clinic = await Clinic.findByIdAndDelete(id);

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: "Clinic not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Clinic deleted successfully"
    });

  } catch (error) {

    console.error("Delete clinic error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete clinic",
      error: error.message
    });

  }
};
