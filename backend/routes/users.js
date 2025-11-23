import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Patient from "../models/Patient.js";

const router = express.Router();

// Verify token middleware
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: "Access token required" 
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || "medical_secret_key", (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false, 
        message: "Invalid or expired token" 
      });
    }
    req.user = user;
    next();
  });
};

// Check if user is admin
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ 
      success: false, 
      message: "Admin access required" 
    });
  }
  next();
};

// Check if user is doctor or higher
export const requireDoctor = (req, res, next) => {
  if (!["admin", "head_doctor", "doctor"].includes(req.user.role)) {
    return res.status(403).json({ 
      success: false, 
      message: "Doctor access required" 
    });
  }
  next();
};

// Login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Username and password are required" 
      });
    }

    // Find user
    const user = await User.findOne({ username, isActive: true });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid credentials" 
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid credentials" 
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Create token
    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username, 
        role: user.role,
        department: user.profile.department 
      },
      process.env.JWT_SECRET || "medical_secret_key",
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        userId: user._id, // Changed from 'id' to 'userId' to match frontend expectation
        username: user.username,
        role: user.role,
        profile: user.profile,
        department: user.profile.department
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error during login" 
    });
  }
});

// Get all users (Admin only)
router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json({ success: true, users });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ success: false, message: "Error fetching users" });
  }
});

// Get all doctors (Admin only)
router.get("/doctors", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const doctors = await User.find({ 
      role: { $in: ["doctor", "head_doctor"] } 
    }).select("username role profile isActive");

    res.json({ success: true, doctors });
  } catch (error) {
    console.error("Get doctors error:", error);
    res.status(500).json({ success: false, message: "Error fetching doctors" });
  }
});

// Create user (Admin only)
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, password, role, profile } = req.body;

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: "Username already exists" 
      });
    }

    const user = new User({
      username,
      password,
      role,
      profile,
      isActive: true
    });

    await user.save();

    res.json({ 
      success: true, 
      message: "User created successfully",
      user: {
        _id: user._id, // Return _id for patient creation
        id: user._id, // Also return id for compatibility
        username: user.username,
        role: user.role,
        profile: user.profile
      }
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ success: false, message: "Error creating user" });
  }
});

// Get user profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    if (req.user.role === "patient") {
      // For patients, return the full patient profile with medical info and assigned doctors
      const patient = await Patient.findOne({ user: req.user.userId })
        .populate("user", "username profile")
        .populate("assignedDoctors.doctorId", "username profile");
      
      if (!patient) {
        return res.status(404).json({ 
          success: false, 
          message: "Patient profile not found" 
        });
      }

      return res.json({
        success: true,
        patient: {
          personalInfo: patient.personalInfo,
          medicalInfo: patient.medicalInfo,
          assignedDoctors: patient.assignedDoctors,
          department: patient.department
        }
      });
    } else {
      // For doctors and admin, return basic user info
      const user = await User.findById(req.user.userId);
      
      if (!user) {
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }

      return res.json({
        success: true,
        user: {
          userId: user._id,
          username: user.username,
          role: user.role,
          profile: user.profile
        }
      });
    }
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching profile" 
    });
  }
});

// Update user (Admin only)
router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, role, profile, isActive } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Update fields
    if (username) user.username = username;
    if (role) user.role = role;
    if (profile) user.profile = { ...user.profile, ...profile };
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.json({ 
      success: true, 
      message: "User updated successfully",
      user: {
        _id: user._id,
        username: user.username,
        role: user.role,
        profile: user.profile,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ success: false, message: "Error updating user" });
  }
});

// Delete user (Admin only)
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    // Check if user is a patient and has a patient record
    if (user.role === "patient") {
      const patientRecord = await Patient.findOne({ user: req.params.id });
      if (patientRecord) {
        await Patient.findByIdAndDelete(patientRecord._id);
      }
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({ 
      success: true, 
      message: "User deleted successfully" 
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ success: false, message: "Error deleting user" });
  }
});

export default router;