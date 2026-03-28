import express from "express";
import {
  createDoctor,
  getDoctors,
  getDoctorById,
  updateDoctor,
  deleteDoctor,
} from "../controllers/doctor.controller.js";

const router = express.Router();

/* CREATE */
router.post("/", createDoctor);

/* GET ALL */
router.get("/", getDoctors);

/* GET ONE */
router.get("/:id", getDoctorById);

/* UPDATE */
router.put("/:id", updateDoctor);

/* DELETE */
router.delete("/:id", deleteDoctor);

export const doctorRouter = router;