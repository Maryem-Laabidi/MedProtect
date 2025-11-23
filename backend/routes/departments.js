import express from "express";
import Department from "../models/Department.js";
import User from "../models/User.js";
import { authenticateToken, requireAdmin } from "./users.js";

const router = express.Router();

// Get all departments
router.get("/", authenticateToken, async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true })
      .populate("headDoctor", "username profile")
      .populate("doctors", "username profile");

    res.json({ success: true, departments });
  } catch (error) {
    console.error("Get departments error:", error);
    res.status(500).json({ success: false, message: "Error fetching departments" });
  }
});

// Get doctors by department
router.get("/:department/doctors", authenticateToken, async (req, res) => {
  try {
    const doctors = await User.find({ 
      "profile.department": req.params.department,
      role: { $in: ["doctor", "head_doctor"] }
    }).select("username role profile");

    res.json({ success: true, doctors });
  } catch (error) {
    console.error("Get department doctors error:", error);
    res.status(500).json({ success: false, message: "Error fetching doctors" });
  }
});

// Create department (Admin only)
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, headDoctorId } = req.body;

    const existingDepartment = await Department.findOne({ name });
    if (existingDepartment) {
      return res.status(400).json({ 
        success: false, 
        message: "Department already exists" 
      });
    }

    const newDepartment = new Department({
      name,
      description,
      headDoctor: headDoctorId
    });

    await newDepartment.save();

    res.status(201).json({ 
      success: true, 
      message: "Department created successfully",
      department: newDepartment 
    });
  } catch (error) {
    console.error("Create department error:", error);
    res.status(500).json({ success: false, message: "Error creating department" });
  }
});

export default router;