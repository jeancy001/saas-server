import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema(
  {
clinicId: {
  type: String,
  required: true,
  index: true,
},

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // guest support
    },
    doctorId:{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: false, 
    },
    // ✅ Guest booking fallback
    guest: {
      name: String,
      email: String,
      phone: String,
    },

    motif: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export const Appointment = mongoose.model("Appointment", appointmentSchema);