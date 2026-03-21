import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { generateAccessToken, generateRefreshToken } from "../services/token.js";
import { sendEmail } from "../utils/mailer.js";
import { supabase } from "../utils/supabase.js";
import { generateAndSendOTP, verifyOTP } from "../utils/otpUtils.js";
import { uploadToSupabase } from "../config/storeSupabase.js";
/**
 * ---------------- TEST ROUTE ----------------
 */
export const testRoute = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "API fonctionne correctement!",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ---------------- REGISTER ----------------
 */
export const register = async (req, res) => {
  try {
    const { username, email, password,  gender, tel } = req.body;

    if (!email || !password) return res.status(400).json({ success: false, message: "Email et mot de passe requis." });

    const existUser = await User.findOne({ email });
    if (existUser) return res.status(409).json({ success: false, message: "Utilisateur existe déjà." });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username: username || "",
      email,
      password: hashedPassword,
      country: country || "",
      city: city || "",
      gender: gender || "",
      tel: tel || "",
    });

    await newUser.save();

    // Send OTP for verification
    await generateAndSendOTP(email, "registration");

    res.status(201).json({
      success: true,
      message: "Utilisateur enregistré avec succès. Vérifiez votre email.",
      user: { id: newUser._id, username: newUser.username, email: newUser.email },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ---------------- LOGIN ----------------
 */
export const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email et mot de passe requis." });

    let user;
    try {
      user = await User.findOne({ email }).select("+password");
    } catch (dbErr) {
      console.error("DB error:", dbErr);
      return res.status(500).json({ success: false, message: "Erreur base de données." });
    }

    if (!user) return res.status(404).json({ success: false, message: "Utilisateur non trouvé." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Mot de passe incorrect." });

    if (!user.isVerified) {
      try {
        await generateAndSendOTP(email, "login");
      } catch (otpErr) {
        console.error("OTP error:", otpErr);
      }
      return res.status(403).json({ success: false, message: "Compte non vérifié. OTP envoyé." });
    }

    let accessToken, refreshToken;
    try {
      accessToken = generateAccessToken(user);
      refreshToken = generateRefreshToken(user);
    } catch (jwtErr) {
      console.error("JWT error:", jwtErr);
      return res.status(500).json({ success: false, message: "Erreur génération token." });
    }

    try {
      await User.findByIdAndUpdate(user._id, { refreshToken });
    } catch (updateErr) {
      console.error("Update token error:", updateErr);
    }

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "Connexion réussie.",
      accessToken,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (error) {
    console.error("Unexpected login error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ---------------- LOGOUT ----------------
 */
export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      try {
        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || "refresh_secret");

        // Remove refresh token from DB
        await User.findByIdAndUpdate(decoded._id, { refreshToken: null });
      } catch (err) {
        // Token invalid or expired, ignore database update
        console.warn("Invalid refresh token during logout:", err.message);
      }
    }

    // Clear the refresh token cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/", // make sure path matches where cookie was set
    });

    return res.status(200).json({ success: true, message: "Logout successful." });
  } catch (error) {
    console.error("Logout error:", error.message);
    return res.status(500).json({ success: false, message: "Server error during logout." });
  }
};

/**
 * ---------------- GET ME ----------------
 */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "Utilisateur non trouvé." });

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ---------------- UPDATE PROFILE ----------------
 */
export const updateProfile = async (req, res) => {
  try {
    const updates = req.body;
    const profileImage = req.file;

    if (profileImage) {
      const { data, error } = await supabase.storage
        .from("profile-images")
        .upload(`users/${Date.now()}_${profileImage.originalname}`, profileImage.buffer, {
          cacheControl: "3600",
          upsert: true,
          contentType: profileImage.mimetype,
        });

      if (error) return res.status(500).json({ success: false, message: "Supabase upload failed", error });

      updates.profileUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/profile-images/${data.path}`;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select("-password");
    res.status(200).json({ success: true, message: "Profil mis à jour.", user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ---------------- UPDATE PASSWORD ----------------
 */
export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ success: false, message: "Utilisateur non trouvé." });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Mot de passe actuel incorrect." });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await sendEmail(user.email, "Mot de passe modifié", `<p>Bonjour ${user.username || ""},</p><p>Votre mot de passe a été modifié.</p>`);

    res.status(200).json({ success: true, message: "Mot de passe changé avec succès." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ---------------- REQUEST RESET CODE ----------------
 */
export const requestCode = async (req, res) => {
  try {
    const { email } = req.body;
    const ip = req.ip || req.connection.remoteAddress || "unknown";

    const result = await generateAndSendOTP(email, "password_reset", ip);
    if (!result.success) return res.status(404).json({ success: false, message: result.message });

    res.status(200).json({ success: true, message: "Code envoyé à l'email.", expiresAt: result.otpExpiry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ---------------- RESET PASSWORD ----------------
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const ip = req.ip || req.connection.remoteAddress || "unknown";

    if (!email || !code || !newPassword) return res.status(400).json({ success: false, message: "Email, code et nouveau mot de passe requis." });

    const otpResult = await verifyOTP(email, code, "password_reset", ip);
    if (!otpResult.success) return res.status(400).json({ success: false, message: otpResult.message });

    const user = otpResult.user;
    user.password = await bcrypt.hash(newPassword, 10);

    // Reset OTP fields
    user.otpCode = undefined;
    user.otpExpiry = undefined;
    user.otpAttempts = 0;
    user.otpLockUntil = undefined;

    await user.save();

    await sendEmail(user.email, "Mot de passe modifié", `<p>Bonjour ${user.username || ""},</p><p>Votre mot de passe a été modifié.</p>`);

    res.status(200).json({ success: true, message: "Mot de passe réinitialisé avec succès." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ---------------- VERIFY OTP ----------------
 */
export const verifyOtp = async (req, res) => {
  try {
    const { email, otpCode, context = "verification" } = req.body;
    const ip = req.ip || req.connection.remoteAddress || "unknown";

    if (!email || !otpCode) return res.status(400).json({ success: false, message: "Email et code OTP requis." });

    const result = await verifyOTP(email, otpCode, context, ip);
    if (!result.success) return res.status(400).json({ success: false, message: result.message });

    const user = result.user;

    if (context !== "password_reset") {
      user.isVerified = true;
      user.otpCode = undefined;
      user.otpExpiry = undefined;
      user.otpAttempts = 0;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: context === "password_reset" ? "Code vérifié." : "Compte vérifié.",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ---------------- RESEND OTP ----------------
 */
export const resendOtp = async (req, res) => {
  try {
    const { email, context = "verification" } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email requis." });

    const result = await generateAndSendOTP(email, context, req.ip);
    if (!result.success) return res.status(404).json({ success: false, message: result.message });

    res.status(200).json({ success: true, message: "OTP renvoyé.", expiresAt: result.otpExpiry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ---------------- REFRESH TOKEN ----------------
 */
export const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json({ success: false, message: "Token manquant." });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded._id);
    if (!user || user.refreshToken !== refreshToken) return res.status(403).json({ success: false, message: "Token invalide." });

    const accessToken = generateAccessToken(user);
    res.status(200).json({ success: true, accessToken });
  } catch (error) {
    res.status(403).json({ success: false, message: "Token expiré ou invalide." });
  }
};

/**
 * ---------------- GET ALL USERS ----------------
 */
export const getProfiles = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ---------------- DELETE USER ----------------
 */
export const deleteProfile = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Profil supprimé." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};