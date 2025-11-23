import express from "express";
import MedicalRecord from "../models/MedicalRecord.js";
import Patient from "../models/Patient.js";
import { authenticateToken, requireDoctor } from "./auth.js";
import upload from "../middleware/upload.js";
import secureUpload from "../middleware/secureUpload.js";
import KeyVaultService from "../services/keyVaultService.js";
import ClassificationService from "../services/classificationService.js";
import path from "path";
import fs from "fs";

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
  try {
    let records;
    
    if (req.user.role === "patient") {
      // Patients see only their own records
      const patient = await Patient.findOne({ user: req.user.userId });
      if (!patient) {
        return res.status(404).json({ 
          success: false, 
          message: "Patient profile not found" 
        });
      }
      
      records = await MedicalRecord.find({ patient: patient._id })
        .populate("patient", "personalInfo")
        .populate("createdBy", "username profile")
        .sort({ createdAt: -1 });
        
    } else if (req.user.role === "doctor" || req.user.role === "head_doctor") {
      // Doctors see records of their assigned patients
      const assignedPatients = await Patient.find({
        "assignedDoctors.doctorId": req.user.userId
      });
      
      const assignedPatientIds = assignedPatients.map(p => p._id);
      
      // Also get patients with temporary access
      const tempAccessPatients = await Patient.find({
        "temporaryAccess.doctorId": req.user.userId,
        "temporaryAccess.expiresAt": { $gt: new Date() }
      });
      
      const tempAccessPatientIds = tempAccessPatients.map(p => p._id);
      
      // Combine all patient IDs
      const allPatientIds = [...new Set([...assignedPatientIds, ...tempAccessPatientIds])];
      
      if (allPatientIds.length === 0) {
        records = [];
      } else {
        records = await MedicalRecord.find({ patient: { $in: allPatientIds } })
          .populate("patient", "personalInfo")
          .populate("createdBy", "username profile")
          .sort({ createdAt: -1 });
      }
      
    } else if (req.user.role === "admin") {
      // Admin sees all records
      records = await MedicalRecord.find()
        .populate("patient", "personalInfo")
        .populate("createdBy", "username profile")
        .sort({ createdAt: -1 });
    } else {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied" 
      });
    }

    // Decrypt sensitive fields for each record
    const decryptedRecords = records.map(record => {
      const recordObj = record.toObject();
      
      // Decrypt description if encrypted
      if (recordObj.encryptedFields?.description) {
        try {
          recordObj.description = KeyVaultService.decryptField(
            recordObj.encryptedFields.description.data,
            recordObj.encryptedFields.description.iv
          );
        } catch (error) {
          console.error("Description decryption failed:", error);
          recordObj.description = "[Encrypted - Decryption Failed]";
        }
      }
      
      // Decrypt content if encrypted
      if (recordObj.encryptedFields?.content) {
        try {
          recordObj.content = KeyVaultService.decryptField(
            recordObj.encryptedFields.content.data,
            recordObj.encryptedFields.content.iv
          );
        } catch (error) {
          console.error("Content decryption failed:", error);
          recordObj.content = "[Encrypted - Decryption Failed]";
        }
      }
      
      return recordObj;
    });

    res.json({ 
      success: true, 
      records: decryptedRecords,
      count: decryptedRecords.length
    });
    
  } catch (error) {
    console.error("Get medical records error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching medical records" 
    });
  }
});

// Get medical records for a specific patient
router.get("/patient/:patientId", authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;

    // Check access permissions
    if (req.user.role === "patient") {
      const patient = await Patient.findOne({ user: req.user.userId });
      if (!patient || patient._id.toString() !== patientId) {
        return res.status(403).json({ 
          success: false, 
          message: "Access denied" 
        });
      }
    }

    if (req.user.role === "doctor" || req.user.role === "head_doctor") {
      const patient = await Patient.findById(patientId);
      if (!patient) {
        return res.status(404).json({ 
          success: false, 
          message: "Patient not found" 
        });
      }

      const isAssigned = patient.assignedDoctors.some(
        assignment => assignment.doctorId && assignment.doctorId.toString() === req.user.userId
      );
      
      const hasTempAccess = patient.temporaryAccess.some(
        access => access.doctorId && access.doctorId.toString() === req.user.userId && 
                  new Date(access.expiresAt) > new Date()
      );
      
      if (!isAssigned && !hasTempAccess && req.user.role !== "head_doctor") {
        return res.status(403).json({ 
          success: false, 
          message: "Access denied - Patient not assigned to you" 
        });
      }
    }

    const records = await MedicalRecord.find({ patient: patientId })
      .populate("patient", "personalInfo")
      .populate("createdBy", "username profile")
      .sort({ createdAt: -1 });

    // Decrypt sensitive fields
    const decryptedRecords = records.map(record => {
      const recordObj = record.toObject();
      
      if (recordObj.encryptedFields?.description) {
        try {
          recordObj.description = KeyVaultService.decryptField(
            recordObj.encryptedFields.description.data,
            recordObj.encryptedFields.description.iv
          );
        } catch (error) {
          recordObj.description = "[Encrypted - Decryption Failed]";
        }
      }
      
      if (recordObj.encryptedFields?.content) {
        try {
          recordObj.content = KeyVaultService.decryptField(
            recordObj.encryptedFields.content.data,
            recordObj.encryptedFields.content.iv
          );
        } catch (error) {
          recordObj.content = "[Encrypted - Decryption Failed]";
        }
      }
      
      return recordObj;
    });

    res.json({ 
      success: true, 
      records: decryptedRecords 
    });
    
  } catch (error) {
    console.error("Get patient medical records error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching patient medical records" 
    });
  }
});

// Check if patient has restricted records before allowing access request
router.get("/patient/:patientId/classification-check", authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;

    // Check if patient has any HIGHLY_CONFIDENTIAL or RESTRICTED records
    const restrictedRecords = await MedicalRecord.find({
      patient: patientId,
      "classification.label": { $in: ['HIGHLY_CONFIDENTIAL', 'RESTRICTED'] }
    });

    res.json({
      success: true,
      hasRestrictedRecords: restrictedRecords.length > 0,
      restrictedCount: restrictedRecords.length
    });

  } catch (error) {
    console.error("Classification check error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error checking record classifications" 
    });
  }
});

// Create medical record with Azure Key Vault encryption
router.post("/", authenticateToken, requireDoctor, upload.array("attachments", 5), secureUpload, async (req, res) => {
  try {
    console.log("🔐 Azure Key Vault: Creating encrypted medical record");
    console.log("Request body:", req.body);
    console.log("Encrypted attachments:", req.encryptedAttachments);
    
    const { patientId, recordType, title, description, content } = req.body;

    // Validation - check required fields
    if (!patientId) {
      return res.status(400).json({ 
        success: false, 
        message: "Patient ID is required" 
      });
    }
    if (!recordType) {
      return res.status(400).json({ 
        success: false, 
        message: "Record type is required" 
      });
    }
    if (!title) {
      return res.status(400).json({ 
        success: false, 
        message: "Title is required" 
      });
    }

    // Verify patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: "Patient not found" 
      });
    }

    // Check access for regular doctors
    if (req.user.role === "doctor") {
      const hasAccess = patient.assignedDoctors.some(
        assignment => assignment.doctorId && assignment.doctorId.toString() === req.user.userId
      );
      
      if (!hasAccess) {
        return res.status(403).json({ 
          success: false, 
          message: "Access denied - Patient not assigned to you" 
        });
      }
    }

    // ✅ FIX: CLASSIFY BEFORE ANY ENCRYPTION (while content is plain text)
    const recordData = {
      patient: patientId,
      recordType,
      title,
      content: content || "",
      description: description || "",
      department: req.user.department || patient.department
    };

    console.log(`🏷️ Azure Information Protection: Classifying record before encryption...`);
    
    // ✅ Use classifySingleRecord (async) instead of classifyMedicalRecord (sync)
    const classificationResult = await ClassificationService.classifySingleRecord(recordData);
    
    console.log(`🏷️ Azure Information Protection: Record classified as ${classificationResult.classification.label}`);

    // Encrypt sensitive text fields using Azure Key Vault simulation
    let encryptedDescription = null;
    let encryptedContent = null;

    if (description && description.length > 0) {
      encryptedDescription = KeyVaultService.encryptField(description);
      console.log("✅ Description encrypted");
    }

    if (content && content.length > 0) {
      encryptedContent = KeyVaultService.encryptField(content);
      console.log("✅ Content encrypted");
    }

    // Use encrypted attachments from secureUpload middleware
    const attachments = req.encryptedAttachments || [];

    const newRecord = new MedicalRecord({
      patient: patientId,
      recordType,
      title,
      // Store encrypted data (plaintext fields will be removed by model middleware)
      description: description || "",
      content: content || "",
      encryptedFields: {
        description: encryptedDescription,
        content: encryptedContent
      },
      attachments,
      createdBy: req.user.userId,
      department: req.user.department || patient.department,
      
      // ✅ FIX: Use the classification from classifySingleRecord
      classification: classificationResult.classification,

      security: {
        encryptionEnabled: true,
        lastEncryptedAt: new Date(),
        keyVaultSimulation: true,
        encryptionKeyId: KeyVaultService.keyVersions.get('current')
      }
    });

    await newRecord.save();

    // Log the creation with security context
    newRecord.accessLog.push({
      accessedBy: req.user.userId,
      action: "created",
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      securityContext: {
        encrypted: true,
        filesEncrypted: attachments.filter(a => a.security?.encrypted).length,
        textEncrypted: !!(encryptedDescription || encryptedContent),
        // ✅ ADD CLASSIFICATION TO AUDIT LOG
        classification: classificationResult.classification.label
      }
    });
    await newRecord.save();

    console.log("🔐 Encrypted medical record created successfully:", newRecord._id);
    
    res.status(201).json({ 
      success: true, 
      message: "Medical record created with Azure Key Vault encryption",
      record: {
        _id: newRecord._id,
        title: newRecord.title,
        recordType: newRecord.recordType,
        // ✅ INCLUDE CLASSIFICATION IN RESPONSE
        classification: newRecord.classification,
        security: {
          encrypted: true,
          filesEncrypted: attachments.filter(a => a.security?.encrypted).length,
          textEncrypted: !!(encryptedDescription || encryptedContent),
          keyVaultEnabled: true,
          encryptionDate: new Date()
        }
      }
    });
  } catch (error) {
    console.error("Create encrypted medical record error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Error creating encrypted medical record" 
    });
  }
});

// Get single medical record with decryption
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id)
      .populate("patient", "personalInfo")
      .populate("createdBy", "username profile");

    if (!record) {
      return res.status(404).json({ 
        success: false, 
        message: "Record not found" 
      });
    }

    // Access control logic
    if (req.user.role === "patient") {
      const patient = await Patient.findOne({ user: req.user.userId });
      if (!patient || record.patient._id.toString() !== patient._id.toString()) {
        return res.status(403).json({ 
          success: false, 
          message: "Access denied" 
        });
      }
    }

    if (req.user.role === "doctor" || req.user.role === "head_doctor") {
      const patient = await Patient.findById(record.patient);
      const isAssigned = patient.assignedDoctors.some(
        assignment => assignment.doctorId && assignment.doctorId.toString() === req.user.userId
      );
      
      if (!isAssigned && req.user.role !== "head_doctor" && patient.department !== req.user.department) {
        return res.status(403).json({ 
          success: false, 
          message: "Access denied" 
        });
      }
    }

    // Decrypt sensitive fields for authorized users
    let decryptionLog = {};
    if (record.encryptedFields) {
      if (record.encryptedFields.description) {
        try {
          record.description = KeyVaultService.decryptField(
            record.encryptedFields.description.data,
            record.encryptedFields.description.iv
          );
          decryptionLog.description = true;
        } catch (decryptError) {
          console.error("Description decryption failed:", decryptError);
          record.description = "[Encrypted - Decryption Failed]";
          decryptionLog.description = false;
        }
      }
      
      if (record.encryptedFields.content) {
        try {
          record.content = KeyVaultService.decryptField(
            record.encryptedFields.content.data,
            record.encryptedFields.content.iv
          );
          decryptionLog.content = true;
        } catch (decryptError) {
          console.error("Content decryption failed:", decryptError);
          record.content = "[Encrypted - Decryption Failed]";
          decryptionLog.content = false;
        }
      }
    }

    // Log the access with decryption details
    record.accessLog.push({
      accessedBy: req.user.userId,
      action: "decrypted",
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      securityContext: {
        decrypted: true,
        fieldsDecrypted: decryptionLog,
        keyVaultUsed: true
      }
    });
    await record.save();

    res.json({ 
      success: true, 
      record,
      security: {
        encrypted: record.security?.encryptionEnabled || false,
        decryptedAt: new Date(),
        decryptionStatus: decryptionLog,
        keyVaultOperation: "decrypt"
      }
    });
  } catch (error) {
    console.error("Get medical record error:", error);
    res.status(500).json({ success: false, message: "Error fetching and decrypting record" });
  }
});

// Download attachment with decryption
router.get("/:recordId/attachments/:attachmentId", authenticateToken, async (req, res) => {
  try {
    const { recordId, attachmentId } = req.params;

    const record = await MedicalRecord.findById(recordId);
    if (!record) {
      return res.status(404).json({ 
        success: false, 
        message: "Record not found" 
      });
    }

    // Access control
    if (req.user.role === "patient") {
      const patient = await Patient.findOne({ user: req.user.userId });
      if (!patient || record.patient.toString() !== patient._id.toString()) {
        return res.status(403).json({ 
          success: false, 
          message: "Access denied" 
        });
      }
    }

    if (req.user.role === "doctor" || req.user.role === "head_doctor") {
      const patient = await Patient.findById(record.patient);
      const isAssigned = patient.assignedDoctors.some(
        assignment => assignment.doctorId && assignment.doctorId.toString() === req.user.userId
      );
      
      if (!isAssigned && req.user.role !== "head_doctor" && patient.department !== req.user.department) {
        return res.status(403).json({ 
          success: false, 
          message: "Access denied" 
        });
      }
    }

    const attachment = record.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({ 
        success: false, 
        message: "Attachment not found" 
      });
    }

    // Check if file exists
    if (!fs.existsSync(attachment.filePath)) {
      return res.status(404).json({ 
        success: false, 
        message: "File not found on server" 
      });
    }

    // Handle encrypted file decryption
    if (attachment.security?.encrypted) {
      try {
        console.log(`🔐 Decrypting medical file: ${attachment.originalName}`);
        
        // Read encrypted file
        const encryptedBuffer = await fs.promises.readFile(attachment.filePath);
        
        // Decrypt using Azure Key Vault simulation
        const decryptedBuffer = KeyVaultService.decryptFile(
          encryptedBuffer.toString('hex'),
          attachment.security.iv,
          attachment.security.authTag
        );

        // Set headers for download
        res.setHeader("Content-Type", attachment.mimeType);
        res.setHeader("Content-Disposition", `attachment; filename="${attachment.originalName}"`);
        res.setHeader("X-File-Encryption", "decrypted");
        res.setHeader("X-KeyVault-Operation", "success");

        // Send decrypted file
        res.send(decryptedBuffer);

        console.log(`✅ Medical file decrypted successfully: ${attachment.originalName}`);

      } catch (decryptError) {
        console.error("❌ File decryption error:", decryptError);
        return res.status(500).json({ 
          success: false, 
          message: "Error decrypting medical file" 
        });
      }
    } else {
      // Serve unencrypted file (backward compatibility)
      const fileStream = fs.createReadStream(attachment.filePath);
      res.setHeader("Content-Type", attachment.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${attachment.originalName}"`);
      res.setHeader("X-File-Encryption", "none");
      fileStream.pipe(res);
    }

    // Log download with encryption status
    record.accessLog.push({
      accessedBy: req.user.userId,
      action: "downloaded",
      meta: { 
        attachment: attachment.originalName,
        encrypted: attachment.security?.encrypted || false,
        decrypted: attachment.security?.encrypted || false
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    await record.save();

  } catch (error) {
    console.error("Download attachment error:", error);
    res.status(500).json({ success: false, message: "Error downloading file" });
  }
});

// Add encrypted attachments to existing record
router.post("/:id/attachments", authenticateToken, requireDoctor, upload.array("attachments", 5), secureUpload, async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ 
        success: false, 
        message: "Record not found" 
      });
    }

    // Check access
    const patient = await Patient.findById(record.patient);
    if (req.user.role === "doctor") {
      const hasAccess = patient.assignedDoctors.some(
        assignment => assignment.doctorId && assignment.doctorId.toString() === req.user.userId
      );
      if (!hasAccess) {
        return res.status(403).json({ 
          success: false, 
          message: "Access denied" 
        });
      }
    }

    // Process new encrypted attachments
    const newAttachments = req.encryptedAttachments || [];

    record.attachments.push(...newAttachments);
    
    // Update security metadata
    record.security = record.security || {};
    record.security.lastUpdated = new Date();
    record.security.encryptionEnabled = true;

    await record.save();

    res.json({ 
      success: true, 
      message: "Attachments added with Azure Key Vault encryption",
      attachments: newAttachments.map(att => ({
        originalName: att.originalName,
        encrypted: att.security?.encrypted || false,
        security: att.security
      }))
    });
  } catch (error) {
    console.error("Add encrypted attachments error:", error);
    res.status(500).json({ success: false, message: "Error adding encrypted attachments" });
  }
});

// Delete attachment (with encrypted file cleanup)
router.delete("/:recordId/attachments/:attachmentId", authenticateToken, requireDoctor, async (req, res) => {
  try {
    const { recordId, attachmentId } = req.params;

    const record = await MedicalRecord.findById(recordId);
    if (!record) {
      return res.status(404).json({ 
        success: false, 
        message: "Record not found" 
      });
    }

    // Check access
    const patient = await Patient.findById(record.patient);
    if (req.user.role === "doctor") {
      const hasAccess = patient.assignedDoctors.some(
        assignment => assignment.doctorId && assignment.doctorId.toString() === req.user.userId
      );
      if (!hasAccess) {
        return res.status(403).json({ 
          success: false, 
          message: "Access denied" 
        });
      }
    }

    const attachment = record.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({ 
        success: false, 
        message: "Attachment not found" 
      });
    }

    // Delete encrypted file from filesystem
    if (fs.existsSync(attachment.filePath)) {
      fs.unlinkSync(attachment.filePath);
      console.log(`🔐 Deleted encrypted medical file: ${attachment.originalName}`);
    }

    // Remove from record
    record.attachments.pull(attachmentId);
    await record.save();

    res.json({ 
      success: true, 
      message: "Encrypted attachment deleted successfully",
      security: {
        encryptedFileRemoved: true,
        keyVaultOperation: "cleanup"
      }
    });
  } catch (error) {
    console.error("Delete encrypted attachment error:", error);
    res.status(500).json({ success: false, message: "Error deleting encrypted attachment" });
  }
});

// Get security audit log for a record (Admin only)
router.get("/:id/security-audit", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied - Admin only" 
      });
    }

    const record = await MedicalRecord.findById(req.params.id)
      .populate("accessLog.accessedBy", "username profile")
      .select("accessLog security attachments");

    if (!record) {
      return res.status(404).json({ 
        success: false, 
        message: "Record not found" 
      });
    }

    const securitySummary = {
      totalAccesses: record.accessLog.length,
      encryptedAttachments: record.attachments.filter(a => a.security?.encrypted).length,
      totalAttachments: record.attachments.length,
      encryptionEnabled: record.security?.encryptionEnabled || false,
      lastEncrypted: record.security?.lastEncryptedAt,
      keyVaultKeyId: record.security?.encryptionKeyId
    };

    res.json({ 
      success: true, 
      securityAudit: record.accessLog,
      securitySummary,
      keyVaultStatus: KeyVaultService.getSecurityStatus()
    });
  } catch (error) {
    console.error("Security audit error:", error);
    res.status(500).json({ success: false, message: "Error fetching security audit" });
  }
});

export default router;