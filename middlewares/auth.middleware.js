import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

/**
 * =========================
 * 🔐 STRICT AUTH (PROTECTED ROUTES)
 * =========================
 */
export const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No access token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await User.findById(decoded._id)
      .select("-password -refreshToken")
      .populate("clinicId", "name clinicId logo");

    if (!user || !user.active) {
      return res.status(401).json({
        success: false,
        message: "User not found or inactive",
      });
    }

    const clinic =
      typeof user.clinicId === "object" ? user.clinicId : null;

    req.user = {
      _id: user._id,
      email: user.email,
      role: user.role,

      clinicId:
        clinic?.clinicId ||
        user.clinicId?.toString?.() ||
        user.clinicId,

      clinic: clinic || null,
    };

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }
};

/**
 * =========================
 * 🔓 OPTIONAL AUTH (PUBLIC ROUTES LIKE APPOINTMENTS)
 * =========================
 * - DOES NOT BLOCK REQUEST
 * - Allows guests
 */
export const optionalProtect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // 👉 NO TOKEN = GUEST MODE (NO ERROR)
    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await User.findById(decoded._id)
      .select("-password -refreshToken")
      .populate("clinicId", "name clinicId logo");

    if (!user || !user.active) {
      req.user = null;
      return next(); // ⚠️ fallback instead of blocking
    }

    const clinic =
      typeof user.clinicId === "object" ? user.clinicId : null;

    req.user = {
      _id: user._id,
      email: user.email,
      role: user.role,

      clinicId:
        clinic?.clinicId ||
        user.clinicId?.toString?.() ||
        user.clinicId,

      clinic: clinic || null,
    };

    next();
  } catch (err) {
    // 🚀 NEVER BLOCK REQUEST IN OPTIONAL MODE
    req.user = null;
    next();
  }
};

/**
 * =========================
 * 🛡️ ADMIN ONLY
 * =========================
 */
export const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access only",
    });
  }
  next();
};