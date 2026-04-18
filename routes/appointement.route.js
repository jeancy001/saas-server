import express from "express";
import {
  createAppointment,
  getMyAppointments,
  getClinicAppointments,
  updateAppointmentStatus,
  deleteAppointment,
} from "../controllers/appointment.controller.js";

import { protect, optionalProtect} from "../middlewares/auth.middleware.js";
import { resolveClinic ,} from "../middlewares/resolveClinic.middleware.js";

const router = express.Router();

/* ---------------- CREATE APPOINTMENT (guest + user) ---------------- */
router.post(
  "/:clinicId",
   optionalProtect,
  resolveClinic,
  createAppointment
);

/* ---------------- GET MY APPOINTMENTS ---------------- */
router.get(
  "/my",
  protect,
  getMyAppointments
);

/* ---------------- GET CLINIC APPOINTMENTS (ADMIN) ---------------- */
router.get(
  "/:clinicId/admin",
  protect,
  resolveClinic,
  getClinicAppointments
);

/* ---------------- UPDATE STATUS ---------------- */
router.put(
  "/:clinicId/:id/status",
  protect,
  resolveClinic,
  updateAppointmentStatus
);

/* ---------------- DELETE APPOINTMENT ---------------- */
router.delete(
  "/:clinicId/:id",
  protect,
  resolveClinic,
  deleteAppointment
);

export { router as appointmentRoutes };