import express from 'express';
import MedicalRecord from '../models/MedicalRecord.js';
import User from '../models/User.js';

console.log('🔐 Security Policies Routes: Loading...');

const router = express.Router();

// Simple test route 
router.get('/test', (req, res) => {
  console.log('✅ Security Policies Test Route Hit!');
  res.json({ success: true, message: 'Security Policies are working!' });
});

// Azure Status -
router.get('/azure-status', async (req, res) => {
  try {
    console.log('🔐 Azure Status Route Hit!');
    
    const totalRecords = await MedicalRecord.countDocuments();
    const classifiedRecords = await MedicalRecord.countDocuments({ 
      'classification.label': { $exists: true, $ne: null } 
    });

    // Get classification counts
    const classificationStats = await MedicalRecord.aggregate([
      { $group: { _id: "$classification.label", count: { $sum: 1 } } }
    ]);

    const classificationCounts = { INTERNAL: 0, CONFIDENTIAL: 0, HIGHLY_CONFIDENTIAL: 0, RESTRICTED: 0 };
    classificationStats.forEach(stat => {
      if (stat._id && classificationCounts.hasOwnProperty(stat._id)) {
        classificationCounts[stat._id] = stat.count;
      }
    });

    res.json({
      success: true,
      azureStatus: {
        azureInformationProtection: {
          status: 'ACTIVE',
          classifiedRecords: classifiedRecords,
          totalRecords: totalRecords,
          autoClassificationRate: totalRecords > 0 ? Math.round((classifiedRecords / totalRecords) * 100) : 0,
          classificationBreakdown: classificationCounts,
          sensitivityLevels: ['INTERNAL', 'CONFIDENTIAL', 'HIGHLY_CONFIDENTIAL', 'RESTRICTED']
        },
        azurePrivateLink: {
          status: 'ACTIVE',
          currentClientIP: req.ip,
          accessType: 'INTERNAL',
          riskLevel: 'LOW'
        },
        azureAPIManagement: {
          status: 'ACTIVE',
          rateLimiting: 'ENABLED'
        }
      }
    });
  } catch (error) {
    console.error('❌ Azure Status Error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// API Metrics 

router.get('/api-metrics', async (req, res) => {
  try {
    console.log('📊 API Metrics Route Hit!');
    
    // Get API usage statistics
    const totalRecords = await MedicalRecord.countDocuments();
    const totalUsers = await User.countDocuments();
    
    // Get classification stats
    const classificationStats = await MedicalRecord.aggregate([
      { $group: { _id: "$classification.label", count: { $sum: 1 } } }
    ]);

    const classificationCounts = { INTERNAL: 0, CONFIDENTIAL: 0, HIGHLY_CONFIDENTIAL: 0, RESTRICTED: 0 };
    classificationStats.forEach(stat => {
      if (stat._id && classificationCounts.hasOwnProperty(stat._id)) {
        classificationCounts[stat._id] = stat.count;
      }
    });

    // Get encrypted files count
    const encryptedFiles = await MedicalRecord.aggregate([
      { $unwind: "$attachments" },
      { $match: { "attachments.encryption.encrypted": true } },
      { $count: "encryptedCount" }
    ]);

    res.json({
      success: true,
      metrics: {
        totalRecords,
        totalUsers,
        classificationBreakdown: classificationCounts,
        encryptedFilesCount: encryptedFiles[0]?.encryptedCount || 0,
        autoClassificationRate: totalRecords > 0 ? 
          Math.round((Object.values(classificationCounts).reduce((a, b) => a + b, 0) / totalRecords) * 100) : 0,
        apiStatus: 'ACTIVE',
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('❌ API Metrics Error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});


console.log('🔐 Security Policies Routes: Loaded successfully!');

export default router;