import express from "express";
import {
  createAppointment,
  getMyAppointments,
  getClinicAppointments,
  updateAppointmentStatus,
  deleteAppointment,
} from "../controllers/appointment.controller.js";

import { protect ,optionalAuth} from "../middlewares/auth.middleware.js"

const router = express.Router();

// ✅ guest + user
router.post("/", optionalAuth, createAppointment);

// ✅ only logged users
router.get("/my", protect, getMyAppointments);

// ✅ clinic admin
router.get("/clinic/:clinicId", protect, getClinicAppointments);

router.put("/:id/status", protect, updateAppointmentStatus);
router.delete("/:id", protect, deleteAppointment);

export {router as  appointementRoutes};