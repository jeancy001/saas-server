import express from "express";
import {
  createDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
} from "../controllers/doctor.controller.js";

import { protect, adminOnly } from "../middlewares/auth.middleware.js";

const router = express.Router();

// 🔐 Protected routes
router.get("/doctors", protect, getDoctors);
router.get("/:id", protect, getDoctorById);

// 🔒 Admin only
router.post("/", protect, adminOnly, createDoctor);
router.put("/:id", protect, adminOnly, updateDoctor);
router.delete("/:id", protect, adminOnly, deleteDoctor);

export {router as doctorRouter };