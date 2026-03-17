
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  clinicId: { type: String, required: true },

  role: { type: String, enum: ["admin", "staff","patient","doctor","medencine"], default: "staff" },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model("User", UserSchema);