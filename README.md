# 🏥 MedProtect - Secure Medical Portal

<div align="center">

![React](https://img.shields.io/badge/React-18.2.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-Express-green)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-green)
![Security](https://img.shields.io/badge/Security-Enterprise--grade-red)
![License](https://img.shields.io/badge/License-MIT-yellow)

**A secure medical web portal for private clinics handling sensitive health data**

</div>

## 📋 Overview

MedProtect is a secure medical web portal designed for private clinics to manage highly sensitive health data with enterprise-grade security measures.

### 🎯 Key Features
- **Role-Based Access Control**: Patient, Doctor, and Admin interfaces
- **AES-256 Encryption**: Military-grade encryption for files and database
- **Multi-Factor Authentication**: TOTP-based MFA system
- **Automated Data Classification**: 4-level sensitivity classification
- **Comprehensive Audit Logging**: HIPAA-compliant access tracking
- **Azure Security Simulation**: Key Vault, Sentinel, and Private Link

## 🛡️ Security Architecture

### 🔐 Data Protection
- **AES-256-GCM**: File encryption for medical attachments
- **AES-256-CBC**: Database field encryption
- **bcrypt**: Password hashing with 12 rounds
- **JWT Tokens**: Secure session management

### 🔒 Access Control
- **RBAC System**: Hierarchical role permissions
- **MFA Integration**: Microsoft Authenticator compatible
- **Network Security**: IP whitelisting and isolation
- **Rate Limiting**: Role-based API protection

## 🏗️ Technical Stack

**Frontend:**
- React.js
- Axios for API calls
- CSS Modules

**Backend:**
- Node.js with Express
- MongoDB with Mongoose
- JWT Authentication
- Crypto module for encryption

## ⚡ Quick Start

### Prerequisites
- Node.js 16+
- MongoDB
- Git

### Installation
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev

### Default Accounts
Admin: admin / admin123
Doctor: dr.khalid / doctor123
Patient: patient.ahmed / patient123
``` 


## 📁 Project Structure

```
MedProtect/
├── backend/
│   ├── middleware/      # Security middleware
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API endpoints
│   └── services/        # Business logic
├── frontend/
│   └── src/
│       ├── components/  # React components
│       └── pages/       # Application views
└── documentation/       # Project docs
```


## 🔧 Key Security Components

- **`keyVaultService.js`** - AES-256 encryption service
- **`dataClassification.js`** - Automated sensitivity classification  
- **`apiSecurity.js`** - Rate limiting & threat detection
- **`mfaService.js`** - TOTP authentication
- **`securityLogger.js`** - Comprehensive audit logging

## 📊 Compliance Features

- HIPAA-ready encryption and access controls
- GDPR-compliant data protection
- Medical confidentiality enforcement
- Complete audit trails for all access
