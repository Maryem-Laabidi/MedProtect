import KeyVaultService from '../services/keyVaultService.js';
import fs from 'fs/promises';
import path from 'path';

const secureUpload = async (req, res, next) => {
    // If no files, proceed without encryption
    if (!req.files || req.files.length === 0) {
        return next();
    }

    try {
        console.log('🔐 Azure Key Vault Simulation: Encrypting uploaded medical files...');
        
        const encryptedAttachments = await Promise.all(
            req.files.map(async (file) => {
                try {
                    // Read the uploaded file from your existing upload directory
                    const fileBuffer = await fs.readFile(file.path);
                    
                    // Simulate Azure Key Vault encryption
                    const encryptedData = KeyVaultService.encryptFile(fileBuffer);
                    
                    // Create encrypted version alongside original
                    const encryptedFilePath = file.path + '.encrypted';
                    await fs.writeFile(encryptedFilePath, Buffer.from(encryptedData.data, 'hex'));
                    
                    // Optional: Remove original unencrypted file for security
                    // await fs.unlink(file.path);
                    
                    console.log(`✅ Medical file encrypted: ${file.originalname} -> ${path.basename(encryptedFilePath)}`);
                    
                    return {
                        filename: file.filename,
                        originalName: file.originalname,
                        filePath: encryptedFilePath, // Store path to encrypted file
                        originalFilePath: file.path, // Keep reference to original if needed
                        fileSize: file.size,
                        mimeType: file.mimetype,
                        security: {
                            encrypted: true,
                            iv: encryptedData.iv,
                            authTag: encryptedData.authTag,
                            encryptedAt: new Date(),
                            keyId: "azure-kv-simulated-key"
                        }
                    };
                } catch (fileError) {
                    console.error(`❌ Encryption failed for ${file.originalname}:`, fileError);
                    // Security fallback: Store as unencrypted but log warning
                    console.warn(`⚠️  Storing unencrypted: ${file.originalname}`);
                    return {
                        filename: file.filename,
                        originalName: file.originalname,
                        filePath: file.path,
                        fileSize: file.size,
                        mimeType: file.mimetype,
                        security: {
                            encrypted: false,
                            reason: "encryption_failed"
                        }
                    };
                }
            })
        );

        // Attach encrypted file info to request for medicalRecords route
        req.encryptedAttachments = encryptedAttachments;
        
        // Add security headers to response
        res.setHeader('X-Content-Encryption', 'AES-256-GCM');
        res.setHeader('X-KeyVault-Simulation', 'enabled');
        
        next();
    } catch (error) {
        console.error('❌ Secure upload middleware critical error:', error);
        // Critical error - proceed without encryption but log security incident
        req.encryptedAttachments = req.files.map(file => ({
            filename: file.filename,
            originalName: file.originalname,
            filePath: file.path,
            fileSize: file.size,
            mimeType: file.mimetype,
            security: {
                encrypted: false,
                reason: "middleware_failure"
            }
        }));
        
        // Log security incident
        console.error('🚨 SECURITY INCIDENT: File encryption middleware failed');
        next();
    }
};

export default secureUpload;