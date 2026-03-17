import express from "express";
import {
  register,
  userLogin,
  updateProfile,
  updatePassword,
  getMe,
  logout,
  getProfiles,
  requestCode,
  resetPassword,
  deleteProfile,
  resendOtp,
  verifyOtp,
  testRoute ,
  refreshAccessToken
} from "../controllers/user.Controller.js";
import {protect,authorize} from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.js";
const router = express.Router();


router.get("/test", testRoute);
//routes Public
router.post("/register", register);
router.post("/login", userLogin);
router.post("/refresh-token", refreshAccessToken);
router.post("/verify-otp", verifyOtp); // Route pour vérifier l'OTP
router.post("/request-code", requestCode);
router.post("/reset-password", resetPassword);
router.post("/resend-otp", resendOtp); // Route pour renvoyer un OTP

// Protected routes
router.get("/me", protect, getMe);
router.get("/profile", protect, getProfiles);
router.put("/update-profile", protect, upload.single("profileImage"), updateProfile);
router.put("/update-password", protect, updatePassword);
router.post("/logout", protect, logout);
router.delete("/delete", protect, deleteProfile);
router.get("/profiles", protect, getProfiles);

export {router as userRoutes};