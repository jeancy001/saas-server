import mongoose from "mongoose";
import { nanoid } from "nanoid";

const ClinicSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true,
    trim: true
  },

  logo: {
    type: String,
    default: ""
  },

  clinicId: {
    type: String,
    unique: true,
    index: true,
    lowercase: true
  },

  blogContent: {
    navBarcontent: [{ type: String }],
    imageUrl: [{ type: String }],
    bodyContent: [{ type: String }],
    footerContent: [{ type: String }]
  }

},
{ timestamps: true }
);


// Auto generate clinicId (no next)
ClinicSchema.pre("save", async function () {
  if (!this.clinicId) {
    this.clinicId = nanoid(8).toLowerCase();
  }
});

export const Clinic = mongoose.model("Clinic", ClinicSchema);