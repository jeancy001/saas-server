import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

/**
 * ---------------- ACCESS TOKEN ----------------
 * Short-lived (frontend usage)
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      role: user.role,
      email: user.email,
      type: "access",
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: "15m", // ✅ short-lived
    }
  );
};

/**
 * ---------------- REFRESH TOKEN ----------------
 * Long-lived (used to refresh access token)
 */
const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      type: "refresh",
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

export { generateAccessToken, generateRefreshToken };