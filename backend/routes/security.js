import express from "express";
import MedicalRecord from "../models/MedicalRecord.js";
import User from "../models/User.js";
import KeyVaultService from "../services/keyVaultService.js";
import SecurityEvent from "../models/SecurityEvent.js"; 
import SecurityLogger from "../services/securityLogger.js";
import { authenticateToken } from "./auth.js";

const router = express.Router();


router.get("/events", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied - Admin only"
      });
    }

    const { type, severity, limit = 50, page = 1 } = req.query;
    
    let filter = {};
    if (type) filter.type = type;
    if (severity) filter.severity = severity;

    const events = await SecurityEvent.find(filter)
      .populate('userId', 'username profile firstName lastName')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await SecurityEvent.countDocuments(filter);

    res.json({
      success: true,
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("Security events error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching security events"
    });
  }
});

// Get security dashboard overview
router.get("/dashboard", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied - Admin only"
      });
    }

    const [recentEvents, stats24h, failedLogins, suspiciousAccess] = await Promise.all([
      SecurityLogger.getRecentEvents(10),
      SecurityLogger.getStats('24h'),
      SecurityEvent.countDocuments({ 
        type: 'failed_login',
        timestamp: SecurityLogger.getTimeFilter('24h')
      }),
      MedicalRecord.aggregate([
        { $unwind: "$accessLog" },
        {
          $match: {
            "accessLog.accessedAt": SecurityLogger.getTimeFilter('1h')
          }
        },
        {
          $group: {
            _id: "$accessLog.accessedBy",
            accessCount: { $sum: 1 }
          }
        },
        {
          $match: {
            accessCount: { $gt: 10 }
          }
        }
      ])
    ]);

    const overview = {
      recentEvents,
      stats24h,
      failedLogins24h: failedLogins,
      suspiciousActivities: suspiciousAccess.length,
      totalEvents24h: stats24h.reduce((sum, stat) => sum + stat.count, 0)
    };

    res.json({
      success: true,
      overview
    });
  } catch (error) {
    console.error("Security dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching security dashboard data"
    });
  }
});

// Test security events endpoint
router.post("/test-events", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied - Admin only"
      });
    }

    // Create test security events
    const testEvents = [
      {
        type: 'failed_login',
        severity: 'medium',
        message: 'Test: Failed login attempt for user: test_user',
        ipAddress: '192.168.1.100',
        userAgent: 'Test Browser'
      },
      {
        type: 'failed_mfa',
        severity: 'high', 
        message: 'Test: Failed MFA attempt for user: admin_user',
        ipAddress: '192.168.1.150',
        userAgent: 'Test Browser'
      },
      {
        type: 'successful_login',
        severity: 'low',
        message: 'Test: Successful login: admin_user',
        ipAddress: '192.168.1.200',
        userAgent: 'Test Browser'
      }
    ];

    const createdEvents = [];
    for (const eventData of testEvents) {
      const event = await SecurityLogger.logEvent(eventData);
      createdEvents.push(event);
    }

    res.json({
      success: true,
      message: "Test security events created successfully",
      events: createdEvents
    });

  } catch (error) {
    console.error("Test events error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating test security events"
    });
  }
});

// Get security statistics
router.get("/stats", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied - Admin only"
      });
    }

    // Get encrypted files count
    const encryptedFiles = await MedicalRecord.aggregate([
      { $unwind: "$attachments" },
      { $match: { "attachments.encryption.encrypted": true } },
      { $count: "encryptedCount" }
    ]);

    // Get today's access count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayAccess = await MedicalRecord.aggregate([
      { $unwind: "$accessLog" },
      { $match: { "accessLog.accessedAt": { $gte: today } } },
      { $count: "accessCount" }
    ]);

    // Get MFA enabled users count
    const mfaUsers = await User.countDocuments({ mfaEnabled: true });

    // Get suspicious activities (multiple rapid accesses)
    const suspiciousActivities = await MedicalRecord.aggregate([
      { $unwind: "$accessLog" },
      {
        $match: {
          "accessLog.accessedAt": { $gte: new Date(Date.now() - 1 * 60 * 60 * 1000) } // Last 1 hour
        }
      },
      {
        $group: {
          _id: "$accessLog.accessedBy",
          accessCount: { $sum: 1 }
        }
      },
      {
        $match: {
          accessCount: { $gt: 10 } // More than 10 accesses in 1 hour is suspicious
        }
      },
      { $count: "suspiciousCount" }
    ]);

    const stats = {
      encryptedFilesCount: encryptedFiles[0]?.encryptedCount || 0,
      todayAccessCount: todayAccess[0]?.accessCount || 0,
      suspiciousActivities: suspiciousActivities[0]?.suspiciousCount || 0,
      mfaEnabledCount: mfaUsers
    };

    res.json({
      success: true,
      stats,
      keyVaultStatus: KeyVaultService.getSecurityStatus()
    });
  } catch (error) {
    console.error("Security stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching security statistics"
    });
  }
});

// Run security audit
router.post("/audit", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied - Admin only"
      });
    }

    // Comprehensive security audit
    const auditResults = {
      timestamp: new Date(),
      performedBy: req.user.userId,
      checks: []
    };

    // Check 1: Encryption status
    const encryptionStatus = await MedicalRecord.aggregate([
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          encryptedRecords: {
            $sum: {
              $cond: [{ $eq: ["$security.encryptionEnabled", true] }, 1, 0]
            }
          },
          totalFiles: { $sum: { $size: "$attachments" } },
          encryptedFiles: {
            $sum: {
              $size: {
                $filter: {
                  input: "$attachments",
                  as: "attachment",
                  cond: { $eq: ["$$attachment.security.encrypted", true] }
                }
              }
            }
          }
        }
      }
    ]);

    auditResults.checks.push({
      name: "Data Encryption",
      status: "completed",
      details: encryptionStatus[0] || {
        totalRecords: 0,
        encryptedRecords: 0,
        totalFiles: 0,
        encryptedFiles: 0
      }
    });

    // Check 2: Access patterns
    const recentAccess = await MedicalRecord.aggregate([
      { $unwind: "$accessLog" },
      {
        $match: {
          "accessLog.accessedAt": { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: "$accessLog.accessedAt" },
            action: "$accessLog.action"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.hour": 1 } }
    ]);

    auditResults.checks.push({
      name: "Access Pattern Analysis",
      status: "completed",
      details: {
        recentActivity: recentAccess,
        total24hAccess: recentAccess.reduce((sum, item) => sum + item.count, 0)
      }
    });

    // Check 3: User security
    const userSecurity = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          mfaEnabled: { $sum: { $cond: [{ $eq: ["$mfaEnabled", true] }, 1, 0] } },
          activeUsers: { $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] } }
        }
      }
    ]);

    auditResults.checks.push({
      name: "User Security",
      status: "completed",
      details: userSecurity[0] || {
        totalUsers: 0,
        mfaEnabled: 0,
        activeUsers: 0
      }
    });

    // Check 4: Key Vault status
    auditResults.checks.push({
      name: "Azure Key Vault Simulation",
      status: "completed",
      details: KeyVaultService.getSecurityStatus()
    });

    // Log the audit
    console.log(`🔍 Security audit completed by admin: ${req.user.userId}`);

    res.json({
      success: true,
      message: "Security audit completed successfully",
      audit: auditResults
    });
  } catch (error) {
    console.error("Security audit error:", error);
    res.status(500).json({
      success: false,
      message: "Error running security audit"
    });
  }
});

// Rotate encryption keys
router.post("/rotate-keys", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied - Admin only"
      });
    }

    const newKeyId = await KeyVaultService.rotateKeys();

    // Log key rotation in all medical records
    await MedicalRecord.updateMany(
      { "security.encryptionEnabled": true },
      {
        $set: {
          "security.lastKeyRotation": new Date(),
          "security.encryptionKeyId": newKeyId
        }
      }
    );

    console.log(`🔄 Encryption keys rotated by admin: ${req.user.userId}`);

    res.json({
      success: true,
      message: "Encryption keys rotated successfully",
      newKeyId,
      rotatedAt: new Date()
    });
  } catch (error) {
    console.error("Key rotation error:", error);
    res.status(500).json({
      success: false,
      message: "Error rotating encryption keys"
    });
  }
});

// Get security logs
router.get("/logs", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied - Admin only"
      });
    }

    const { page = 1, limit = 50, type } = req.query;

    // Get security-related access logs
    const securityLogs = await MedicalRecord.aggregate([
      { $unwind: "$accessLog" },
      {
        $match: {
          "accessLog.action": { $in: ["decrypted", "created", "downloaded"] }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "accessLog.accessedBy",
          foreignField: "_id",
          as: "userInfo"
        }
      },
      {
        $project: {
          recordId: "$_id",
          action: "$accessLog.action",
          accessedBy: { $arrayElemAt: ["$userInfo.username", 0] },
          accessedAt: "$accessLog.accessedAt",
          ipAddress: "$accessLog.ipAddress",
          userAgent: "$accessLog.userAgent",
          securityContext: "$accessLog.securityContext"
        }
      },
      { $sort: { accessedAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: parseInt(limit) }
    ]);

    res.json({
      success: true,
      logs: securityLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: securityLogs.length
      }
    });
  } catch (error) {
    console.error("Security logs error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching security logs"
    });
  }
});

// Get security dashboard overview
router.get("/overview", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied - Admin only"
      });
    }

    // Get multiple statistics in parallel
    const [
      encryptionStats,
      accessStats,
      userStats,
      recentActivities
    ] = await Promise.all([
      // Encryption statistics
      MedicalRecord.aggregate([
        {
          $group: {
            _id: null,
            totalRecords: { $sum: 1 },
            encryptedRecords: {
              $sum: { $cond: [{ $eq: ["$security.encryptionEnabled", true] }, 1, 0] }
            },
            totalFiles: { $sum: { $size: "$attachments" } },
            encryptedFiles: {
              $sum: {
                $size: {
                  $filter: {
                    input: "$attachments",
                    as: "attachment",
                    cond: { $eq: ["$$attachment.security.encrypted", true] }
                  }
                }
              }
            }
          }
        }
      ]),
      // Access statistics (last 24 hours)
      MedicalRecord.aggregate([
        { $unwind: "$accessLog" },
        {
          $match: {
            "accessLog.accessedAt": { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }
        },
        { $count: "accessCount" }
      ]),
      // User statistics
      User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            mfaEnabled: { $sum: { $cond: [{ $eq: ["$mfaEnabled", true] }, 1, 0] } },
            activeUsers: { $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] } }
          }
        }
      ]),
      // Recent security activities
      MedicalRecord.aggregate([
        { $unwind: "$accessLog" },
        { $sort: { "accessLog.accessedAt": -1 } },
        { $limit: 10 },
        {
          $project: {
            action: "$accessLog.action",
            accessedAt: "$accessLog.accessedAt",
            accessedBy: "$accessLog.accessedBy",
            ipAddress: "$accessLog.ipAddress"
          }
        }
      ])
    ]);

    const overview = {
      encryption: encryptionStats[0] || {
        totalRecords: 0,
        encryptedRecords: 0,
        totalFiles: 0,
        encryptedFiles: 0
      },
      access: {
        last24h: accessStats[0]?.accessCount || 0
      },
      users: userStats[0] || {
        totalUsers: 0,
        mfaEnabled: 0,
        activeUsers: 0
      },
      keyVault: KeyVaultService.getSecurityStatus(),
      recentActivities: recentActivities
    };

    res.json({
      success: true,
      overview,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error("Security overview error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching security overview"
    });
  }
});

export default router;