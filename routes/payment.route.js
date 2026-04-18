// routes/payment.routes.js
import express from "express";
import { initiatePayment } from "../controllers/payment.controller.js";

const router = express.Router();

router.post("/initiate", initiatePayment);

export {router as paymentRoute};