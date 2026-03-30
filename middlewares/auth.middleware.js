import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

/**
 * ---------------- GET TOKEN ----------------
 */
const getTokenFromRequest = (req) => {
  // Authorization header
  if (req.headers.authorization?.startsWith("Bearer ")) {
    return req.headers.authorization.split(" ")[1];
  }

  // Cookie fallback
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }

  return null;
};

/**
 * ---------------- VERIFY ACCESS TOKEN ----------------
 */
const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Ensure correct token type
    if (decoded.type !== "access") {
      throw new Error("INVALID_TOKEN_TYPE");
    }

    return { valid: true, decoded };
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return { valid: false, error: "expired" };
    }
    return { valid: false, error: "invalid" };
  }
};

/**
 * ---------------- PROTECT ----------------
 */
export const protect = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token manquant.",
      });
    }

    const { valid, decoded, error } = verifyAccessToken(token);

    if (!valid) {
      return res.status(401).json({
        success: false,
        message: error === "expired" ? "Token expiré." : "Token invalide.",
      });
    }

    const user = await User.findById(decoded._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Utilisateur introuvable.",
      });
    }

    if (!user.active) {
      return res.status(403).json({
        success: false,
        message: "Compte désactivé.",
      });
    }

    // Attach user + auth meta
    req.user = user;
    req.auth = {
      userId: decoded._id,
      role: decoded.role,
    };

    next();
  } catch (error) {
    console.error("AUTH ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Erreur serveur auth.",
    });
  }
};

/**
 * ---------------- OPTIONAL AUTH ----------------
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      req.user = null;
      return next();
    }

    const { valid, decoded } = verifyAccessToken(token);

    if (!valid) {
      req.user = null;
      return next();
    }

    const user = await User.findById(decoded._id).select(
      "-password -refreshToken"
    );

    req.user = user && user.active ? user : null;

    next();
  } catch {
    req.user = null;
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
      console.error("CLINIC CHECK ERROR:", error);

      res.status(500).json({
        success: false,
        message: "Erreur serveur.",
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