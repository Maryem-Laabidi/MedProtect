import express from 'express';
import { authenticateToken, requireAdmin } from './auth.js';

const router = express.Router();

// Get comprehensive network security status
router.get('/network-status', authenticateToken, (req, res) => {
    const networkStatus = {
        service: 'Azure Private Link Simulation',
        status: 'ACTIVE',
        currentClient: {
            ip: req.ip,
            accessType: req.networkContext?.accessType || 'EXTERNAL',
            location: getLocationFromIP(req.ip),
            riskLevel: calculateRiskLevel(req.ip, req.networkContext?.accessType),
            userAgent: req.get('User-Agent')
        },
        networkHealth: {
            totalEndpoints: 24,
            securedEndpoints: 24,
            blockedAttempts: Math.floor(Math.random() * 20) + 5,
            vpnConnections: Math.floor(Math.random() * 15) + 3,
            lastScan: new Date().toISOString()
        },
        allowedNetworks: [
            { 
                range: '192.168.1.0/24', 
                name: 'Main Clinic Network', 
                type: 'INTERNAL', 
                devices: 45,
                securityLevel: 'HIGH',
                lastActivity: new Date().toISOString()
            },
            { 
                range: '10.0.1.0/24', 
                name: 'Medical Devices VLAN', 
                type: 'RESTRICTED', 
                devices: 12,
                securityLevel: 'MAXIMUM',
                lastActivity: new Date(Date.now() - 300000).toISOString()
            },
            { 
                range: '172.16.0.0/16', 
                name: 'Staff VPN Network', 
                type: 'REMOTE_ACCESS', 
                devices: 23,
                securityLevel: 'HIGH',
                lastActivity: new Date().toISOString()
            }
        ],
        azureIntegration: {
            securityCenter: 'CONNECTED',
            sentinel: 'ACTIVE',
            monitor: 'STREAMING',
            privateLink: 'ENABLED'
        },
        timestamp: new Date()
    };

    res.json({
        success: true,
        message: 'Azure Private Link Security Status',
        data: networkStatus
    });
});

// Simulate network threat for testing
router.post('/simulate-threat', authenticateToken, requireAdmin, (req, res) => {
    const threats = [
        {
            type: 'EXTERNAL_ACCESS_ATTEMPT',
            ip: '203.0.113.' + Math.floor(Math.random() * 255),
            severity: 'HIGH',
            message: 'External IP attempted to access medical records API',
            timestamp: new Date()
        },
        {
            type: 'RAPID_REQUEST_BURST', 
            ip: '192.168.1.' + Math.floor(Math.random() * 255),
            severity: 'MEDIUM',
            message: 'Rapid successive requests detected from internal IP',
            timestamp: new Date()
        },
        {
            type: 'UNAUTHORIZED_ENDPOINT_ACCESS',
            ip: req.ip,
            severity: 'LOW', 
            message: 'User attempted to access restricted endpoint',
            timestamp: new Date()
        }
    ];

    const randomThreat = threats[Math.floor(Math.random() * threats.length)];
    
    // Log the simulated threat
    console.log('🚨 SIMULATED NETWORK THREAT:', randomThreat);

    res.json({
        success: true,
        message: 'Network threat simulation completed',
        simulatedThreat: randomThreat,
        action: 'Logged to Azure Security Center'
    });
});

// Helper functions
function getLocationFromIP(ip) {
    if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.16.')) {
        return 'Clinic Internal Network';
    } else if (ip === '127.0.0.1' || ip === '::1') {
        return 'Local Development';
    } else {
        return 'External Network';
    }
}

function calculateRiskLevel(ip, accessType) {
    if (accessType === 'INTERNAL') return 'LOW';
    if (ip.startsWith('192.168.')) return 'LOW';
    if (ip === '127.0.0.1') return 'LOW';
    return 'HIGH';
}

export default router;