// backend/models/superAdmin.js
const mongoose = require("mongoose");

const SuperAdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true }, // hashed
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.SuperAdmin || mongoose.model("SuperAdmin", SuperAdminSchema);