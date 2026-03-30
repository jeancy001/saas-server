import express from "express";
import "dotenv/config";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";

import { clinicRouter } from "./routes/clinic.route.js";
import { connectDB } from "./config/db.js";

import { userRoutes } from "./routes/user.route.js";
import { doctorRouter } from "./routes/doctor.route.js";
import { appointmentRoutes } from "./routes/appointement.route.js";
import { contactRoute } from "./routes/contact.route.js";
const app = express();
const PORT = process.env.PORT || 5000;

/* ----------------------------- */
/* TRUST PROXY */
/* ----------------------------- */
app.set("trust proxy", 1);

/* ----------------------------- */
/* SECURITY */
/* ----------------------------- */
app.use(helmet());
app.use(morgan("dev"));

/* ----------------------------- */
/* CORS */
/* ----------------------------- */

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:3000",
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // allow Postman / mobile apps / server calls
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn("Blocked CORS:", origin);

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};

app.use(cors(corsOptions));

/* ✅ FIX FOR EXPRESS 5 */
app.options(/.*/, cors(corsOptions));

/* ----------------------------- */
/* BODY + COOKIES */
/* ----------------------------- */

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ----------------------------- */
/* ROUTES */
/* ----------------------------- */

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API running",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "OK",
  });
});

/* API */
app.use("/api/v1/auth", userRoutes);
app.use("/api/v1/clinic", clinicRouter);
app.use("/api/v1/clinic/appointment", appointmentRoutes);
app.use("/api/v1/clinic/doctor", doctorRouter);
app.use("/api/v1/clinic/contact", contactRoute);

/* ----------------------------- */
/* 404 */
/* ----------------------------- */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/* ----------------------------- */
/* GLOBAL ERROR HANDLER */
/* ----------------------------- */
app.use((err, req, res, next) => {
  console.error("Global Error:", err.message);

  // Handle CORS errors cleanly
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "CORS error: origin not allowed",
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message,
  });
});

/* ----------------------------- */
/* SERVER START */
/* ----------------------------- */

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Startup failed:", error);
    process.exit(1);
  }
};

startServer();