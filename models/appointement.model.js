const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
{
  clinicId: {
    type: String,
    required: true
  },

  motifVisite: {
    type: String,
    required: true
  },

  examens: {
    type: String
  },

  patient: {
    prenom: {
      type: String,
      required: true
    },

    nom: {
      type: String,
      required: true
    },

    postNom: {
      type: String,
      required: true
    },

    sexe: {
      type: String,
      enum: ["M", "F"],
      required: true
    },

    telephone: {
      type: String,
      required: true
    },

    dateNaissance: {
      type: Date,
      required: true
    },

    etatCivil: {
      type: String,
      enum: ["Marié(e)", "Célibataire", "Veuf(ve)", "Divorcé(e)"],
      required: true
    },

    occupation: {
      type: String,
      required: true
    },

    adresse: {
      type: String,
      required: true
    },

    email: {
      type: String,
      required: true
    }
  },

  contactUrgence: {
    relation: {
      type: String,
      enum: ["parent", "Epoux(se)", "Other"],
      required: true
    },

    nom: {
      type: String,
      required: true
    },

    telephone: {
      type: String,
      required: true
    }
  },

  dateRendezVous: {
    type: Date,
    default: Date.now
  },

  statut: {
    type: String,
    enum: ["pending", "confirmed", "cancelled", "completed"],
    default: "pending"
  }

},
{
  timestamps: true
}
);

module.exports = mongoose.model("Appointment", appointmentSchema);