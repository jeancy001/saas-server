import { Appointment } from "../models/appointement.model.js";

/* ---------------- CREATE APPOINTMENT ---------------- */
export const createAppointment = async (req, res) => {
  try {
    const {
      motif,
      date,
      guest,
      paymentMode = "later",
      paymentReference,
      doctorId,
      phone: bodyPhone,
    } = req.body;

    const clinicId = req.clinicId;
    const userId = req.user?._id || null;

    /* ---------------- VALIDATION ---------------- */
    if (!clinicId || typeof clinicId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid clinicId",
      });
    }

    const appointmentDate = new Date(date);

    if (!date || isNaN(appointmentDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format",
      });
    }

    if (appointmentDate.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Date cannot be in the past",
      });
    }

    /* ---------------- PHONE FIX (IMPORTANT) ---------------- */
    const phone =
      req.user?.phone ||
      guest?.phone ||
      bodyPhone ||
      null;

    if (!phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    /* ---------------- GUEST VALIDATION ---------------- */
    if (!userId && (!guest?.name || !guest?.email)) {
      return res.status(400).json({
        success: false,
        message: "Guest name and email are required",
      });
    }

    /* ---------------- PAYMENT VALIDATION ---------------- */
    if (paymentMode === "now" && !paymentReference) {
      return res.status(400).json({
        success: false,
        message: "Payment required before booking",
      });
    }

    /* ---------------- CREATE APPOINTMENT ---------------- */
    const appointment = await Appointment.create({
      clinicId,
      userId,
      doctorId: doctorId || null,
      motif: motif || "",
      date: appointmentDate,

      paymentMode,
      paymentReference:
        paymentMode === "now" ? paymentReference : null,

      status:
        paymentMode === "later" ? "pending" : "confirmed",

      guest: userId
        ? undefined
        : {
            name: guest?.name || "",
            email: guest?.email || "",
            phone,
          },
    });

    return res.status(201).json({
      success: true,
      data: appointment,
    });
  } catch (err) {
    console.error("CREATE APPOINTMENT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ---------------- GET MY APPOINTMENTS ---------------- */
export const getMyAppointments = async (req, res) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const appointments = await Appointment.find({
      $or: [
        { userId: req.user._id },
        { "guest.email": req.user.email },
      ],
    }).sort({ date: -1 });

    return res.json({
      success: true,
      data: appointments,
    });
  } catch (err) {
    console.error("GET MY APPOINTMENTS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ---------------- GET CLINIC APPOINTMENTS ---------------- */
export const getClinicAppointments = async (req, res) => {
  try {
    const clinicId = req.clinicId;

    if (!clinicId || typeof clinicId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid clinicId",
      });
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const appointments = await Appointment.find({ clinicId })
      .populate("userId", "name email phone")
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.json({
      success: true,
      data: appointments,
      pagination: { page, limit },
    });
  } catch (err) {
    console.error("GET CLINIC APPOINTMENTS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ---------------- UPDATE STATUS ---------------- */
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["pending", "confirmed", "cancelled"];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (appointment.clinicId !== req.clinicId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    appointment.status = status;
    await appointment.save();

    return res.json({
      success: true,
      data: appointment,
    });
  } catch (err) {
    console.error("UPDATE STATUS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ---------------- DELETE APPOINTMENT ---------------- */
export const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findById(id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    if (appointment.clinicId !== req.clinicId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden",
      });
    }

    await appointment.deleteOne();

    return res.json({
      success: true,
      message: "Deleted successfully",
    });
  } catch (err) {
    console.error("DELETE APPOINTMENT ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};