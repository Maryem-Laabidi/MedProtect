import mongoose from "mongoose";

const securityEventSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'failed_login',
      'failed_mfa', 
      'suspicious_access',
      'successful_login',
      'password_change',
      'user_locked',
      'security_scan',
      'key_rotation',
      'api_error_response',
      'api_access',
      'data_access',
      'file_access',
      'encryption_event',
      'authentication_event',
      'authorization_event'
    ]
  },
  severity: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high', 'critical']
  },
  message: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  ipAddress: String,
  userAgent: String,
  metadata: mongoose.Schema.Types.Mixed,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
securityEventSchema.index({ timestamp: -1 });
securityEventSchema.index({ type: 1 });
securityEventSchema.index({ severity: 1 });

export default mongoose.model("SecurityEvent", securityEventSchema);