import rateLimit from 'express-rate-limit';
import SecurityLogger from '../services/securityLogger.js';

// API Security Configuration
class APISecurity {
    constructor() {
        this.suspiciousPatterns = [
            { pattern: /\/medical-records\?.*limit=([5-9]|\d{2,})/, description: 'Large data export attempt' },
            { pattern: /\/patients\?.*export=true/, description: 'Data export parameter detected' },
            { pattern: /\/medical-records\?.*patient=.*&.*patient=.*/, description: 'Multiple patient parameter attack' },
            { pattern: /\/api\/.*\.(json|xml|csv)/, description: 'Direct data format request' },
            { pattern: /\/medical-records\/bulk/, description: 'Bulk operation attempt' }
        ];

        // ✅ INCREASED RATE LIMITS
        this.userRoleLimits = {
            patient: { windowMs: 900000, max: 200 },      // Increased from 50 to 200
            doctor: { windowMs: 900000, max: 500 },      // Increased from 200 to 500  
            head_doctor: { windowMs: 900000, max: 1000 }, // Increased from 500 to 1000
            admin: { windowMs: 900000, max: 5000 }       // Increased from 1000 to 5000
        };
    }

    // Create dynamic rate limiters based on user role
    createRoleBasedLimiter() {
        return rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: (req) => {
                const userRole = req.user?.role || 'patient';
                return this.userRoleLimits[userRole]?.max || 200; // Increased default
            },
            message: {
                success: false,
                message: 'Too many requests from this user role',
                error: 'RATE_LIMIT_EXCEEDED',
                details: 'Please wait before making more requests'
            },
            standardHeaders: true,
            legacyHeaders: false,
            keyGenerator: (req) => {
                return `${req.user?.userId}-${req.user?.role}`;
            }
        });
    }

    // Medical records specific limiter - INCREASED
    medicalRecordsLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // ✅ Increased from 30 to 100
        message: {
            success: false,
            message: 'Too many medical record accesses',
            error: 'MEDICAL_DATA_RATE_LIMIT_EXCEEDED',
            details: 'Medical data access is rate limited for security. Please contact administrator if you need higher limits.'
        },
        standardHeaders: true,
        legacyHeaders: false,
        skip: (req) => req.user?.role === 'admin' // Admins have higher limits
    });

    // File download limiter - INCREASED
    fileDownloadLimiter = rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 20, // ✅ Increased from 5 to 20
        message: {
            success: false,
            message: 'Too many file download attempts',
            error: 'DOWNLOAD_LIMIT_EXCEEDED',
            details: 'Please wait before downloading more files'
        }
    });

    // ✅ IGNORE 429 ERRORS IN API ANALYTICS (to stop spam)
    apiAnalytics = (req, res, next) => {
        const startTime = Date.now();
        const { originalUrl, method, user } = req;

        // Capture response details
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            const statusCode = res.statusCode;

            //  IGNORE 429 errors (rate limits) to stop spam
            if (statusCode === 429) {
                return;
            }

            //  IGNORE AUTH/MFA API ERRORS 
            if (statusCode === 401 && (
            originalUrl.includes('/api/auth/') || 
            originalUrl.includes('/api/mfa/')
            )) {
            return; 
            }

            // Log slow requests
            if (duration > 5000) { // 5 seconds
                SecurityLogger.logEvent({
                    type: 'slow_api_request',
                    severity: 'low',
                    message: `Slow API request detected: ${method} ${originalUrl}`,
                    userId: user?.userId,
                    metadata: {
                        duration: `${duration}ms`,
                        statusCode: statusCode,
                        endpoint: originalUrl
                    }
                });
            }

            // Log error responses (excluding 429)
            if (statusCode >= 400 && statusCode !== 429) {
                SecurityLogger.logEvent({
                    type: 'api_error_response',
                    severity: 'medium',
                    message: `API error response: ${statusCode} for ${method} ${originalUrl}`,
                    userId: user?.userId,
                    metadata: {
                        statusCode: statusCode,
                        endpoint: originalUrl,
                        duration: `${duration}ms`
                    }
                });
            }

            console.log(`📊 API: ${method} ${originalUrl} - ${statusCode} - ${duration}ms`);
        });

        next();
    };

    // ... rest of the file remains the same (suspiciousPatterns, securityHeaders, etc.)
    detectSuspiciousPatterns = (req, res, next) => {
        const { originalUrl, method, user } = req;

        for (let { pattern, description } of this.suspiciousPatterns) {
            if (pattern.test(originalUrl)) {
                SecurityLogger.logEvent({
                    type: 'suspicious_api_pattern',
                    severity: 'high',
                    message: `Suspicious API pattern detected: ${description}`,
                    userId: user?.userId,
                    ipAddress: req.ip,
                    metadata: {
                        pattern: description,
                        url: originalUrl,
                        method: method,
                        userAgent: req.get('User-Agent')
                    }
                });

                console.log(`🚨 Suspicious API pattern: ${description} - ${originalUrl}`);
            }
        }

        if (this.isRapidSuccessiveRequest(req)) {
            SecurityLogger.logEvent({
                type: 'rapid_successive_requests',
                severity: 'medium',
                message: 'Rapid successive requests detected - possible automated tool',
                userId: user?.userId,
                ipAddress: req.ip,
                metadata: {
                    url: originalUrl,
                    method: method,
                    timing: 'RAPID_SUCCESSIVE'
                }
            });
        }

        next();
    };

    isRapidSuccessiveRequest(req) {
        const now = Date.now();
        req.lastRequestTime = req.lastRequestTime || 0;
        const isRapid = (now - req.lastRequestTime) < 100;
        req.lastRequestTime = now;
        return isRapid;
    }

    securityHeaders = (req, res, next) => {
        res.setHeader('X-API-Version', '1.0');
        res.setHeader('X-API-Management', 'enabled');
        res.setHeader('X-RateLimit-Limit', this.userRoleLimits[req.user?.role]?.max || 200);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        next();
    };

    getSecurityStatus() {
        return {
            service: 'Azure API Management Simulation',
            status: 'ACTIVE',
            features: {
                rateLimiting: 'ENABLED',
                patternDetection: 'ENABLED',
                analytics: 'ENABLED',
                securityHeaders: 'ENABLED'
            },
            limits: this.userRoleLimits,
            timestamp: new Date()
        };
    }
}

const apiSecurity = new APISecurity();

export {
    apiSecurity,
    apiSecurity as default
};