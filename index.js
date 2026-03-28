import express from "express";
import "dotenv/config";
import cors from "cors";

import { clinicRouter } from "./routes/clinic.route.js";
import { connectDB } from "./config/db.js";
import { appointementRoutes } from "./routes/appointement.route.js";
import { userRoutes } from "./routes/user.route.js";
import { doctorRouter } from "./routes/doctor.route.js";

const app = express();
const PORT = process.env.PORT || 5000;

/* ----------------------------- */
/* MIDDLEWARE */
/* ----------------------------- */

// ✅ Safer CORS (you can restrict in production)
app.use(
  cors({
    origin: "*", // 🔥 change to your frontend URL in production
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* ----------------------------- */
/* ROUTES */
/* ----------------------------- */

// ✅ Root route (TEST SERVER)
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "🚀 API is running successfully",
  });
});

// ✅ Health check (TEST DB)
app.get("/health", async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "✅ Server is healthy",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "❌ Server unhealthy",
    });
  }
});

// ✅ API routes
app.use("/api/v1/clinic", clinicRouter);
app.use("/api/v1/clinic/appointment", appointementRoutes);
app.use("/api/v1/clinic/doctor", doctorRouter);
app.use("/api/v1/auth",userRoutes);

/* ----------------------------- */
/* ERROR HANDLER */
/* ----------------------------- */

app.use((err, req, res, next) => {
  console.error("❌ Global Error:", err);

  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

/* ----------------------------- */
/* START SERVER (FIXED) */
/* ----------------------------- */

const startServer = async () => {
  try {
    await connectDB(); // ✅ CONNECT FIRST

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();