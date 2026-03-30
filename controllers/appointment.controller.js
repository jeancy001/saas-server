import { Appointment } from "../models/appointement.model.js";

/* ---------------- CREATE APPOINTMENT ---------------- */
export const createAppointment = async (req, res) => {
  try {
    const { motif, date, guest } = req.body;

    if (!motif || !date) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const clinicId = req.clinicId; // "en1rcy4q"
    const userId = req.user?._id || null;
    const doctorId = req.user?._id || null

    if (!clinicId || typeof clinicId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid clinicId",
      });
    }

    const appointmentDate = new Date(date);

    if (isNaN(appointmentDate.getTime())) {
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

    if (!userId && (!guest?.name || !guest?.email)) {
      return res.status(400).json({
        success: false,
        message: "Guest name and email are required",
      });
    }

    const appointment = await Appointment.create({
      clinicId, // STRING STORAGE
      userId,
      doctorId,
      motif,
      date: appointmentDate,
      guest: userId
        ? undefined
        : {
            name: guest.name,
            email: guest.email,
            phone: guest.phone || "",
          },
      status: "pending",
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
      .populate("userId", "name email")
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