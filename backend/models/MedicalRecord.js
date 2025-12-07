import mongoose from "mongoose";

const medicalRecordSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: true
  },
  recordType: {
    type: String,
    enum: ["lab_result", "prescription", "consultation", "radiology", "surgery", "other"],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  content: {
    type: String
  },
  // ENCRYPTED FIELDS - Azure Key Vault Simulation
  encryptedFields: {
    description: {
      data: String,    // encrypted description
      iv: String       // initialization vector
    },
    content: {
      data: String,    // encrypted content
      iv: String
    }
  },
  // File attachment fields with encryption metadata
  attachments: [{
    filename: String,
    originalName: String,
    filePath: String,
    fileSize: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    // Azure Key Vault Simulation - Encryption metadata
    encryption: {
      iv: String,        // initialization vector
      authTag: String,   // authentication tag for GCM
      encrypted: { type: Boolean, default: false },
      keyVersion: { type: String, default: "v1" }
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  department: {
    type: String,
    required: true
  },
  accessLog: [{
    accessedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    accessedAt: { type: Date, default: Date.now },
    action: { type: String, enum: ["viewed", "downloaded", "modified", "decrypted"] },
    ipAddress: String,
    userAgent: String
  }],
  isConfidential: {
    type: Boolean,
    default: false
  },

   
classification: {
  label: {
    type: String,
    enum: ['INTERNAL', 'CONFIDENTIAL', 'HIGHLY_CONFIDENTIAL', 'RESTRICTED'],
    default: 'INTERNAL'
  },
  level: {
    type: String,
    enum: ['ROUTINE', 'SENSITIVE', 'HIGHLY_SENSITIVE', 'RESTRICTED'],
    default: 'ROUTINE'
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  automated: {
    type: Boolean,
    default: true
  }
},
  // Security metadata
  security: {
    encryptionEnabled: { type: Boolean, default: true },
    lastEncryptedAt: Date,
    encryptionKeyId: { type: String, default: "medprotect-file-key" }
  }
  
}, { 
  timestamps: true 
});

// Middleware to encrypt sensitive data before save
medicalRecordSchema.pre('save', function(next) {
  if (this.isModified('description') || this.isModified('content')) {
    this.encryptSensitiveFields();
  }
  next();
});

// Instance method to encrypt sensitive fields
medicalRecordSchema.methods.encryptSensitiveFields = function() {
  if (typeof this.description === 'string' && this.description.length > 0) {
    this.encryptedFields = this.encryptedFields || {};
    this.encryptedFields.description = {
      data: `encrypted:${this.description}`, 
      iv: 'simulated_iv'
    };
    this.description = undefined; 
  }
  
  if (typeof this.content === 'string' && this.content.length > 0) {
    this.encryptedFields = this.encryptedFields || {};
    this.encryptedFields.content = {
      data: `encrypted:${this.content}`, 
      iv: 'simulated_iv'
    };
    this.content = undefined; 
  }
};

/*
medicalRecordSchema.methods.encryptSensitiveFields = async function() {
  // Import KeyVaultService
  const KeyVaultService = (await import('../services/keyVaultService.js')).default;
  
  if (typeof this.content === 'string' && this.content.length > 0) {
    // Use REAL encryption from KeyVaultService
    const encrypted = KeyVaultService.encryptField(this.content);
    
    this.encryptedFields = this.encryptedFields || {};
    this.encryptedFields.content = {
      data: encrypted.data,  // Real encrypted data
      iv: encrypted.iv       // Real initialization vector
    };
    
    // IMPORTANT: Completely remove plaintext
    this.content = null; // Set to null instead of undefined
  }
  
  // Same for description
  if (typeof this.description === 'string' && this.description.length > 0) {
    const encrypted = KeyVaultService.encryptField(this.description);
    
    this.encryptedFields = this.encryptedFields || {};
    this.encryptedFields.description = {
      data: encrypted.data,
      iv: encrypted.iv
    };
    
    this.description = null;
  }
};
 */

// Instance method to decrypt sensitive fields
medicalRecordSchema.methods.decryptSensitiveFields = function() {
  if (this.encryptedFields?.description?.data) {
    this.description = this.encryptedFields.description.data.replace('encrypted:', ''); // Placeholder
  }
  
  if (this.encryptedFields?.content?.data) {
    this.content = this.encryptedFields.content.data.replace('encrypted:', ''); // Placeholder
  }
  return this;
};

// Static method to find and decrypt records
medicalRecordSchema.statics.findAndDecrypt = function(query) {
  return this.find(query).then(records => {
    return records.map(record => record.decryptSensitiveFields());
  });
};

// Virtual for security audit
medicalRecordSchema.virtual('securitySummary').get(function() {
  return {
    totalAttachments: this.attachments.length,
    encryptedAttachments: this.attachments.filter(a => a.encryption?.encrypted).length,
    lastAccessed: this.accessLog.length > 0 ? this.accessLog[this.accessLog.length - 1].accessedAt : null,
    accessCount: this.accessLog.length
  };
});

export default mongoose.model("MedicalRecord", medicalRecordSchema);