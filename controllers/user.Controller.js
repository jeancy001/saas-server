import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import { User } from "../models/user.model.js";
import { Clinic } from "../models/clinic.model.js";

import { generateAccessToken, generateRefreshToken } from "../services/token.js";
import { sendEmail } from "../utils/mailer.js";
import { generateAndSendOTP, verifyOTP } from "../utils/otpUtils.js";
import { supabase } from "../utils/supabase.js";

/* ---------------- SAFE SHAPES ---------------- */

const sanitizeClinic = (clinic) => {
  if (!clinic) return null;

  const isPopulated =
    typeof clinic === "object" && clinic._id;

  return {
    _id: isPopulated ? clinic._id : clinic,
    name: clinic?.name || null,
    clinicId: clinic?.clinicId || null,
    logo: clinic?.logo || null,
  };
};

const sanitizeUser = (user) => {
  const clinic = user.clinicId;

  const isPopulated =
    clinic && typeof clinic === "object" && clinic._id;

  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,

    // unified safe exposure
    clinicId: isPopulated ? clinic._id : clinic || null,

    clinic: isPopulated
      ? {
          _id: clinic._id,
          name: clinic.name,
          clinicId: clinic.clinicId,
          logo: clinic.logo || null,
        }
      : null,

    profileUrl: user.profileUrl || null,
    isVerified: user.isVerified,
  };
};

/* ---------------- HELPERS ---------------- */

const resolveClinic = async (clinicId) => {
  if (!clinicId) return null;

  const query = mongoose.Types.ObjectId.isValid(clinicId)
    ? { _id: clinicId }
    : { clinicId: clinicId.toLowerCase() };

  return Clinic.findOne(query);
};

/* ---------------- TEST ---------------- */

export const testRoute = async (req, res) => {
  res.status(200).json({ success: true });
};

/* ---------------- REGISTER ---------------- */

export const register = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      gender,
      tel,
      country,
      city,
      clinicId,
    } = req.body;

    if (!email || !password || !clinicId) {
      return res.status(400).json({
        success: false,
        message: "Email, password and clinic required.",
      });
    }

    const clinic = await resolveClinic(clinicId);

    if (!clinic) {
      return res.status(404).json({
        success: false,
        message: "Clinic not found.",
      });
    }

    const existUser = await User.findOne({ email });

    if (existUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      gender,
      tel,
      country,
      city,
      clinicId: clinic._id,
    });

    await generateAndSendOTP(email, "registration");

    const populated = await newUser.populate("clinicId");

    return res.status(201).json({
      success: true,
      message: "User created. Verify email.",
      user: sanitizeUser(populated),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ---------------- LOGIN ---------------- */

export const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required.",
      });
    }

    const user = await User.findOne({ email })
      .select("+password")
      .populate("clinicId");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid password.",
      });
    }

    // DO NOT BLOCK LOGIN IF CLINIC IS MISSING
    if (!user.clinicId) {
      console.warn("User missing clinicId:", user.email);
    }

    if (!user.isVerified) {
      await generateAndSendOTP(email, "login");

      return res.status(403).json({
        success: false,
        message: "Account not verified. OTP sent.",
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      accessToken,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ---------------- GET ME ---------------- */

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password -refreshToken")
      .populate("clinicId");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ---------------- GET PROFILES ---------------- */

export const getProfiles = async (req, res) => {
  try {
    if (!req.user?.clinicId) {
      return res.status(403).json({
        success: false,
        message: "Clinic context missing.",
      });
    }

    const users = await User.find({ clinicId: req.user.clinicId })
      .select("-password -refreshToken")
      .populate("clinicId");

    return res.status(200).json({
      success: true,
      count: users.length,
      users: users.map(sanitizeUser),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ---------------- UPDATE PROFILE ---------------- */

export const updateProfile = async (req, res) => {
  try {
    const allowed = ["username", "tel", "country", "city", "gender"];
    const updates = {};

    allowed.forEach((f) => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    if (req.file) {
      const filePath = `users/${Date.now()}_${req.file.originalname}`;

      const { data, error } = await supabase.storage
        .from("profile-images")
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });

      if (error) {
        return res.status(500).json({
          success: false,
          message: "Upload failed",
        });
      }

      updates.profileUrl =
        `${process.env.SUPABASE_URL}/storage/v1/object/public/profile-images/${data.path}`;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
    })
      .select("-password -refreshToken")
      .populate("clinicId");

    return res.status(200).json({
      success: true,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ---------------- UPDATE PASSWORD ---------------- */

export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select("+password");

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid password.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await sendEmail(user.email, "Password updated", "Your password was changed.");

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ---------------- RESET PASSWORD ---------------- */

export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    const result = await verifyOTP(email, code, "password_reset", req.ip);

    if (!result.success) {
      return res.status(400).json(result);
    }

    const user = result.user;

    user.password = await bcrypt.hash(newPassword, 10);
    user.otpCode = undefined;
    user.otpExpiry = undefined;
    user.otpAttempts = 0;

    await user.save();

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ---------------- VERIFY OTP ---------------- */

export const verifyOtp = async (req, res) => {
  try {
    const { email, otpCode, context } = req.body;

    const result = await verifyOTP(email, otpCode, context, req.ip);

    if (!result.success) {
      return res.status(400).json(result);
    }

    const user = result.user;

    if (context !== "password_reset") {
      user.isVerified = true;
      user.otpCode = undefined;
      user.otpExpiry = undefined;
      user.otpAttempts = 0;
      await user.save();
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ---------------- REQUEST CODE ---------------- */

export const requestCode = async (req, res) => {
  try {
    const { email, context } = req.body;

    await generateAndSendOTP(email, context || "general");

    return res.status(200).json({
      success: true,
      message: "Code sent.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ---------------- RESEND OTP ---------------- */

export const resendOtp = async (req, res) => {
  try {
    const { email, context } = req.body;

    await generateAndSendOTP(email, context || "general");

    return res.status(200).json({
      success: true,
      message: "OTP resent.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ---------------- REFRESH TOKEN ---------------- */

export const refreshAccessToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ success: false });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    const user = await User.findById(decoded._id);

    if (!user || user.refreshToken !== token) {
      return res.status(403).json({ success: false });
    }

    const accessToken = generateAccessToken(user);

    return res.status(200).json({
      success: true,
      accessToken,
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

    res.clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/* ---------------- DELETE PROFILE ---------------- */

export const deleteProfile = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile deleted.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

