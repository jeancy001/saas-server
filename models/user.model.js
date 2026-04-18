import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
      minlength: 3,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },

    clinicId: {
      type:String,
      required: [true, "Clinic is required"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },

    name: { type: String, trim: true },

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

    // AUTH TOKENS
    accessToken: {
      type: String,
      select: false,
      default: null,
    },

    refreshToken: {
      type: String,
      select: false,
      default: null,
    },

    resetCode: String,
    resetCodeExpire: Date,

    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);