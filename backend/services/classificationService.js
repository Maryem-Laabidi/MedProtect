import MedicalRecord from '../models/MedicalRecord.js';

class ClassificationService {
    static classifyMedicalRecord(recordType, content = '', patient = {}) {
        // Map based on YOUR actual record types from your model enum
        const sensitivityMap = {
            'lab_result': 'ROUTINE',
            'prescription': 'SENSITIVE',
            'consultation': 'SENSITIVE', 
            'radiology': 'SENSITIVE',
            'surgery': 'HIGHLY_SENSITIVE',
            'other': 'SENSITIVE'
        };

        const baseSensitivity = sensitivityMap[recordType] || 'SENSITIVE';
        
        // Adjust based on content
        const contentModifier = this.getContentModifier(content);
        const finalLevel = this.calculateFinalLevel(baseSensitivity, contentModifier);

        return this.getClassificationDetails(finalLevel);
    }

    static getContentModifier(content) {
        if (!content || content === '') return 'STANDARD';
        
        const highRiskKeywords = [
            'hiv', 'aids', 'mental', 'psychiatric', 'suicide', 'depression',
            'std', 'hepatitis', 'tuberculosis', 'cancer', 'oncology',
            'substance', 'abuse', 'addiction', 'overdose',
            'bipolar', 'schizophrenia', 'therapy', 'counseling'
        ];
        
        const contentLower = content.toLowerCase();
        const hasHighRisk = highRiskKeywords.some(keyword => 
            contentLower.includes(keyword)
        );
        
        return hasHighRisk ? 'HIGH_RISK' : 'STANDARD';
    }

    static calculateFinalLevel(baseSensitivity, contentModifier) {
        if (contentModifier === 'HIGH_RISK') {
            const elevationMap = {
                'ROUTINE': 'SENSITIVE',
                'SENSITIVE': 'HIGHLY_SENSITIVE', 
                'HIGHLY_SENSITIVE': 'RESTRICTED',
                'RESTRICTED': 'RESTRICTED'
            };
            return elevationMap[baseSensitivity];
        }
        return baseSensitivity;
    }

    static getClassificationDetails(level) {
        const classifications = {
            'ROUTINE': {
                label: 'INTERNAL',
                level: 'ROUTINE',
                color: 'blue',
                icon: '📋',
                description: 'Routine medical data - Internal use only',
                examples: ['Lab Results', 'Routine Tests']
            },
            'SENSITIVE': {
                label: 'CONFIDENTIAL',
                level: 'SENSITIVE', 
                color: 'orange',
                icon: '🔒',
                description: 'Confidential medical information',
                examples: ['Consultations', 'Prescriptions', 'Radiology']
            },
            'HIGHLY_SENSITIVE': {
                label: 'HIGHLY_CONFIDENTIAL',
                level: 'HIGHLY_SENSITIVE',
                color: 'red', 
                icon: '🚨',
                description: 'Highly sensitive medical data - Strict access controls',
                examples: ['Surgery Reports', 'Emergency Visits']
            },
            'RESTRICTED': {
                label: 'RESTRICTED',
                level: 'RESTRICTED',
                color: 'purple',
                icon: '⚡', 
                description: 'Restricted medical data - Special authorization required',
                examples: ['Mental Health', 'HIV/STD Tests']
            }
        };

        return classifications[level] || classifications['SENSITIVE'];
    }

    // Get display names for your record types
    static getRecordTypeDisplayName(recordType) {
        const displayNames = {
            'lab_result': 'Lab Results',
            'prescription': 'Prescriptions', 
            'consultation': 'Consultations',
            'radiology': 'Radiology',
            'surgery': 'Surgery Reports',
            'other': 'Other Medical Records'
        };
        return displayNames[recordType] || recordType;
    }

    // Apply classification to existing records - FIXED FOR ENCRYPTION
    static async classifyExistingRecords() {
        console.log('🔍 Classifying existing medical records...');
        
        const records = await MedicalRecord.find({});
        let classifiedCount = 0;

        for (let record of records) {
            let contentForClassification = '';
            
            // Handle encrypted content
            if (record.encryptedFields?.content?.data) {
                // Extract content from encrypted data for classification
                const encryptedContent = record.encryptedFields.content.data;
                contentForClassification = encryptedContent.replace('encrypted:', '');
            } else if (record.content) {
                // Use plain content if available
                contentForClassification = record.content;
            }

            const classification = this.classifyMedicalRecord(
                record.recordType,
                contentForClassification,
                record.patient
            );

            // Update classification field
            const needsUpdate = !record.classification || 
                               record.classification.label !== classification.label ||
                               record.classification.level !== classification.level;

            if (needsUpdate) {
                record.classification = {
                    label: classification.label,
                    level: classification.level,
                    appliedAt: new Date(),
                    automated: true
                };
                
                // Use updateOne to avoid triggering encryption middleware again
                await MedicalRecord.updateOne(
                    { _id: record._id },
                    { 
                        $set: { 
                            classification: record.classification 
                        } 
                    }
                );
                classifiedCount++;
                console.log(`📄 Classified: ${record.recordType} → ${classification.label}`);
            }
        }

        console.log(`✅ Successfully classified ${classifiedCount} medical records`);
        return classifiedCount;
    }

    // Classify a single record (for new records) - FIXED FOR ENCRYPTION
    static async classifySingleRecord(recordData) {
        // Classify BEFORE encryption happens
        const classification = this.classifyMedicalRecord(
            recordData.recordType,
            recordData.content || '',
            recordData.patient
        );

        return {
            classification: {
                label: classification.label,
                level: classification.level,
                appliedAt: new Date(),
                automated: true
            }
        };
    }

    // Get classification statistics
    static async getClassificationStats() {
        const stats = await MedicalRecord.aggregate([
            {
                $group: {
                    _id: '$classification.label',
                    count: { $sum: 1 },
                    recordTypes: { 
                        $push: '$recordType'
                    }
                }
            },
            {
                $project: {
                    classification: '$_id',
                    count: 1,
                    recordTypes: 1,
                    _id: 0
                }
            }
        ]);

        return stats;
    }

    // Get record type distribution
    static async getRecordTypeDistribution() {
        const distribution = await MedicalRecord.aggregate([
            {
                $group: {
                    _id: '$recordType',
                    count: { $sum: 1 },
                    classifications: {
                        $push: '$classification.label'
                    }
                }
            },
            {
                $project: {
                    recordType: '$_id',
                    count: 1,
                    displayName: {
                        $switch: {
                            branches: [
                                { case: { $eq: ['$_id', 'lab_result'] }, then: 'Lab Results' },
                                { case: { $eq: ['$_id', 'prescription'] }, then: 'Prescriptions' },
                                { case: { $eq: ['$_id', 'consultation'] }, then: 'Consultations' },
                                { case: { $eq: ['$_id', 'radiology'] }, then: 'Radiology' },
                                { case: { $eq: ['$_id', 'surgery'] }, then: 'Surgery Reports' },
                                { case: { $eq: ['$_id', 'other'] }, then: 'Other Records' }
                            ],
                            default: '$_id'
                        }
                    },
                    _id: 0
                }
            },
            { $sort: { count: -1 } }
        ]);

        return distribution;
    }

    // Reclassify all records (force update) - FIXED FOR ENCRYPTION
    static async reclassifyAllRecords() {
        console.log('🔄 Reclassifying all medical records...');
        
        const records = await MedicalRecord.find({});
        let updatedCount = 0;

        for (let record of records) {
            let contentForClassification = '';
            
            // Handle encrypted content
            if (record.encryptedFields?.content?.data) {
                const encryptedContent = record.encryptedFields.content.data;
                contentForClassification = encryptedContent.replace('encrypted:', '');
            } else if (record.content) {
                contentForClassification = record.content;
            }

            const classification = this.classifyMedicalRecord(
                record.recordType,
                contentForClassification,
                record.patient
            );

            // Always update classification using direct update
            await MedicalRecord.updateOne(
                { _id: record._id },
                { 
                    $set: { 
                        'classification.label': classification.label,
                        'classification.level': classification.level,
                        'classification.appliedAt': new Date(),
                        'classification.automated': true
                    } 
                }
            );
            updatedCount++;
        }

        console.log(`✅ Successfully reclassified ${updatedCount} medical records`);
        return updatedCount;
    }

    // Classify and get recommendations for a record
    static async classifyWithRecommendations(recordData) {
        const classification = this.classifyMedicalRecord(
            recordData.recordType,
            recordData.content || '',
            recordData.patient
        );

        const recommendations = this.getSecurityRecommendations(classification.level);

        return {
            classification: {
                label: classification.label,
                level: classification.level,
                appliedAt: new Date(),
                automated: true
            },
            recommendations,
            confidence: 'HIGH'
        };
    }

    static getSecurityRecommendations(level) {
        const recommendations = {
            'ROUTINE': [
                'Standard access controls',
                'Internal department access only',
                'Regular audit logging'
            ],
            'SENSITIVE': [
                'Role-based access control',
                'Encryption at rest and in transit',
                'Detailed audit logging'
            ],
            'HIGHLY_SENSITIVE': [
                'Strict role-based access control',
                'Multi-factor authentication for access',
                'Comprehensive audit trail',
                'Regular access reviews'
            ],
            'RESTRICTED': [
                'Special authorization required',
                'Multi-level approval process',
                'Enhanced encryption',
                'Real-time monitoring',
                'Limited retention period'
            ]
        };

        return recommendations[level] || recommendations['SENSITIVE'];
    }
}

export default ClassificationService;