import mongoose from "mongoose";

const accessRequestSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: true
  },
  requestingDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  accessDuration: {
    type: Number, // in hours
    default: 24
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  respondedAt: Date
}, { timestamps: true });

export default mongoose.model("AccessRequest", accessRequestSchema);