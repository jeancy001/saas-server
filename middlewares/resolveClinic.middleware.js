import { Clinic } from "../models/clinic.model.js";

/**
 * Resolves clinic from:
 * - params (:clinicId or :id)
 * - body (clinicId)
 * - query (?clinicId=)
 * - user context (req.user.clinicId)
 *
 * Supports STRING SLUGS like: "en1rcy4q"
 */
export const resolveClinic = async (req, res, next) => {
  try {
    const rawClinicId =
      req.params.clinicId ||
      req.params.id ||
      req.body.clinicId ||
      req.query.clinicId ||
      req.user?.clinicId ||
      null;

    if (!rawClinicId || typeof rawClinicId !== "string") {
      return res.status(400).json({
        success: false,
        message: "clinicId is required",
      });
    }

    const clinicId = rawClinicId.trim().toLowerCase();

    // optional: light validation for slug format
    const isValidSlug = /^[a-z0-9]{4,30}$/.test(clinicId);

    if (!isValidSlug) {
      return res.status(400).json({
        success: false,
        message: "Invalid clinicId format",
      });
    }

    // IMPORTANT: now using slug lookup, NOT ObjectId
    const clinic = await Clinic.findOne({ clinicId });

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: "Clinic not found",
      });
    }

    req.clinic = clinic;
    req.clinicId = clinic.clinicId; // keep STRING, not _id

    next();
  } catch (err) {
    console.error("resolveClinic error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to resolve clinic",
    });
  }
};