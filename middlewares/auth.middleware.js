import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

/**
 * ---------------- GET TOKEN ----------------
 */
const getTokenFromHeader = (req) => {
  if (req.headers.authorization?.startsWith("Bearer")) {
    return req.headers.authorization.split(" ")[1];
  }
  return null;
};

/**
 * ---------------- VERIFY ACCESS TOKEN (STRICT) ----------------
 */
export const protect = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Non autorisé.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await User.findById(decoded._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur invalide.",
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: "Compte désactivé.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Token invalide.",
    });
  }
};

/**
 * ---------------- OPTIONAL AUTH (FIXED) ----------------
 * Works for guest + logged users
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const token = getTokenFromHeader(req);

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await User.findById(decoded._id).select(
      "-password -refreshToken"
    );

    // ✅ If user exists → attach full user
    if (user && user.active) {
      req.user = user;
    } else {
      req.user = null;
    }

    next();
  } catch (err) {
    req.user = null; // ✅ never break guest flow
    next();
  }
};

/**
 * ---------------- ROLE CHECK ----------------
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Non autorisé.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Accès refusé pour le rôle: ${req.user.role}`,
      });
    }

    next();
  };
};

/**
 * ---------------- ROLES ----------------
 */
export const isAdmin = authorize("admin");
export const isDoctor = authorize("doctor");
export const isStaff = authorize("staff", "admin");
export const isPatient = authorize("patient");

/**
 * ---------------- CLINIC ISOLATION ----------------
 */
export const sameClinic = (model, field = "clinicId") => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Non autorisé.",
        });
      }

      const resource = await model.findById(req.params.id);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: "Ressource introuvable.",
        });
      }

      if (
        resource[field]?.toString() !==
        req.user.clinicId?.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Accès interdit (clinique différente).",
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };
};

/**
 * ---------------- OWNER OR ADMIN ----------------
 */
export const isOwnerOrAdmin = (field = "userId") => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Non autorisé.",
      });
    }

    if (
      req.user.role === "admin" ||
      req.resource?.[field]?.toString() === req.user._id.toString()
    ) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Accès refusé (propriétaire uniquement).",
    });
  };
};

/**
 * ---------------- DOCTOR OR ADMIN ----------------
 */
export const isDoctorOrAdmin = () => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Non autorisé.",
      });
    }

    if (["doctor", "admin"].includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Accès réservé au médecin ou admin.",
    });
  };
};

/**
 * ---------------- STAFF OR ADMIN ----------------
 */
export const isStaffOrAdmin = () => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Non autorisé.",
      });
    }

    if (["staff", "admin"].includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: "Accès réservé au staff.",
    });
  };
};