import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

class MFAService {
    static generateSecret(user) {
        return speakeasy.generateSecret({
            name: `MedProtect (${user.username})`,
            issuer: "MedProtect Clinic"
        });
    }

    static verifyToken(secret, token) {
        return speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 1
        });
    }

    static async generateQRCode(secret) {
        return await QRCode.toDataURL(secret.otpauth_url);
    }

    static generateBackupCodes(count = 8) {
        return Array.from({length: count}, 
            () => Math.random().toString(36).substring(2, 10).toUpperCase());
    }
}

export default MFAService;