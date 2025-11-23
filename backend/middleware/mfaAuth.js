import User from '../models/User.js';
import MFAService from '../services/mfaService.js';

const requireMFA = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const user = await User.findById(req.user.id);
        
        // Skip MFA if not enabled
        if (!user.mfaEnabled) {
            return next();
        }

        // Check if MFA was verified in this session
        if (req.session.mfaVerified) {
            return next();
        }

        // Require MFA verification
        return res.status(403).json({ 
            error: 'MFA verification required',
            requiresMFA: true 
        });
    } catch (error) {
        res.status(500).json({ error: 'MFA check failed' });
    }
};

export { requireMFA };