import express from "express";
import {
  createClinic,
  getClinics,
  getClinicById,
  getClinicByClinicId,
  updateClinic,
  deleteClinic
} from "../controllers/clinic.controller.js";

const router = express.Router();

router.post("/create", createClinic);

router.get("/", getClinics);

router.get("/:id", getClinicById);

router.get("/clinic-link/:clinicId", getClinicByClinicId);

router.put("/clinic/:id", updateClinic);

router.delete("/clinic/:id", deleteClinic);

export {router as clinicRouter
 };
