import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    username: { type: String },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },

    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Clinic",
      required: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },

    country: String,
    city: String,
    gender: String,
    profileUrl: String,
    tel: String,

    address: [
      {
        ville: String,
        pays: String,
      },
    ],

    // ✅ FIXED ROLE
    role: {
      type: String,
      enum: ["admin", "staff", "patient", "doctor", "medicine"],
      default: "patient",
    },

    isVerified: { type: Boolean, default: false },

    otpCode: String,
    otpExpiry: Date,
    otpAttempts: { type: Number, default: 0 },
    otpLockUntil: Date,
    otpLastAction: String,
    otpLastIp: String,

    refreshToken: String,
    resetCode: String,
    resetCodeExpire: Date,

    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);