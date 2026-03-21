// clinic.routes.js
import express from "express";
import multer from "multer";
import {
  createClinic,
  getClinics,
  getClinicById,
  getClinicByClinicId,
  updateClinic,
  deleteClinic
} from "../controllers/clinic.controller.js";

const router = express.Router();

// Configure multer for memory storage (direct upload to Supabase)
const upload = multer({ storage: multer.memoryStorage() });

// -----------------------------
// ROUTES
// -----------------------------
router.post("/create", upload.single("logo"), createClinic); // 'logo' field for file
router.get("/", getClinics);
router.get("/:id", getClinicById);
router.get("/clinic-link/:clinicId", getClinicByClinicId);
router.put("/:id", upload.single("logo"), updateClinic); // allow updating logo
router.delete("/:id", deleteClinic);

export { router as clinicRouter };