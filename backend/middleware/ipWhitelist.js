import SecurityLogger from '../services/securityLogger.js';

class NetworkSecurity {
    constructor() {
        // Simulated clinic network ranges (Azure Private Link simulation)
        this.allowedNetworks = [
            '192.168.1.0/24',    // Clinic main network
            '10.0.1.0/24',       // Medical devices network
            '172.16.0.0/16',     // VPN network
            '127.0.0.1/32',      // Local development
            '::1'                // IPv6 localhost
        ];

        // High-security endpoints that require internal network
        this.restrictedEndpoints = [
            '/api/medical-records',
            '/api/patients/medical-info',
            '/api/security/'
        ];

        // External access with limitations
        this.limitedExternalEndpoints = [
            '/api/auth/',
            '/api/mfa/'
        ];
    }

    // Check if IP is in allowed network ranges
    isAllowedNetwork(ip) {
        // Simple IP range check for simulation
        for (let network of this.allowedNetworks) {
            if (this.checkIPInRange(ip, network)) {
                return true;
            }
        }
        return false;
    }

    // Basic IP range check simulation
    checkIPInRange(ip, range) {
        if (range === '::1' && ip === '::1') return true;
        if (range === '127.0.0.1/32' && ip === '127.0.0.1') return true;
        
        // Simulate network range checks
        if (range === '192.168.1.0/24' && ip.startsWith('192.168.1.')) return true;
        if (range === '10.0.1.0/24' && ip.startsWith('10.0.1.')) return true;
        if (range === '172.16.0.0/16' && ip.startsWith('172.16.')) return true;
        
        return false;
    }

    // Main middleware function
    networkIsolation = (req, res, next) => {
        const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
        const isInternalNetwork = this.isAllowedNetwork(clientIP);
        
        // Set network context for route handlers
        req.networkContext = {
            ip: clientIP,
            accessType: isInternalNetwork ? 'INTERNAL' : 'EXTERNAL',
            isRestricted: this.isRestrictedEndpoint(req.originalUrl),
            timestamp: new Date()
        };

        // Apply different security policies based on network
        if (!isInternalNetwork) {
            this.handleExternalAccess(req, res, next);
        } else {
            this.handleInternalAccess(req, res, next);
        }
    };

    isRestrictedEndpoint(url) {
        return this.restrictedEndpoints.some(endpoint => url.includes(endpoint));
    }

    handleExternalAccess(req, res, next) {
        const { originalUrl, method } = req;

        // Log external access attempt
        SecurityLogger.logEvent({
            type: 'external_network_access',
            severity: 'medium',
            message: `External network access attempt: ${method} ${originalUrl}`,
            ipAddress: req.networkContext.ip,
            userAgent: req.get('User-Agent'),
            metadata: {
                endpoint: originalUrl,
                user: req.user?.userId
            }
        });

        // Block sensitive operations from external networks
        if (this.isRestrictedEndpoint(originalUrl) && method !== 'GET') {
            SecurityLogger.logEvent({
                type: 'external_network_blocked',
                severity: 'high',
                message: `Blocked external network attempt to modify medical data: ${method} ${originalUrl}`,
                ipAddress: req.networkContext.ip,
                userId: req.user?.userId,
                metadata: {
                    action: 'BLOCKED',
                    reason: 'EXTERNAL_NETWORK_MODIFICATION_ATTEMPT'
                }
            });

            return res.status(403).json({
                success: false,
                message: 'Sensitive medical operations restricted to clinic internal network',
                error: 'NETWORK_ACCESS_RESTRICTED',
                details: 'Please connect via clinic VPN or internal network for this operation',
                security: {
                    requiredNetwork: 'INTERNAL',
                    currentNetwork: 'EXTERNAL',
                    allowedActions: ['VIEW_READONLY']
                }
            });
        }

        // Add security headers for external requests
        res.setHeader('X-Network-Access', 'EXTERNAL');
        res.setHeader('X-Security-Level', 'ENHANCED_MONITORING');
        
        console.log(`🌐 External network access: ${req.networkContext.ip} -> ${originalUrl}`);
        next();
    }

    handleInternalAccess(req, res, next) {
        // Internal network - standard security
        res.setHeader('X-Network-Access', 'INTERNAL');
        res.setHeader('X-Security-Level', 'STANDARD');
        
        console.log(`🏥 Internal network access: ${req.networkContext.ip} -> ${req.originalUrl}`);
        next();
    }

    // Security health check endpoint
    getNetworkStatus() {
        return {
            service: 'Azure Private Link Simulation',
            status: 'ACTIVE',
            allowedNetworks: this.allowedNetworks,
            restrictedEndpoints: this.restrictedEndpoints,
            securityLevel: 'NETWORK_ISOLATION_ENABLED',
            timestamp: new Date()
        };
    }
}

export default new NetworkSecurity().networkIsolation;