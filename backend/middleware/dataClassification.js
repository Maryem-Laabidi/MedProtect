import ClassificationService from '../services/classificationService.js';

const dataClassification = async (req, res, next) => {
    // Only process medical record creation/updates
    if (req.method === 'POST' && req.originalUrl.includes('/medical-records')) {
        try {
            const { recordType, content, patientConditions = [] } = req.body;
            
            // Classify the medical record
            const classification = ClassificationService.classifyMedicalRecord(
                recordType,
                content,
                patientConditions
            );

            // Add classification to request for route handler
            req.recordClassification = classification;
            
            // Log classification for security monitoring
            console.log(`🏷️ Azure Information Protection: Record classified as ${classification.label}`);

            // Add security headers for frontend
            res.setHeader('X-Data-Classification', classification.label);
            res.setHeader('X-Encryption-Required', classification.encryptionRequired);

        } catch (error) {
            console.error('❌ Data classification error:', error);
            // Continue without classification but log the incident
            req.recordClassification = null;
        }
    }
    
    next();
};

export default dataClassification;