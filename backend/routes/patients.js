import express from "express";
import Patient from "../models/Patient.js";
import MedicalRecord from "../models/MedicalRecord.js";
import User from "../models/User.js";
import { authenticateToken, requireDoctor, requireAdmin } from "./users.js";
const router = express.Router();

// Get all patients (Doctors and Admin) - RESTRICTED BY DEPARTMENT FOR REGULAR DOCTORS
router.get("/", authenticateToken, requireDoctor, async (req, res) => {
  try {
    let patients;
    
    if (req.user.role === "admin") {
      // Admin sees all patients
      patients = await Patient.find()
        .populate("user", "username profile")
        .populate("assignedDoctors.doctorId", "username profile department");
    } else if (req.user.role === "head_doctor") {
      // Head doctor sees patients in their department
      patients = await Patient.find({ department: req.user.department })
        .populate("user", "username profile")
        .populate("assignedDoctors.doctorId", "username profile department");
    } else {
      // Regular doctor sees assigned patients + temporary access
      const assignedPatients = await Patient.find({
        "assignedDoctors.doctorId": req.user.userId
      })
      .populate("user", "username profile")
      .populate("assignedDoctors.doctorId", "username profile department");

      // Get patients with temporary access
      const tempAccessPatients = await Patient.find({
        "temporaryAccess.doctorId": req.user.userId,
        "temporaryAccess.expiresAt": { $gt: new Date() }
      })
      .populate("user", "username profile")
      .populate("assignedDoctors.doctorId", "username profile department");

      // Combine and remove duplicates
      const allPatients = [...assignedPatients, ...tempAccessPatients];
      const uniquePatients = allPatients.filter((patient, index, self) => 
        index === self.findIndex(p => p._id.toString() === patient._id.toString())
      );

      patients = uniquePatients;
    }

    res.json({ success: true, patients });
  } catch (error) {
    console.error("Get patients error:", error);
    res.status(500).json({ success: false, message: "Error fetching patients" });
  }
});

// Get all patients for access requests - ALL PATIENTS FOR ALL DOCTORS
router.get("/all-for-access", authenticateToken, requireDoctor, async (req, res) => {
  try {
    let patients;
    
    if (req.user.role === "admin") {
      // Admin sees all patients
      patients = await Patient.find()
        .populate("user", "username profile")
        .populate("assignedDoctors.doctorId", "username profile department");
    } else {
      // Both head_doctor and regular doctor can see ALL patients for access requests
      patients = await Patient.find()
        .populate("user", "username profile")
        .populate("assignedDoctors.doctorId", "username profile department");
    }

    res.json({ success: true, patients });
  } catch (error) {
    console.error("Get all patients for access error:", error);
    res.status(500).json({ success: false, message: "Error fetching patients" });
  }
});

// Get all patients for head doctors (department management) - RESTRICTED BY DEPARTMENT
router.get("/all", authenticateToken, async (req, res) => {
  try {
    let patients;
    
    if (req.user.role === "head_doctor") {
      // Head doctors only see patients in their department for management
      patients = await Patient.find({ department: req.user.department })
        .populate("user", "username profile")
        .populate("assignedDoctors.doctorId", "username profile department")
        .populate("temporaryAccess.doctorId", "username profile");
    } else {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied" 
      });
    }

    res.json({ success: true, patients });
  } catch (error) {
    console.error("Get all patients error:", error);
    res.status(500).json({ success: false, message: "Error fetching patients" });
  }
});

// Get patients available for access request (not assigned to current doctor) - RESTRICTED BY DEPARTMENT
router.get("/available/for-request", authenticateToken, requireDoctor, async (req, res) => {
  try {
    let availablePatients;

    if (req.user.role === "head_doctor") {
      // Head doctors can see all patients in their department that they're not assigned to
      availablePatients = await Patient.find({
        department: req.user.department,
        "assignedDoctors.doctorId": { $ne: req.user.userId }
      })
      .populate("user", "username profile")
      .populate("assignedDoctors.doctorId", "username profile department");
    } else {
      // Regular doctors can see patients in their department that they're not assigned to
      availablePatients = await Patient.find({
        department: req.user.department,
        "assignedDoctors.doctorId": { $ne: req.user.userId }
      })
      .populate("user", "username profile")
      .populate("assignedDoctors.doctorId", "username profile department");
    }

    res.json({ success: true, patients: availablePatients });
  } catch (error) {
    console.error("Get available patients error:", error);
    res.status(500).json({ success: false, message: "Error fetching available patients" });
  }
});

// Debug endpoint to check patient assignments
router.get("/debug/my-assignments", authenticateToken, requireDoctor, async (req, res) => {
  try {
    const assignedPatients = await Patient.find({
      "assignedDoctors.doctorId": req.user.userId
    });
    
    const tempAccessPatients = await Patient.find({
      "temporaryAccess.doctorId": req.user.userId,
      "temporaryAccess.expiresAt": { $gt: new Date() }
    });

    res.json({
      success: true,
      debug: {
        userId: req.user.userId,
        assignedPatientsCount: assignedPatients.length,
        tempAccessPatientsCount: tempAccessPatients.length,
        assignedPatients: assignedPatients.map(p => ({
          id: p._id,
          name: `${p.personalInfo.firstName} ${p.personalInfo.lastName}`,
          assignedDoctors: p.assignedDoctors
        }))
      }
    });
  } catch (error) {
    console.error("Debug error:", error);
    res.status(500).json({ success: false, message: "Debug error" });
  }
});

// Create patient (with user creation)
router.post("/", authenticateToken, requireDoctor, async (req, res) => {
  try {
    const { username, password, personalInfo, medicalInfo, department } = req.body;

    console.log("Creating patient with data:", { username, personalInfo, department });

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: "Username already exists" 
      });
    }

    // Create user first
    const user = new User({
      username,
      password,
      role: "patient",
      profile: {
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        dateOfBirth: personalInfo.dateOfBirth,
        department: department
      },
      isActive: true
    });

    await user.save();
    console.log("User created:", user._id);

    // Create patient with the created user
    const patientData = {
      user: user._id,
      personalInfo,
      medicalInfo: medicalInfo || {
        allergies: [],
        chronicConditions: [],
        medications: []
      },
      department: department || req.user.department,
      assignedDoctors: [{
        doctorId: req.user.userId,
        department: req.user.department,
        assignedBy: req.user.userId
      }]
    };

    const patient = new Patient(patientData);
    await patient.save();
    console.log("Patient created:", patient._id);
    
    // Populate the response
    const populatedPatient = await Patient.findById(patient._id)
      .populate("user", "username profile")
      .populate("assignedDoctors.doctorId", "username profile department");
    
    res.json({ 
      success: true, 
      message: "Patient created successfully",
      patient: populatedPatient 
    });
  } catch (error) {
    console.error("Create patient error:", error);
    
    // Clean up: if user was created but patient failed, delete the user
    if (req.body.username) {
      await User.findOneAndDelete({ username: req.body.username });
      console.log("Cleaned up user due to patient creation failure");
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Error creating patient: " + error.message 
    });
  }
});

// Update patient
router.put("/:id", authenticateToken, requireDoctor, async (req, res) => {
  try {
    const { personalInfo, medicalInfo, department } = req.body;

    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: "Patient not found" 
      });
    }

    // Check access for regular doctors
    if (req.user.role === "doctor") {
      const hasAccess = patient.assignedDoctors.some(
        assignment => assignment.doctorId.toString() === req.user.userId
      );
      
      const hasTempAccess = patient.temporaryAccess.some(
        access => access.doctorId.toString() === req.user.userId && 
                  new Date(access.expiresAt) > new Date()
      );
      
      if (!hasAccess && !hasTempAccess) {
        return res.status(403).json({ 
          success: false, 
          message: "Access denied - Patient not assigned to you" 
        });
      }
    }

    // Update patient information
    if (personalInfo) {
      patient.personalInfo = { ...patient.personalInfo, ...personalInfo };
    }
    if (medicalInfo) {
      patient.medicalInfo = { ...patient.medicalInfo, ...medicalInfo };
    }
    if (department) {
      patient.department = department;
    }

    await patient.save();

    // Populate the response
    const populatedPatient = await Patient.findById(patient._id)
      .populate("user", "username profile")
      .populate("assignedDoctors.doctorId", "username profile department");

    res.json({ 
      success: true, 
      message: "Patient updated successfully",
      patient: populatedPatient 
    });
  } catch (error) {
    console.error("Update patient error:", error);
    res.status(500).json({ success: false, message: "Error updating patient" });
  }
});

// Get patient by ID with access control - PARAMETER ROUTE LAST
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate("user", "username profile")
      .populate("assignedDoctors.doctorId", "username profile department")
      .populate("temporaryAccess.doctorId", "username profile")
      .populate("temporaryAccess.grantedBy", "username profile");

    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: "Patient not found" 
      });
    }

    // Access control
    if (req.user.role === "patient" && patient.user._id.toString() !== req.user.userId) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied" 
      });
    }

    if (req.user.role === "doctor" || req.user.role === "head_doctor") {
      const isAssigned = patient.assignedDoctors.some(
        assignment => assignment.doctorId._id.toString() === req.user.userId
      );
      
      const hasTemporaryAccess = patient.temporaryAccess.some(
        access => access.doctorId._id.toString() === req.user.userId && 
                  new Date(access.expiresAt) > new Date()
      );
      
      if (!isAssigned && !hasTemporaryAccess && req.user.role !== "head_doctor") {
        return res.status(403).json({ 
          success: false, 
          message: "Access denied - Patient not assigned to you" 
        });
      }
    }

    res.json({ success: true, patient });
  } catch (error) {
    console.error("Get patient error:", error);
    res.status(500).json({ success: false, message: "Error fetching patient" });
  }
});

// Assign doctor to patient (Head Doctor or Admin)
router.post("/:id/assign-doctor", authenticateToken, async (req, res) => {
  try {
    const { doctorId } = req.body;
    
    // Check permissions
    if (!["admin", "head_doctor"].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: "Insufficient permissions" 
      });
    }

    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: "Patient not found" 
      });
    }

    // Check if doctor exists
    const doctor = await User.findById(doctorId);
    if (!doctor || !["head_doctor", "doctor"].includes(doctor.role)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid doctor" 
      });
    }

    // Check if already assigned
    const isAlreadyAssigned = patient.assignedDoctors.some(
      assignment => assignment.doctorId.toString() === doctorId
    );

    if (isAlreadyAssigned) {
      return res.status(400).json({ 
        success: false, 
        message: "Doctor already assigned to this patient" 
      });
    }

    // Assign doctor
    patient.assignedDoctors.push({
      doctorId,
      department: doctor.profile.department,
      assignedBy: req.user.userId
    });

    await patient.save();

    // Populate the updated patient
    const populatedPatient = await Patient.findById(patient._id)
      .populate("user", "username profile")
      .populate("assignedDoctors.doctorId", "username profile department");

    res.json({ 
      success: true, 
      message: "Doctor assigned successfully",
      patient: populatedPatient
    });
  } catch (error) {
    console.error("Assign doctor error:", error);
    res.status(500).json({ success: false, message: "Error assigning doctor" });
  }
});
// Delete patient (Admin only)
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: "Patient not found" 
      });
    }

    // Also delete the associated user account
    await User.findByIdAndDelete(patient.user);

    // Delete the patient record
    await Patient.findByIdAndDelete(req.params.id);

    res.json({ 
      success: true, 
      message: "Patient deleted successfully" 
    });
  } catch (error) {
    console.error("Delete patient error:", error);
    res.status(500).json({ success: false, message: "Error deleting patient" });
  }
});



export default router;