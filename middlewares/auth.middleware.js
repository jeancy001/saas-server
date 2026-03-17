
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import "dotenv/config";

/* ======================================
   AUTHENTICATION (ACCESS TOKEN)
====================================== */
export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Check if token exists
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Access token missing.",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify access token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "access_secret");
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired access token.",
      });
    }

    // Find user by decoded._id
    const user = await User.findById(decoded._id).select("-password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found or deleted.",
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (err) {
    console.error("Protect middleware error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error during authentication.",
    });
  }
};

/* ======================================
   AUTHORIZATION (ROLE-BASED)
====================================== */
export const authorize = (...roles) => {
  return (req, res, next) => {
    // Ensure user is attached by protect
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated.",
      });
    }

    // Check user role
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: requires role(s) [${roles.join(", ")}]`,
      });
    }

    next();
  };
};
