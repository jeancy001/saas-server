import express from "express";
import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
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
import { paymentRoute } from "./routes/payment.route.js";

const app = express();
const PORT = process.env.PORT || 5000;

/* ---------------- HTTP SERVER ---------------- */
const server = http.createServer(app);

/* ---------------- SOCKET.IO ---------------- */
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL,
      "http://localhost:3000",
    ],
    credentials: true,
  },
});

/* ---------------- SECURITY ---------------- */
app.use(helmet());
app.use(morgan("dev"));

/* ---------------- CORS ---------------- */
app.use(cors({ origin: true, credentials: true }));
app.options(/.*/, cors());

/* ---------------- BODY ---------------- */
app.use(express.json());
app.use(cookieParser());

/* ---------------- ROUTES ---------------- */
app.use("/api/v1/auth", userRoutes);
app.use("/api/v1/clinic", clinicRouter);
app.use("/api/v1/clinic/appointment", appointmentRoutes);
app.use("/api/v1/clinic/doctor", doctorRouter);
app.use("/api/v1/clinic/contact", contactRoute);
app.use("/api/v1/clinic/payments", paymentRoute);

/* ---------------- SOCKET ROOM SYSTEM ---------------- */
const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join-room", ({ roomId }) => {
    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = [];

    rooms[roomId].push(socket.id);

    socket.to(roomId).emit("user-joined", socket.id);
    socket.emit("all-users", rooms[roomId]);
  });

  socket.on("offer", (payload) => {
    io.to(payload.target).emit("offer", {
      sdp: payload.sdp,
      caller: socket.id,
    });
  });

  socket.on("answer", (payload) => {
    io.to(payload.target).emit("answer", {
      sdp: payload.sdp,
      caller: socket.id,
    });
  });

  socket.on("ice-candidate", (payload) => {
    io.to(payload.target).emit("ice-candidate", {
      candidate: payload.candidate,
      caller: socket.id,
    });
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter((id) => id !== socket.id);
    }
  });
});

/* ---------------- START SERVER ---------------- */
const startServer = async () => {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

startServer();