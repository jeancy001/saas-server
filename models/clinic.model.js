import mongoose from "mongoose";
import { nanoid } from "nanoid";

const ClinicSchema = new mongoose.Schema(
{
  name: {
    type: String,
    required: true
  },

  logo: {
    type: String
  },

  clinicId: {
    type: String,
    unique: true,
    index: true
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


// Auto generate clinicId
ClinicSchema.pre("save", function () {
  if (!this.clinicId) {
    this.clinicId = nanoid(8);
  }
});

export const Clinic = mongoose.model("Clinic", ClinicSchema);
