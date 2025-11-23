import express from 'express';
import { authenticateToken } from './auth.js'; // Use auth from your existing auth.js
import MFAService from '../services/mfaService.js';
import User from '../models/User.js';

const router = express.Router();

// @route   POST /api/mfa/setup
// @desc    Start MFA setup process
router.post('/setup', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId); // Changed to req.user.userId
        
        if (user.mfaEnabled) {
            return res.status(400).json({ error: 'MFA already enabled' });
        }

        const secret = MFAService.generateSecret(user);
        const qrCode = await MFAService.generateQRCode(secret);
        
        // Temporarily store secret (not enabled yet)
        user.mfaTempSecret = secret.base32;
        await user.save();
        
        res.json({ 
            secret: secret.base32, 
            qrCode,
            message: 'Scan QR code with authenticator app' 
        });
    } catch (error) {
        console.error('MFA setup error:', error);
        res.status(500).json({ error: 'MFA setup failed' });
    }
});

// @route   POST /api/mfa/verify
// @desc    Verify MFA token and enable MFA
router.post('/verify', authenticateToken, async (req, res) => {
    try {
        const { token } = req.body;
        const user = await User.findById(req.user.userId); // Changed to req.user.userId
        
        if (!user.mfaTempSecret) {
            return res.status(400).json({ error: 'MFA setup not started' });
        }

        const isValid = MFAService.verifyToken(user.mfaTempSecret, token);
        
        if (isValid) {
            // Enable MFA permanently
            user.mfaSecret = user.mfaTempSecret;
            user.mfaEnabled = true;
            user.mfaTempSecret = undefined;
            user.mfaBackupCodes = MFAService.generateBackupCodes();
            
            await user.save();
            
            res.json({ 
                success: true, 
                backupCodes: user.mfaBackupCodes,
                message: 'MFA enabled successfully' 
            });
        } else {
            res.status(400).json({ error: 'Invalid verification code' });
        }
    } catch (error) {
        console.error('MFA verify error:', error);
        res.status(500).json({ error: 'MFA verification failed' });
    }
});

// @route   POST /api/mfa/disable
// @desc    Disable MFA
router.post('/disable', authenticateToken, async (req, res) => {
    try {
        const { token } = req.body;
        const user = await User.findById(req.user.userId); // Changed to req.user.userId
        
        if (!user.mfaEnabled) {
            return res.status(400).json({ error: 'MFA not enabled' });
        }

        // Verify token before disabling
        const isValid = MFAService.verifyToken(user.mfaSecret, token);
        
        if (isValid) {
            user.mfaEnabled = false;
            user.mfaSecret = undefined;
            user.mfaBackupCodes = [];
            await user.save();
            
            res.json({ success: true, message: 'MFA disabled successfully' });
        } else {
            res.status(400).json({ error: 'Invalid verification code' });
        }
    } catch (error) {
        console.error('MFA disable error:', error);
        res.status(500).json({ error: 'Failed to disable MFA' });
    }
});

// @route   POST /api/mfa/verify-login
// @desc    Verify MFA token during login
router.post('/verify-login', async (req, res) => {
    try {
        const { username, token } = req.body; // Changed from email to username
        const user = await User.findOne({ username });
        
        if (!user || !user.mfaEnabled) {
            return res.status(400).json({ error: 'Invalid request' });
        }

        const isValid = MFAService.verifyToken(user.mfaSecret, token);
        
        if (isValid) {
            res.json({ 
                success: true, 
                message: 'MFA verification successful' 
            });
        } else {
            res.status(401).json({ error: 'Invalid verification code' });
        }
    } catch (error) {
        console.error('MFA login verify error:', error);
        res.status(500).json({ error: 'MFA verification failed' });
    }
});

// @route   POST /api/mfa/backup-code
// @desc    Verify backup code
router.post('/backup-code', async (req, res) => {
    try {
        const { username, backupCode } = req.body; // Changed from email to username
        const user = await User.findOne({ username });
        
        if (!user || !user.mfaEnabled) {
            return res.status(400).json({ error: 'Invalid request' });
        }

        const isValidBackupCode = user.mfaBackupCodes.includes(backupCode);
        
        if (isValidBackupCode) {
            // Remove used backup code
            user.mfaBackupCodes = user.mfaBackupCodes.filter(code => code !== backupCode);
            await user.save();
            
            res.json({ 
                success: true, 
                message: 'Backup code accepted',
                remainingCodes: user.mfaBackupCodes.length
            });
        } else {
            res.status(401).json({ error: 'Invalid backup code' });
        }
    } catch (error) {
        console.error('Backup code verify error:', error);
        res.status(500).json({ error: 'Backup code verification failed' });
    }
});

export default router;