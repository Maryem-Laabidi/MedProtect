// backend/server.js
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import accessRequestsRouter from "./routes/access-requests.js";
import multer from "multer";
import securityRoutes from './routes/security.js';
import dataClassification from './middleware/dataClassification.js';
import networkIsolation from './middleware/ipWhitelist.js';
import { apiSecurity } from './middleware/apiSecurity.js';
import securityPoliciesRoutes from './routes/security-policies.js';




// For ES6 modules, we need to create __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// ===== AZURE SECURITY FEATURES MIDDLEWARE =====
// 1. Network Security Isolation (Azure Private Link) - FIRST!
app.use(networkIsolation);

// 2. API Security & Throttling (Azure API Management)
app.use(apiSecurity.securityHeaders);
app.use(apiSecurity.apiAnalytics);
app.use(apiSecurity.detectSuspiciousPatterns);

// Apply rate limiting to specific routes
app.use('/api/medical-records', apiSecurity.medicalRecordsLimiter);
app.use('/api/medical-records/:recordId/attachments', apiSecurity.fileDownloadLimiter);
app.use('/api/', apiSecurity.createRoleBasedLimiter());

// 3. Data Classification (Azure Information Protection)
app.use(dataClassification);


// Serve uploaded files statically
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Connexion à MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/medProtect", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected to MedProtect"))
.catch(err => console.log("MongoDB connection error:", err));

// Test route
app.get("/", (req, res) => {
  res.send("MedProtect Secure Medical Portal API is running...");
});


app.use('/api/security-policies', securityPoliciesRoutes);

// Routes - IMPORT ALL ROUTES AS ES6 MODULES
import authRoutes from "./routes/auth.js";
app.use("/api/auth", authRoutes);

import userRoutes from "./routes/users.js";
app.use("/api/users", userRoutes);

import patientRoutes from "./routes/patients.js";
app.use("/api/patients", patientRoutes);

import medicalRecordRoutes from "./routes/medicalRecords.js";
app.use("/api/medical-records", medicalRecordRoutes);

import departmentRoutes from "./routes/departments.js";
app.use("/api/departments", departmentRoutes);

import mfaRoutes from './routes/mfa.js';
app.use('/api/mfa', mfaRoutes);

app.use("/api/access-requests", accessRequestsRouter);

app.use('/api/security', securityRoutes);

import networkSecurity from './routes/network-security.js';

app.use('/api/security', networkSecurity);

// Error handling middleware for Multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 5 files allowed.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field.'
      });
    }
  }
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next();
});

// Démarrer le serveur
app.listen(5000, () => console.log("MedProtect Backend running on http://localhost:5000"));