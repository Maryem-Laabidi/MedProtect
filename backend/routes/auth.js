import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import MFAService from "../services/mfaService.js";
import SecurityLogger from "../services/securityLogger.js";


const router = express.Router();

// Verify token middleware (MOVED TO TOP)
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

// Check if user is head_doctor or admin
export const requireHeadDoctor = (req, res, next) => {
  if (!["admin", "head_doctor"].includes(req.user.role)) {
    return res.status(403).json({ 
      success: false, 
      message: "Head doctor or admin access required" 
    });
  }
  next();
};

// Login check (to see if MFA is required)
router.post("/login-check", async (req, res) => {
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

    // Check if account is locked
    if (user.isLocked && user.isLocked()) {
      return res.status(423).json({ 
        success: false, 
        message: "Account temporarily locked due to too many failed attempts" 
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Increment failed attempts if method exists
      if (user.incrementLoginAttempts) {
        await user.incrementLoginAttempts();
      }
      return res.status(401).json({ 
        success: false, 
        message: "Invalid credentials" 
      });
    }

    // Reset login attempts on successful password
    if (user.updateOne) {
      await user.updateOne({
        loginAttempts: 0,
        $unset: { lockUntil: 1 }
      });
    }

    res.json({
      success: true,
      requiresMFA: user.mfaEnabled,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        profile: user.profile,
        department: user.profile.department,
        mfaEnabled: user.mfaEnabled
      }
    });

  } catch (error) {
    console.error("Login check error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error during login check" 
    });
  }
});

// Main login endpoint with MFA support
router.post("/login", async (req, res) => {
  try {
    const { username, password, mfaToken, backupCode } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Username and password are required" 
      });
    }

    // Find user
    const user = await User.findOne({ username, isActive: true });
    if (!user) {
      // Log failed login attempt for non-existent user
      await SecurityLogger.logEvent({
        type: 'failed_login',
        severity: 'medium',
        message: `Failed login attempt for non-existent user: ${username}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({ 
        success: false, 
        message: "Invalid credentials" 
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Log failed password attempt
      await SecurityLogger.logEvent({
        type: 'failed_login',
        severity: 'high',
        message: `Failed password attempt for user: ${username}`,
        userId: user._id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(401).json({ 
        success: false, 
        message: "Invalid credentials" 
      });
    }

    // Handle MFA 
    if (user.mfaEnabled) {
      let mfaValid = false;

      // Check backup code 
      if (backupCode) {
        mfaValid = user.mfaBackupCodes && user.mfaBackupCodes.includes(backupCode);
        if (mfaValid) {
          // Remove used backup code
          user.mfaBackupCodes = user.mfaBackupCodes.filter(code => code !== backupCode);
          await user.save();
          
          // Log successful backup code usage
          await SecurityLogger.logEvent({
            type: 'successful_login',
            severity: 'low',
            message: `User ${username} logged in using backup code`,
            userId: user._id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          });
        }
      } 
      // Check MFA token if provided
      else if (mfaToken) {
        mfaValid = MFAService.verifyToken(user.mfaSecret, mfaToken);
        
        if (!mfaValid) {
          // Log failed MFA attempt
          await SecurityLogger.logEvent({
            type: 'failed_mfa',
            severity: 'critical',
            message: `Failed MFA attempt for user: ${username}`,
            userId: user._id,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          });
          
          return res.status(401).json({ 
            success: false, 
            message: "Invalid MFA token" 
          });
        }
      } else {
        // MFA required but not provided
        return res.status(403).json({ 
          success: false, 
          message: "MFA verification required",
          requiresMFA: true,
          user: {
            id: user._id,
            username: user.username,
            role: user.role,
            profile: user.profile,
            department: user.profile.department
          }
        });
      }
    }

    // Generate token
    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username, 
        role: user.role,
        department: user.profile.department 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Log successful login
    await SecurityLogger.logEvent({
      type: 'successful_login',
      severity: 'low',
      message: `Successful login: ${username} (${user.role})`,
      userId: user._id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        profile: user.profile,
        department: user.profile.department,
        mfaEnabled: user.mfaEnabled
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    
    // Log login error
    await SecurityLogger.logEvent({
      type: 'failed_login',
      severity: 'high',
      message: `Login system error: ${error.message}`,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(500).json({ 
      success: false, 
      message: "Login failed due to system error" 
    });
  }
});

// Verify MFA token separately (for step-by-step login)
router.post("/verify-mfa", async (req, res) => {
  try {
    const { username, mfaToken, backupCode } = req.body;

    if (!username) {
      return res.status(400).json({ 
        success: false, 
        message: "Username is required" 
      });
    }

    const user = await User.findOne({ username, isActive: true });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    if (!user.mfaEnabled) {
      return res.status(400).json({ 
        success: false, 
        message: "MFA not enabled for this user" 
      });
    }

    let mfaValid = false;
    let usedBackupCode = false;

    // Check backup code first if provided
    if (backupCode) {
      mfaValid = user.mfaBackupCodes && user.mfaBackupCodes.includes(backupCode);
      if (mfaValid) {
        usedBackupCode = true;
        // Remove used backup code
        user.mfaBackupCodes = user.mfaBackupCodes.filter(code => code !== backupCode);
        await user.save();
      }
    } 
    // Check MFA token if provided
    else if (mfaToken) {
      mfaValid = MFAService.verifyToken(user.mfaSecret, mfaToken);
    } else {
      return res.status(400).json({ 
        success: false, 
        message: "MFA token or backup code is required" 
      });
    }

    // ✅ FIXED: Add MFA failure logging for /verify-mfa route
if (!mfaValid) {
  
  await SecurityLogger.logEvent({
    type: 'failed_mfa',
    severity: 'critical', 
    message: `Failed MFA attempt for user: ${username}`,
    userId: user._id,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    metadata: {
      usedBackupCode: !!backupCode,
      method: backupCode ? 'backup_code' : 'totp_token'
    }
  });
  
  return res.status(401).json({ 
    success: false, 
    message: backupCode ? "Invalid backup code" : "Invalid MFA token"
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
      message: usedBackupCode ? "Login successful with backup code" : "MFA verification successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        profile: user.profile,
        department: user.profile.department,
        mfaEnabled: user.mfaEnabled,
        remainingBackupCodes: user.mfaBackupCodes ? user.mfaBackupCodes.length : 0
      }
    });

  } catch (error) {
    console.error("MFA verification error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error during MFA verification" 
    });
  }
});

// Check MFA status for current user
router.get("/mfa-status", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    res.json({
      success: true,
      mfaEnabled: user.mfaEnabled,
      backupCodesCount: user.mfaBackupCodes ? user.mfaBackupCodes.length : 0
    });

  } catch (error) {
    console.error("MFA status error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error checking MFA status" 
    });
  }
});

export default router;