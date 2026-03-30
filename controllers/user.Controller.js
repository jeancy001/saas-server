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

import { supabase } from "../utils/supabase.js";

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

const populateClinic = (query) =>
  query.populate("clinicId", "name clinicId logo");

const sanitizeUser = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  role: user.role,
  clinicId: user.clinicId?._id || null,
  clinic: user.clinicId || null,
  profileUrl: user.profileUrl || null,
  isVerified: user.isVerified,
});

/* ---------------- REGISTER ---------------- */

export const register = async (req, res) => {
  try {
    const { email, password, clinicId } = req.body;

    if (!email || !password || !clinicId) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }

    const query = [];

    if (mongoose.Types.ObjectId.isValid(clinicId)) {
      query.push({ _id: clinicId });
    }

    query.push({ clinicId: clinicId.toLowerCase() });

    const clinic = await Clinic.findOne({ $or: query });

    if (!clinic) {
      return res.status(404).json({ success: false, message: "Clinic not found" });
    }

    const exist = await User.findOne({ email });
    if (exist) {
      return res.status(409).json({ success: false, message: "Email exists" });
    }

    const user = await User.create({
      ...req.body,
      password: await bcrypt.hash(password, 10),
      clinicId: clinic._id,
    });

    await generateAndSendOTP(email, "registration");

    const populated = await populateClinic(
      User.findById(user._id)
    );

    return res.status(201).json({
      success: true,
      user: sanitizeUser(populated),
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

    const user = await populateClinic(
      User.findOne({ email }).select("+password")
    );

    if (!user) {
      return res.status(404).json({ success: false });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ success: false });
    }

    if (!user.isVerified) {
      await generateAndSendOTP(email, "login");
      return res.status(403).json({ success: false, requiresOtp: true });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    setRefreshCookie(res, refreshToken);

    return res.status(200).json({
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
    const user = await populateClinic(
      User.findById(req.user._id).select("-password -refreshToken")
    );

    if (!user) {
      return res.status(404).json({ success: false });
    }

    return res.status(200).json({
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

    if (!token) {
      return res.status(401).json({ success: false });
    }

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

    return res.status(200).json({
      success: true,
      accessToken: generateAccessToken(user),
    });
  } catch (err) {
    console.error("REFRESH:", err);
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
        await User.findByIdAndUpdate(decoded._id, { refreshToken: null });
      } catch {}
    }

    clearRefreshCookie(res);

    return res.status(200).json({ success: true });
  } catch {
    return res.status(500).json({ success: false });
  }
};

/* ---------------- GET PROFILES ---------------- */

export const getProfiles = async (req, res) => {
  try {
    const users = await populateClinic(
      User.find({ clinicId: req.user.clinicId }).select("-password -refreshToken")
    );

    return res.status(200).json({
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
    const updates = { ...req.body };

    if (req.file) {
      const path = `users/${Date.now()}_${req.file.originalname}`;

      const { data, error } = await supabase.storage
        .from("profile-images")
        .upload(path, req.file.buffer, { upsert: true });

      if (error) {
        return res.status(500).json({ success: false });
      }

      updates.profileUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/profile-images/${data.path}`;
    }

    const user = await populateClinic(
      User.findByIdAndUpdate(req.user._id, updates, {
        new: true,
      }).select("-password -refreshToken")
    );

    return res.status(200).json({
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

    const isMatch = await bcrypt.compare(
      req.body.currentPassword,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({ success: false });
    }

    user.password = await bcrypt.hash(req.body.newPassword, 10);
    await user.save();

    await sendEmail(user.email, "Password updated", "Changed successfully");

    return res.status(200).json({ success: true });
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

    return res.status(200).json({ success: true });
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

    return res.status(200).json({ success: true });
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
  await User.findByIdAndDelete(req.user._id);
  res.json({ success: true });
};