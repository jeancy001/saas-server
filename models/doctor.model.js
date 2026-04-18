import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      default: "",
    },

    specialty: {
      type: String,
      required: true,
      trim: true,
    },

    experience: {
      type: Number, // years of experience
      default: 0,
    },

    clinicId: {
      type: String,
      required: true,
    },

    availableDays: {
      type: [String], // e.g. ["Monday", "Wednesday"]
      default: [],
    },

    availableHours: {
      start: {
        type: String, // "09:00"
        default: "09:00",
      },
      end: {
        type: String, // "17:00"
        default: "17:00",
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    avatar: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export const Doctor = mongoose.model("Doctor", doctorSchema);