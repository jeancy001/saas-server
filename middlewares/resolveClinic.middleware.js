import { Clinic } from "../models/clinic.model.js";

/**
 * Clinic resolver (multi-source + slug-based SaaS routing)
 *
 * Sources priority:
 * 1. req.params.clinicId
 * 2. req.params.id
 * 3. req.query.clinicId
 * 4. req.body.clinicId
 * 5. req.user.clinicId
 */
export const resolveClinic = async (req, res, next) => {
  try {
    // avoid double resolution (performance optimization)
    if (req.clinic) return next();

    const rawClinicId =
      req.params?.clinicId ||
      req.params?.id ||
      req.query?.clinicId ||
      req.body?.clinicId ||
      req.user?.clinicId;

    if (!rawClinicId) {
      return res.status(400).json({
        success: false,
        message: "clinicId is required",
      });
    }

    const clinicId = String(rawClinicId).trim().toLowerCase();

    // strict slug validation (safe SaaS tenant key)
    const isValidSlug = /^[a-z0-9]{4,32}$/.test(clinicId);

    if (!isValidSlug) {
      return res.status(400).json({
        success: false,
        message: "Invalid clinicId format",
      });
    }

    // lookup by PUBLIC slug (NOT ObjectId)
    const clinic = await Clinic.findOne({ clinicId });

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: "Clinic not found",
      });
    }

    // attach resolved tenant
    req.clinic = clinic;
    req.clinicId = clinic.clinicId;

    return next();
  } catch (err) {
    console.error("resolveClinic error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to resolve clinic",
    });
  }
};