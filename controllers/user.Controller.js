import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import { User } from "../models/user.model.js";
import { Clinic } from "../models/clinic.model.js";

import {
  generateAccessToken,
  generateRefreshToken,
} from "../services/token.js";

import { sendEmail } from "../utils/mailer.js";
import {
  generateAndSendOTP,
  verifyOTP,
} from "../utils/otpUtils.js";

import {
  uploadImage,
  deleteImage,
} from "../services/supabaseStorage.js";

/* ---------------- CONFIG ---------------- */

const isProd = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  path: "/",
};

/* ---------------- COOKIE ---------------- */

const setRefreshCookie = (res, token) => {
  res.cookie("refreshToken", token, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie("refreshToken", cookieOptions);
};

/* ---------------- HELPERS ---------------- */

// ✅ robust clinic resolver (slug + auto-fix ObjectId)
const attachClinic = async (user) => {
  if (!user?.clinicId) {
    return { ...user.toObject(), clinic: null };
  }

  let clinic = null;
  let finalClinicId = user.clinicId;

  // ✅ CASE 1: already slug
  clinic = await Clinic.findOne({ clinicId: user.clinicId });

  // ✅ CASE 2: old ObjectId → FIX IT automatically
  if (!clinic && mongoose.Types.ObjectId.isValid(user.clinicId)) {
    const clinicById = await Clinic.findById(user.clinicId);

    if (clinicById) {
      clinic = clinicById;

      // 🔥 AUTO-MIGRATION (IMPORTANT)
      finalClinicId = clinicById.clinicId;

      await User.findByIdAndUpdate(user._id, {
        clinicId: clinicById.clinicId,
      });
    }
  }

  return {
    ...user.toObject(),

    // ✅ ALWAYS return slug (FIXED)
    clinicId: finalClinicId,

    clinic: clinic
      ? {
          clinicId: clinic.clinicId,
          name: clinic.name,
          logo: clinic.logo,
        }
      : null,
  };
};

// ✅ consistent response (always correct)
const sanitizeUser = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  role: user.role,

  // ✅ GUARANTEED SLUG
  clinicId: user.clinicId,

  clinic: user.clinic || null,

  profileUrl: user.profileUrl || null,
  isVerified: user.isVerified,
});
/* ---------------- REGISTER ---------------- */

export const register = async (req, res) => {
  try {
    let { email, username, password, clinicId, ...optional } = req.body;

    email = email?.toLowerCase().trim();
    username = username?.trim();
    clinicId = clinicId?.toLowerCase().trim();

    const errors = {};
    if (!email) errors.email = "Email required";
    if (!username) errors.username = "Username required";
    if (!password) errors.password = "Password required";
    if (!clinicId) errors.clinicId = "Clinic required";

    if (password && password.length < 6) {
      errors.password = "Min 6 characters";
    }

    if (Object.keys(errors).length) {
      return res.status(400).json({ success: false, errors });
    }

    const clinic =
      (await Clinic.findOne({ clinicId })) ||
      (mongoose.Types.ObjectId.isValid(clinicId)
        ? await Clinic.findById(clinicId)
        : null);

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: "Invalid clinic link",
      });
    }

    const exist = await User.findOne({
      email,
      clinicId: clinic.clinicId,
    });

    if (exist) {
      return res.status(409).json({
        success: false,
        message: "User already exists for this clinic",
      });
    }

    const user = await User.create({
      email,
      username,
      password: await bcrypt.hash(password, 10),
      clinicId: clinic.clinicId, // ✅ store slug
      ...optional,
    });

    await generateAndSendOTP(email, "registration");

    const resultUser = await attachClinic(user);

    return res.status(201).json({
      success: true,
      user: sanitizeUser(resultUser),
    });
  } catch (err) {
    console.error("REGISTER:", err);
    return res.status(500).json({ success: false });
  }
};

/* ---------------- LOGIN ---------------- */

export const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await User.findOne({ email }).select("+password");

    if (!user) return res.status(404).json({ success: false });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false });

    if (!user.isVerified) {
      await generateAndSendOTP(email, "login");
      return res.status(403).json({ success: false, requiresOtp: true });
    }

    user = await attachClinic(user);

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    await User.findByIdAndUpdate(user._id, { refreshToken });

    setRefreshCookie(res, refreshToken);

    return res.json({
      success: true,
      accessToken,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error("LOGIN:", err);
    return res.status(500).json({ success: false });
  }
};

/* ---------------- GET ME ---------------- */

export const getMe = async (req, res) => {
  try {
    let user = await User.findById(req.user._id).select(
      "-password -refreshToken"
    );

    if (!user) return res.status(404).json({ success: false });

    user = await attachClinic(user);

    return res.json({
      success: true,
      user: sanitizeUser(user),
    });
  } catch {
    return res.status(500).json({ success: false });
  }
};

/* ---------------- REFRESH ---------------- */

export const refreshAccessToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ success: false });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(403).json({ success: false });
    }

    const user = await User.findById(decoded._id);

    if (!user || user.refreshToken !== token) {
      return res.status(403).json({ success: false });
    }

    const newRefreshToken = generateRefreshToken(user);
    user.refreshToken = newRefreshToken;
    await user.save();

    setRefreshCookie(res, newRefreshToken);

    return res.json({
      success: true,
      accessToken: generateAccessToken(user),
    });
  } catch {
    return res.status(403).json({ success: false });
  }
};

/* ---------------- LOGOUT ---------------- */

export const logout = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        await User.findByIdAndUpdate(decoded._id, {
          refreshToken: null,
        });
      } catch {}
    }

    clearRefreshCookie(res);

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ success: false });
  }
};

/* ---------------- GET PROFILES ---------------- */

export const getProfiles = async (req, res) => {
  try {
    let users = await User.find({
      clinicId: req.user.clinicId,
    }).select("-password -refreshToken");

    users = await Promise.all(users.map(attachClinic));

    return res.json({
      success: true,
      users: users.map(sanitizeUser),
    });
  } catch {
    return res.status(500).json({ success: false });
  }
};

/* ---------------- UPDATE PROFILE ---------------- */

export const updateProfile = async (req, res) => {
  try {
    const current = await User.findById(req.user._id);

    const updates = { ...req.body };

    if (req.file) {
      if (current.profileUrl) {
        await deleteImage(current.profileUrl);
      }

      const { url } = await uploadImage(req.file, "users", true);
      updates.profileUrl = url;
    }

    let user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true }
    ).select("-password -refreshToken");

    user = await attachClinic(user);

    return res.json({
      success: true,
      user: sanitizeUser(user),
    });
  } catch {
    return res.status(500).json({ success: false });
  }
};

/* ---------------- UPDATE PASSWORD ---------------- */

export const updatePassword = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+password");

    const match = await bcrypt.compare(
      req.body.currentPassword,
      user.password
    );

    if (!match) return res.status(401).json({ success: false });

    user.password = await bcrypt.hash(req.body.newPassword, 10);
    await user.save();

    await sendEmail(user.email, "Password updated", "Success");

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ success: false });
  }
};

/* ---------------- RESET PASSWORD ---------------- */

export const resetPassword = async (req, res) => {
  try {
    const result = await verifyOTP(
      req.body.email,
      req.body.code,
      "password_reset",
      req.ip
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    const user = result.user;
    user.password = await bcrypt.hash(req.body.newPassword, 10);
    await user.save();

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ success: false });
  }
};

/* ---------------- VERIFY OTP ---------------- */

export const verifyOtp = async (req, res) => {
  try {
    const result = await verifyOTP(
      req.body.email,
      req.body.otpCode,
      req.body.context,
      req.ip
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    if (req.body.context !== "password_reset") {
      const user = result.user;
      user.isVerified = true;
      await user.save();
    }

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ success: false });
  }
};

/* ---------------- OTP ---------------- */

export const requestCode = async (req, res) => {
  await generateAndSendOTP(req.body.email);
  res.json({ success: true });
};

export const resendOtp = requestCode;

/* ---------------- DELETE ---------------- */

export const deleteProfile = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user?.profileUrl) {
    await deleteImage(user.profileUrl);
  }

  await User.findByIdAndDelete(req.user._id);

  res.json({ success: true });
};