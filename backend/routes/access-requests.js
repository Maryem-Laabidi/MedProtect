import express from "express";
import AccessRequest from "../models/AccessRequest.js";
import Patient from "../models/Patient.js";
import User from "../models/User.js";
import { authenticateToken, requireDoctor } from "./users.js";

const router = express.Router();

// Create access request
router.post("/request", authenticateToken, requireDoctor, async (req, res) => {
  try {
    const { patientId, reason, accessDuration } = req.body;

    // Check if patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient non trouvé"
      });
    }

    // Check if user is already assigned to this patient
    const isAlreadyAssigned = patient.assignedDoctors.some(
      assignment => assignment.doctorId.toString() === req.user.userId
    );

    if (isAlreadyAssigned) {
      return res.status(400).json({
        success: false,
        message: "Vous êtes déjà assigné à ce patient"
      });
    }

    // Check if there's already a pending request for this patient and doctor
    const existingRequest = await AccessRequest.findOne({
      patient: patientId,
      requestingDoctor: req.user.userId,
      status: "pending"
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: "Vous avez déjà une demande d'accès en attente pour ce patient"
      });
    }

    // Create the access request
    const accessRequest = new AccessRequest({
      patient: patientId,
      requestingDoctor: req.user.userId,
      reason,
      accessDuration: accessDuration || 24,
      status: "pending"
    });

    await accessRequest.save();

    // Populate the response
    const populatedRequest = await AccessRequest.findById(accessRequest._id)
      .populate("patient", "personalInfo department")
      .populate("requestingDoctor", "username profile");

    res.json({
      success: true,
      message: "Demande d'accès envoyée avec succès",
      request: populatedRequest
    });

  } catch (error) {
    console.error("Error creating access request:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la création de la demande d'accès"
    });
  }
});

// Get pending access requests for a doctor's patients
router.get("/pending", authenticateToken, requireDoctor, async (req, res) => {
  try {
    let pendingRequests;

    if (req.user.role === "head_doctor") {
      // Head doctors see all pending requests in their department
      pendingRequests = await AccessRequest.find({ status: "pending" })
        .populate("patient", "personalInfo department assignedDoctors")
        .populate("requestingDoctor", "username profile department")
        .sort({ createdAt: -1 });
    } else {
      // Regular doctors see pending requests for their assigned patients
      // First, get the doctor's assigned patients
      const assignedPatients = await Patient.find({
        "assignedDoctors.doctorId": req.user.userId
      });

      const patientIds = assignedPatients.map(patient => patient._id);

      pendingRequests = await AccessRequest.find({
        patient: { $in: patientIds },
        status: "pending"
      })
        .populate("patient", "personalInfo department assignedDoctors")
        .populate("requestingDoctor", "username profile department")
        .sort({ createdAt: -1 });
    }

    res.json({
      success: true,
      requests: pendingRequests
    });

  } catch (error) {
    console.error("Error fetching pending requests:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des demandes en attente"
    });
  }
});

// Get my access requests (requests I sent)
router.get("/my-requests", authenticateToken, requireDoctor, async (req, res) => {
  try {
    const myRequests = await AccessRequest.find({
      requestingDoctor: req.user.userId
    })
      .populate("patient", "personalInfo department")
      .populate("approvedBy", "username profile")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      requests: myRequests
    });

  } catch (error) {
    console.error("Error fetching my requests:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de vos demandes"
    });
  }
});

// Respond to access request (approve/reject)
router.put("/:id/respond", authenticateToken, requireDoctor, async (req, res) => {
  try {
    const { status } = req.body;
    const requestId = req.params.id;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Statut invalide. Doit être 'approved' ou 'rejected'"
      });
    }

    const accessRequest = await AccessRequest.findById(requestId)
      .populate("patient", "assignedDoctors");

    if (!accessRequest) {
      return res.status(404).json({
        success: false,
        message: "Demande d'accès non trouvée"
      });
    }

    // Check if the current doctor is assigned to the patient
    const isAssignedToPatient = accessRequest.patient.assignedDoctors.some(
      assignment => assignment.doctorId.toString() === req.user.userId
    );

    if (!isAssignedToPatient && req.user.role !== "head_doctor") {
      return res.status(403).json({
        success: false,
        message: "Vous n'êtes pas autorisé à répondre à cette demande"
      });
    }

    // Update the request
    accessRequest.status = status;
    accessRequest.approvedBy = req.user.userId;
    accessRequest.respondedAt = new Date();

    await accessRequest.save();

    // If approved, grant temporary access
    if (status === "approved") {
      const patient = await Patient.findById(accessRequest.patient._id);
      
      // Add temporary access
      patient.temporaryAccess.push({
        doctorId: accessRequest.requestingDoctor,
        grantedBy: req.user.userId,
        expiresAt: new Date(Date.now() + accessRequest.accessDuration * 60 * 60 * 1000), // Convert hours to milliseconds
        accessRequest: accessRequest._id
      });

      await patient.save();
    }

    // Populate the updated request
    const updatedRequest = await AccessRequest.findById(accessRequest._id)
      .populate("patient", "personalInfo department")
      .populate("requestingDoctor", "username profile")
      .populate("approvedBy", "username profile");

    res.json({
      success: true,
      message: `Demande ${status === "approved" ? "approuvée" : "rejetée"} avec succès`,
      request: updatedRequest
    });

  } catch (error) {
    console.error("Error responding to access request:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la réponse à la demande d'accès"
    });
  }
});

// Get access request by ID
router.get("/:id", authenticateToken, requireDoctor, async (req, res) => {
  try {
    const accessRequest = await AccessRequest.findById(req.params.id)
      .populate("patient", "personalInfo department assignedDoctors")
      .populate("requestingDoctor", "username profile department")
      .populate("approvedBy", "username profile");

    if (!accessRequest) {
      return res.status(404).json({
        success: false,
        message: "Demande d'accès non trouvée"
      });
    }

    res.json({
      success: true,
      request: accessRequest
    });

  } catch (error) {
    console.error("Error fetching access request:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération de la demande d'accès"
    });
  }
});

// Delete access request (only by the requesting doctor)
router.delete("/:id", authenticateToken, requireDoctor, async (req, res) => {
  try {
    const accessRequest = await AccessRequest.findById(req.params.id);

    if (!accessRequest) {
      return res.status(404).json({
        success: false,
        message: "Demande d'accès non trouvée"
      });
    }

    // Only the requesting doctor can delete their own pending requests
    if (accessRequest.requestingDoctor.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Vous ne pouvez supprimer que vos propres demandes"
      });
    }

    if (accessRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Seules les demandes en attente peuvent être supprimées"
      });
    }

    await AccessRequest.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Demande d'accès supprimée avec succès"
    });

  } catch (error) {
    console.error("Error deleting access request:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression de la demande d'accès"
    });
  }
});

export default router;