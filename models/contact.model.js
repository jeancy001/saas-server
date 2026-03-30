// models/contact.model.js
import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    message: {
      type: String,
      required: true,
      minlength: 5,
      maxlength: 2000,
    },

    status: {
      type: String,
      enum: ["new", "read", "replied"],
      default: "new",
      index: true,
    },

    source: {
      type: String,
      default: "website",
    },

    ip: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

contactSchema.index({ email: 1, createdAt: -1 });

export const Contact = mongoose.model("Contact", contactSchema);