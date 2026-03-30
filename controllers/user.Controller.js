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

/* ---------------- HELPERS ---------------- */

const setRefreshCookie = (res, token) => {
  res.cookie("refreshToken", token, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie("refreshToken", cookieOptions);
};

/* ---------------- POPULATE HELPER ---------------- */

const populateClinic = (query) =>
  query.populate({
    path: "clinicId",
    select: "name clinicId logo",
  });

/* ---------------- SAFE USER SHAPE ---------------- */

const sanitizeUser = (user) => {
  const clinic = user.clinicId;

  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,

    clinicId: clinic?._id || user.clinicId || null,

    clinic: clinic
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

/* ---------------- REGISTER ---------------- */

export const register = async (req, res) => {
  try {
    const { email, password, clinicId } = req.body;

    if (!email || !password || !clinicId) {
      return res.status(400).json({ success: false });
    }

    const clinic = await Clinic.findOne({
      $or: [
        {
          _id: mongoose.Types.ObjectId.isValid(clinicId)
            ? clinicId
            : null,
        },
        { clinicId: clinicId.toLowerCase() },
      ],
    });

    if (!clinic) {
      return res.status(404).json({ success: false });
    }

    const exist = await User.findOne({ email });
    if (exist) {
      return res.status(409).json({ success: false });
    }

    const user = await User.create({
      ...req.body,
      password: await bcrypt.hash(password, 10),
      clinicId: clinic._id,
    });

    await generateAndSendOTP(email, "registration");

    const populated = await populateClinic(user.populate("clinicId"));

    return res.status(201).json({
      success: true,
      user: sanitizeUser(populated),
    });
  } catch {
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

    if (!user) return res.status(404).json({ success: false });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false });

    if (!user.isVerified) {
      await generateAndSendOTP(email, "login");
      return res.status(403).json({
        success: false,
        requiresOtp: true,
      });
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
  } catch {
    return res.status(500).json({ success: false });
  }
};

/* ---------------- GET ME ---------------- */

export const getMe = async (req, res) => {
  try {
    const user = await populateClinic(
      User.findById(req.user._id).select(
        "-password -refreshToken"
      )
    );

    if (!user) return res.status(404).json({ success: false });

    return res.status(200).json({
      success: true,
      user: sanitizeUser(user),
    });
  } catch {
    return res.status(500).json({ success: false });
  }
};

/* ---------------- REFRESH TOKEN ---------------- */

export const refreshAccessToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ success: false });

    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET
    );

    const user = await User.findById(decoded._id);

    if (!user || user.refreshToken !== token) {
      return res.status(403).json({ success: false });
    }

    const newRefreshToken = generateRefreshToken(user);
    user.refreshToken = newRefreshToken;
    await user.save();

    setRefreshCookie(res, newRefreshToken);

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
        const decoded = jwt.verify(
          token,
          process.env.JWT_REFRESH_SECRET
        );

        await User.findByIdAndUpdate(decoded._id, {
          refreshToken: null,
        });
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
    if (!req.user?.clinicId) {
      return res.status(403).json({
        success: false,
        message: "Clinic context missing.",
      });
    }

    const users = await populateClinic(
      User.find({ clinicId: req.user.clinicId }).select(
        "-password -refreshToken"
      )
    );

    return res.status(200).json({
      success: true,
      count: users.length,
      users: users.map(sanitizeUser),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ---------------- UPDATE PROFILE ---------------- */

export const updateProfile = async (req, res) => {
  try {
    const allowed = [
      "username",
      "tel",
      "country",
      "city",
      "gender",
    ];

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
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ---------------- UPDATE PASSWORD ---------------- */

export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select(
      "+password"
    );

    const isMatch = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid password.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await sendEmail(
      user.email,
      "Password updated",
      "Your password was changed."
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ---------------- RESET PASSWORD ---------------- */

export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    const result = await verifyOTP(
      email,
      code,
      "password_reset",
      req.ip
    );

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
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ---------------- VERIFY OTP ---------------- */

export const verifyOtp = async (req, res) => {
  try {
    const { email, otpCode, context } = req.body;

    const result = await verifyOTP(
      email,
      otpCode,
      context,
      req.ip
    );

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
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ---------------- REQUEST CODE ---------------- */

export const requestCode = async (req, res) => {
  try {
    await generateAndSendOTP(
      req.body.email,
      req.body.context || "general"
    );

    return res.status(200).json({
      success: true,
      message: "Code sent.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* ---------------- RESEND OTP ---------------- */

export const resendOtp = async (req, res) => {
  try {
    await generateAndSendOTP(
      req.body.email,
      req.body.context || "general"
    );

    return res.status(200).json({
      success: true,
      message: "OTP resent.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
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
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};