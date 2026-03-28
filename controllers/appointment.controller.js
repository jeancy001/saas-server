import mongoose from "mongoose";
import { Appointment } from "../models/appointement.model.js";

/* CREATE */
export const createAppointment = async (req, res) => {
  try {
    const { clinicId, doctorId, motif, date, guest } = req.body;

    if (!clinicId || !motif || !date) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(clinicId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid clinicId",
      });
    }

    if (doctorId && !mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctorId",
      });
    }

    const userId = req.user?._id || null;

    // ✅ Guest validation
    if (!userId) {
      if (!guest || !guest.name || !guest.email) {
        return res.status(400).json({
          success: false,
          message: "Guest name and email are required",
        });
      }
    }

    // ✅ Prevent past booking
    const appointmentDate = new Date(date);
    if (appointmentDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Date cannot be in the past",
      });
    }

    // ✅ Prevent duplicate booking (same doctor + same time)
    if (doctorId) {
      const exists = await Appointment.findOne({
        doctorId,
        date: appointmentDate,
      });

      if (exists) {
        return res.status(400).json({
          success: false,
          message: "This time slot is already booked",
        });
      }
    }

    const appointment = await Appointment.create({
      clinicId,
      userId,
      doctorId: doctorId || null,
      motif,
      date: appointmentDate,
      guest: !userId
        ? {
            name: guest.name,
            email: guest.email,
            phone: guest.phone || "",
          }
        : null,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      data: appointment,
    });
  } catch (err) {
    console.error("CREATE APPOINTMENT ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getMyAppointments = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const appointments = await Appointment.find({
      userId: req.user._id,
    })
      .populate("doctorId", "name specialty")
      .sort({ date: -1 });

    res.json({
      success: true,
      data: appointments,
    });
  } catch (err) {
    console.error("GET MY APPOINTMENTS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getClinicAppointments = async (req, res) => {
  try {
    const { clinicId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(clinicId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid clinicId",
      });
    }

    const appointments = await Appointment.find({ clinicId })
      .populate("userId", "name email")
      .populate("doctorId", "name specialty")
      .sort({ date: -1 });

    res.json({
      success: true,
      data: appointments,
    });
  } catch (err) {
    console.error("GET CLINIC APPOINTMENTS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatus = ["pending", "confirmed", "cancelled"];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    res.json({
      success: true,
      data: appointment,
    });
  } catch (err) {
    console.error("UPDATE STATUS ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
export const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findByIdAndDelete(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    res.json({
      success: true,
      message: "Deleted successfully",
    });
  } catch (err) {
    console.error("DELETE APPOINTMENT ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};