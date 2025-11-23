import mongoose from "mongoose";

const patientSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  personalInfo: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ["male", "female", "other", "Male", "Female", "Other"] },
    bloodType: { type: String },
    emergencyContact: {
       name: { type: String, default: "" },
        phone: { type: String, default: "" },
        relationship: { type: String, default: "" }
    }
  },
  medicalInfo: {
    allergies: [String],
    chronicConditions: [String],
    medications: [String],
    insuranceProvider: String,
    insuranceNumber: String
  },
  assignedDoctors: [{
    doctorId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    },
    department: String,
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    assignedAt: {
      type: Date,
      default: Date.now
    }
  }],
  department: {
    type: String,
    required: true
  },
  temporaryAccess: [{
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    expiresAt: {
      type: Date,
      required: true
    },
    accessRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccessRequest"
    },
    grantedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { 
  timestamps: true 
});

export default mongoose.model("Patient", patientSchema);