import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String
  },
  headDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  doctors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],
  patientCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true 
});

// Check if model already exists before creating it
export default mongoose.models.Department || mongoose.model("Department", departmentSchema);