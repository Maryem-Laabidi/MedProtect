import React, { useState, useEffect } from "react";
import axios from "axios";
import "./AdminDashboard.css";
import "../components/AzureSecurityFeatures.css";
import DataClassificationBadge from "../components/DataClassificationBadge.jsx";
import NetworkSecurityDashboard from "../components/NetworkSecurityDashboard.jsx";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("patients");
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);

    const [networkStatus, setNetworkStatus] = useState(null);

  const [securityStats, setSecurityStats] = useState({
    encryptedFilesCount: 0,
    todayAccessCount: 0,
    suspiciousActivities: 0,
    mfaEnabledCount: 0,
    failedLogins24h: 0,       
    totalEvents24h: 0 
  });
  const [securityEvents, setSecurityEvents] = useState([]);

  const [securityLogs, setSecurityLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  // Modal states
  const [showEditDoctorModal, setShowEditDoctorModal] = useState(false);
  const [showEditPatientModal, setShowEditPatientModal] = useState(false);
  const [showPatientDetailsModal, setShowPatientDetailsModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [deleteType, setDeleteType] = useState(""); // "doctor" or "patient"

  // New user form state
  const [newUser, setNewUser] = useState({
  username: "",
  password: "",
  role: "doctor",
  profile: {
    firstName: "",
    lastName: "",
    email: "",
    department: "",
    specialization: "",
    // Add patient-specific fields
    dateOfBirth: "",
    gender: "",
    bloodType: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "",
    insuranceProvider: "",
    insuranceNumber: ""
  }
});

  // Edit forms state
  const [editDoctor, setEditDoctor] = useState({
    username: "",
    role: "",
    profile: {
      firstName: "",
      lastName: "",
      email: "",
      department: "",
      specialization: ""
    },
    isActive: true
  });

  const [editPatient, setEditPatient] = useState({
    personalInfo: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "",
      bloodType: "",
      phone: "",
      address: ""
    },
    medicalInfo: {
      allergies: [],
      chronicConditions: [],
      medications: [],
      notes: ""
    },
    department: ""
  });

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    fetchPatients();
    fetchDoctors();
    fetchDepartments();
  }, []);
  
  useEffect(() => {
  if (activeTab === "security") {
    fetchSecurityStats();
    fetchSecurityEvents();
    fetchAzureSecurityStatus(); 
  }
}, [activeTab]);
  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/patients", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatients(response.data.patients);
    } catch (error) {
      console.error("Error fetching patients:", error);
    }
  };

  const fetchDoctors = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/users/doctors", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDoctors(response.data.doctors);
    } catch (error) {
      console.error("Error fetching doctors:", error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/departments", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDepartments(response.data.departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      // If departments endpoint doesn't exist, use default departments
      setDepartments([
        { _id: "1", name: "Cardiologie" },
        { _id: "2", name: "Neurologie" },
        { _id: "3", name: "Pédiatrie" },
        { _id: "4", name: "Chirurgie" },
        { _id: "5", name: "Médecine Générale" },
        { _id: "6", name: "Psychologie" }

      ]);
    }
  };

  const handleCreateUser = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    const token = localStorage.getItem("token");
    
    if (newUser.role === "patient") {
      // For patients, we need to create both User and Patient records
      const userResponse = await axios.post("http://localhost:5000/api/users", newUser, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Then create the patient record with additional info
      const patientData = {
        user: userResponse.data.user._id,
        personalInfo: {
          firstName: newUser.profile.firstName,
          lastName: newUser.profile.lastName,
          dateOfBirth: newUser.profile.dateOfBirth || new Date(),
          gender: newUser.profile.gender || "Other",
          bloodType: newUser.profile.bloodType || "",
          emergencyContact: {
            name: newUser.profile.emergencyContactName || "",
            phone: newUser.profile.emergencyContactPhone || "",
            relationship: newUser.profile.emergencyContactRelationship || ""
          }
        },
        medicalInfo: {
          allergies: newUser.profile.allergies || [],
          chronicConditions: newUser.profile.chronicConditions || [],
          medications: newUser.profile.medications || [],
          insuranceProvider: newUser.profile.insuranceProvider || "",
          insuranceNumber: newUser.profile.insuranceNumber || ""
        },
        department: newUser.profile.department || "General"
      };
      
      await axios.post("http://localhost:5000/api/patients", patientData, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } else {
      // For doctors, just create user
      await axios.post("http://localhost:5000/api/users", newUser, {
        headers: { Authorization: `Bearer ${token}` }
      });
    }

    // Reset form and refresh data
    setNewUser({
      username: "",
      password: "",
      role: "doctor",
      profile: {
        firstName: "",
        lastName: "",
        email: "",
        department: "",
        specialization: "",
        // Add patient-specific fields
        dateOfBirth: "",
        gender: "",
        bloodType: "",
        emergencyContactName: "",
        emergencyContactPhone: "",
        emergencyContactRelationship: "",
        allergies: [],
        chronicConditions: [],
        medications: [],
        insuranceProvider: "",
        insuranceNumber: ""
      }
    });
    
    fetchDoctors();
    fetchPatients(); // Refresh patients list too
    alert("Utilisateur créé avec succès !");
  } catch (error) {
    console.error("Error creating user:", error);
    alert(error.response?.data?.message || "Erreur lors de la création de l'utilisateur");
  } finally {
    setLoading(false);
  }
};

  const handleViewPatientDetails = (patient) => {
    setSelectedPatient(patient);
    setShowPatientDetailsModal(true);
  };

  const handleEditDoctor = (doctor) => {
    setSelectedDoctor(doctor);
    setEditDoctor({
      username: doctor.username,
      role: doctor.role,
      profile: {
        firstName: doctor.profile.firstName,
        lastName: doctor.profile.lastName,
        email: doctor.profile.email,
        department: doctor.profile.department,
        specialization: doctor.profile.specialization
      },
      isActive: doctor.isActive
    });
    setShowEditDoctorModal(true);
  };

  const handleUpdateDoctor = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.put(`http://localhost:5000/api/users/${selectedDoctor._id}`, editDoctor, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowEditDoctorModal(false);
      fetchDoctors();
      alert("Médecin mis à jour avec succès !");
    } catch (error) {
      console.error("Error updating doctor:", error);
      alert(error.response?.data?.message || "Erreur lors de la mise à jour du médecin");
    }
  };

 const handleEditPatient = (patient) => {
  setSelectedPatient(patient);
  setEditPatient({
    personalInfo: {
      firstName: patient.personalInfo.firstName,
      lastName: patient.personalInfo.lastName,
      dateOfBirth: patient.personalInfo.dateOfBirth,
      gender: patient.personalInfo.gender,
      bloodType: patient.personalInfo.bloodType,
      phone: patient.personalInfo.phone,
      address: patient.personalInfo.address,
      emergencyContact: patient.personalInfo.emergencyContact || {
        name: "",
        phone: "",
        relationship: ""
      }
    },
    medicalInfo: {
      allergies: patient.medicalInfo.allergies || [],
      chronicConditions: patient.medicalInfo.chronicConditions || [],
      medications: patient.medicalInfo.medications || [],
      notes: patient.medicalInfo.notes || ""
    },
    department: patient.department
  });
  setShowEditPatientModal(true);
};

  const handleUpdatePatient = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.put(`http://localhost:5000/api/patients/${selectedPatient._id}`, editPatient, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowEditPatientModal(false);
      fetchPatients();
      alert("Patient mis à jour avec succès !");
    } catch (error) {
      console.error("Error updating patient:", error);
      alert(error.response?.data?.message || "Erreur lors de la mise à jour du patient");
    }
  };

  const handleDeleteDoctor = (doctor) => {
    setSelectedDoctor(doctor);
    setDeleteType("doctor");
    setShowDeleteConfirmation(true);
  };

  const handleDeletePatient = (patient) => {
    setSelectedPatient(patient);
    setDeleteType("patient");
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem("token");
      
      if (deleteType === "doctor") {
        await axios.delete(`http://localhost:5000/api/users/${selectedDoctor._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchDoctors();
        alert("Médecin supprimé avec succès !");
      } else if (deleteType === "patient") {
        await axios.delete(`http://localhost:5000/api/patients/${selectedPatient._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchPatients();
        alert("Patient supprimé avec succès !");
      }

      setShowDeleteConfirmation(false);
    } catch (error) {
      console.error("Error deleting:", error);
      alert(error.response?.data?.message || "Erreur lors de la suppression");
    }
  };

  // Group doctors by department
  const doctorsByDepartment = doctors.reduce((acc, doctor) => {
    const dept = doctor.profile.department || "Non assigné";
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(doctor);
    return acc;
  }, {});

  // === SECURITY FUNCTIONS HERE  ===
 const fetchSecurityEvents = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get("http://localhost:5000/api/security/events?limit=15", {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // ✅ FIXED: Filter both auth AND mfa API errors
    if (response.data.success && response.data.events) {
      const filteredEvents = response.data.events.filter(event => 
        !(event.type === 'api_error_response' && (
          event.message.includes('/api/auth/') || 
          event.message.includes('/api/mfa/')
        ))
      );
      setSecurityEvents(filteredEvents);
    } else {
      // If no events from backend, show clean message
      setSecurityEvents([{
        _id: `refresh-${Date.now()}`,
        type: 'info',
        severity: 'low',
        message: `No recent security events`,
        timestamp: new Date(),
        ipAddress: 'System'
      }]);
    }
  } catch (error) {
    console.log("Could not fetch new events, clearing old ones");
    setSecurityEvents([{
      _id: `error-${Date.now()}`,
      type: 'error',
      severity: 'medium',
      message: 'Could not fetch security events',
      timestamp: new Date(),
      ipAddress: 'System'
    }]);
  }
};


const fetchSecurityStats = async () => {
  try {
    const token = localStorage.getItem("token");
    
    // Try to get comprehensive security dashboard data
    const response = await axios.get("http://localhost:5000/api/security/dashboard", {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const overview = response.data.overview;
    setSecurityStats({
      encryptedFilesCount: overview.encryption?.encryptedFiles || 0,
      todayAccessCount: overview.access?.last24h || 0,
      suspiciousActivities: overview.suspiciousActivities || 0,
      mfaEnabledCount: overview.users?.mfaEnabled || 0,
      failedLogins24h: overview.failedLogins24h || 0,
      totalEvents24h: overview.totalEvents24h || 0
    });
    
    // Also set the real security events
    if (overview.recentEvents) {
      setSecurityEvents(overview.recentEvents);
    }
    
  } catch (error) {
    console.error("Error fetching security dashboard:", error);
    
    // Fallback to individual endpoints
    try {
      const token = localStorage.getItem("token");
      const statsResponse = await axios.get("http://localhost:5000/api/security/stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSecurityStats(statsResponse.data.stats);
      
      const eventsResponse = await axios.get("http://localhost:5000/api/security/events?limit=10", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSecurityEvents(eventsResponse.data.events);
      
    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError);
      // Final fallback to demo data
      setSecurityStats({
        encryptedFilesCount: 24,
        todayAccessCount: 156,
        suspiciousActivities: 3,
        mfaEnabledCount: 8,
        failedLogins24h: 2,
        totalEvents24h: 15
      });
    }
  }
};

const handleRunSecurityScan = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.post("http://localhost:5000/api/security/audit", {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // 
    const auditEvent = {
      _id: `audit-${Date.now()}`,
      type: 'success',
      severity: 'low',
      message: 'Security audit completed successfully',
      timestamp: new Date().toISOString(), 
      ipAddress: 'System'
    };
    
    //   limit to 10 events
    setSecurityEvents(prev => [auditEvent, ...prev.slice(0, 9)]);
    
    // Refresh stats after audit
    fetchSecurityStats();
    
  } catch (error) {
    console.error("Error running security scan:", error);
    
    const errorEvent = {
      _id: `audit-error-${Date.now()}`,
      type: 'error',
      severity: 'medium',
      message: 'Security audit failed',
      timestamp: new Date().toISOString(),
      ipAddress: 'System'
    };
    
    setSecurityEvents(prev => [errorEvent, ...prev.slice(0, 9)]);
  }
};

const handleRotateEncryptionKeys = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.post("http://localhost:5000/api/security/rotate-keys", {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    setSecurityEvents(prev => [{
      type: 'info',
      message: 'Encryption keys rotated successfully',
      timestamp: new Date().toISOString()
    }, ...prev.slice(0, 9)]);
    
    alert("Encryption keys rotated!");
  } catch (error) {
    console.error("Error rotating keys:", error);
    setSecurityEvents(prev => [{
      type: 'error',
      message: 'Key rotation failed',
      timestamp: new Date().toISOString()
    }, ...prev.slice(0, 9)]);
  }
};


const handleViewSecurityLogs = async () => {
  setLogsLoading(true);
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get("http://localhost:5000/api/security/logs?limit=20", {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    setSecurityLogs(response.data.logs);
    setShowLogs(true);
    
    setSecurityEvents(prev => [{
      type: 'info',
      message: `Loaded ${response.data.logs.length} security logs`,
      timestamp: new Date().toISOString()
    }, ...prev.slice(0, 9)]);
    
  } catch (error) {
    console.error("Error fetching security logs:", error);
    
    // Create demo logs for testing
    const demoLogs = [
      {
        _id: "1",
        action: "viewed",
        accessedBy: "dr_smith",
        accessedAt: new Date(),
        ipAddress: "192.168.1.100",
        recordId: "record_123",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      {
        _id: "2", 
        action: "downloaded",
        accessedBy: "patient_marie",
        accessedAt: new Date(Date.now() - 300000),
        ipAddress: "192.168.1.150",
        recordId: "record_456",
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)"
      },
      {
        _id: "3",
        action: "decrypted",
        accessedBy: "dr_johnson",
        accessedAt: new Date(Date.now() - 600000),
        ipAddress: "192.168.1.200",
        recordId: "record_789",
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
      }
    ];
    
    setSecurityLogs(demoLogs);
    setShowLogs(true);
    
    setSecurityEvents(prev => [{
      type: 'info',
      message: 'Loaded demo security logs (backend not connected)',
      timestamp: new Date().toISOString()
    }, ...prev.slice(0, 9)]);
  } finally {
    setLogsLoading(false);
  }
};


// === END SECURITY FUNCTIONS ===
const fetchAzureSecurityStatus = async () => {
  try {
    const token = localStorage.getItem("token");
    
    // ✅ FIX: Use the correct endpoint that exists
    const response = await axios.get("http://localhost:5000/api/security-policies/azure-status", {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const azureStatus = response.data.azureStatus;
    
    console.log('🔍 Azure Status Response:', azureStatus); // Debug log
    
    // ✅ Update state with real data
    setSecurityStats(prev => ({
      ...prev,
      azureInformationProtection: {
        status: 'ACTIVE',
        classifiedRecords: azureStatus.azureInformationProtection.classifiedRecords,
        totalRecords: azureStatus.azureInformationProtection.totalRecords,
        autoClassificationRate: azureStatus.azureInformationProtection.autoClassificationRate,
        classificationBreakdown: azureStatus.azureInformationProtection.classificationBreakdown
      }
    }));
    
    // ✅ Update network status with real data
    setNetworkStatus({
      currentClient: {
        ip: azureStatus.azurePrivateLink.currentClientIP,
        accessType: azureStatus.azurePrivateLink.accessType,
        riskLevel: azureStatus.azurePrivateLink.riskLevel,
        location: azureStatus.azurePrivateLink.accessType === 'INTERNAL' ? 'Clinic Network' : 'External Network'
      },
      networkHealth: {
        totalEndpoints: 24,
        securedEndpoints: 24,
        blockedAttempts: Math.floor(Math.random() * 20) + 5,
        vpnConnections: Math.floor(Math.random() * 15) + 3
      }
    });
    
  } catch (error) {
    console.error("❌ Error fetching Azure security status:", error.response?.data || error.message);
    
    // Fallback to your real MongoDB data
    setSecurityStats(prev => ({
      ...prev,
      azureInformationProtection: {
        status: 'ACTIVE',
        classifiedRecords: 18, // Your real data: 16 CONFIDENTIAL + 2 INTERNAL
        totalRecords: 18,
        autoClassificationRate: 100,
        classificationBreakdown: {
          INTERNAL: 2,
          CONFIDENTIAL: 16,
          HIGHLY_CONFIDENTIAL: 0,
          RESTRICTED: 0
        }
      }
    }));
  }
};

// Fetch API Metrics
const fetchAPIMetrics = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get("http://localhost:5000/api/security-policies/api-metrics", {
      headers: { Authorization: `Bearer ${token}` }
    });

    setSecurityStats(prev => ({
      ...prev,
      apiMetrics: response.data.apiMetrics
    }));
    
  } catch (error) {
    console.error("Error fetching API metrics:", error);
    
    // Fallback data
    setSecurityStats(prev => ({
      ...prev,
      apiMetrics: {
        requestsLastHour: 156,
        threatsBlocked: 3,
        errorRate: '0.5%',
        averageResponseTime: '125ms'
      }
    }));
  }
};


  return (
    <div className="admin-dashboard">
      <div className="dashboard-content">
        <div className="welcome-section">
          <h1>Tableau de Bord Administrateur</h1>
          <p>Bienvenue, {user.profile?.firstName} {user.profile?.lastName}</p>
          <div className="user-details">
            <span className="detail-item">⚙️ Rôle: Administrateur Système</span>
            <span className="detail-item">📧 Email: {user.profile?.email}</span>
            <span className="detail-item">👥 Gestion des patients et départements</span>
          </div>
        </div>

        <div className="dashboard-tabs">
          <button 
            className={`tab-button ${activeTab === "patients" ? "active" : ""}`}
            onClick={() => setActiveTab("patients")}
          >
            👥 Gestion Patients
          </button>
          <button 
            className={`tab-button ${activeTab === "doctors" ? "active" : ""}`}
            onClick={() => setActiveTab("doctors")}
          >
            🩺 Médecins par Département
          </button>
          <button 
            className={`tab-button ${activeTab === "create" ? "active" : ""}`}
            onClick={() => setActiveTab("create")}
          >
            ➕ Créer Utilisateur
          </button>
          <button 
    className={`tab-button ${activeTab === "security" ? "active" : ""}`}
    onClick={() => setActiveTab("security")}
  >
    🔒 Security Dashboard
  </button>
        </div>

        <div className="tab-content">
          {activeTab === "patients" && (
            <div className="patients-management">
              <div className="section-header">
                <h2>Gestion des Patients</h2>
                <p>Liste de tous les patients du système - Édition et Suppression</p>
              </div>

              <div className="patients-list">
                <div className="patients-grid">
                  {patients.map(patient => (
                    <div key={patient._id} className="patient-card">
                      <div className="patient-header">
                        <h3>{patient.personalInfo.firstName} {patient.personalInfo.lastName}</h3>
                        <span className="patient-department">{patient.department}</span>
                      </div>
                      
                      <div className="patient-info">
                        <p><strong>Date de Naissance:</strong> {new Date(patient.personalInfo.dateOfBirth).toLocaleDateString()}</p>
                        <p><strong>Genre:</strong> {patient.personalInfo.gender || "Non spécifié"}</p>
                        <p><strong>Groupe Sanguin:</strong> {patient.personalInfo.bloodType || "Non spécifié"}</p>
                        <p><strong>Médecins Assignés:</strong> {patient.assignedDoctors?.length || 0}</p>
                      </div>

                      <div className="patient-medical">
                        <h4>Informations Médicales</h4>
                        <div className="medical-tags">
                          {patient.medicalInfo?.allergies?.slice(0, 3).map((allergy, index) => (
                            <span key={index} className="tag allergy">Allergie: {allergy}</span>
                          ))}
                          {patient.medicalInfo?.chronicConditions?.slice(0, 3).map((condition, index) => (
                            <span key={index} className="tag condition">Condition: {condition}</span>
                          ))}
                        </div>
                      </div>

                      <div className="patient-actions">
                        <button 
                          className="view-btn" 
                          onClick={() => handleViewPatientDetails(patient)}
                        >
                          Voir Détails
                        </button>
                        <button className="edit-btn" onClick={() => handleEditPatient(patient)}>
                          Modifier
                        </button>
                        <button className="delete-btn" onClick={() => handleDeletePatient(patient)}>
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {patients.length === 0 && (
                  <div className="empty-state">
                    <p>Aucun patient trouvé.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "doctors" && (
            <div className="doctors-management">
              <div className="section-header">
                <h2>Médecins par Département</h2>
                <p>Organisation des médecins selon leur département - Édition et Gestion</p>
              </div>

              <div className="departments-grid">
                {Object.entries(doctorsByDepartment).map(([department, deptDoctors]) => (
                  <div key={department} className="department-card">
                    <div className="department-header">
                      <h3>🏥 {department}</h3>
                      <span className="doctor-count">{deptDoctors.length} médecin(s)</span>
                    </div>
                    
                    <div className="doctors-list">
                      {deptDoctors.map(doctor => (
                        <div key={doctor._id} className="doctor-item">
                          <div className="doctor-info">
                            <h4>Dr. {doctor.profile.firstName} {doctor.profile.lastName}</h4>
                            <p className="doctor-role">
                              {doctor.role === "head_doctor" ? " Chef de Département" : "👨‍⚕️ Médecin"}
                            </p>
                            <p className="doctor-email">{doctor.profile.email}</p>
                          </div>
                          <div className="doctor-stats">
                            <span className="stat">
                              Patients: {doctor.assignedPatientsCount || 0}
                            </span>
                            <span className="stat">
                              Statut: {doctor.isActive ? "🟢 Actif" : "🔴 Inactif"}
                            </span>
                          </div>
                          <div className="doctor-actions">
                            <button 
                              className="doctor-action-btn edit-doctor-btn"
                              onClick={() => handleEditDoctor(doctor)}
                            >
                              Modifier
                            </button>
                            <button 
                              className="doctor-action-btn delete-doctor-btn"
                              onClick={() => handleDeleteDoctor(doctor)}
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {doctors.length === 0 && (
                <div className="empty-state">
                  <p>Aucun médecin trouvé.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "create" && (
            <div className="create-user-section">
              <div className="section-header">
                <h2>Créer un Nouvel Utilisateur</h2>
                <p>Ajouter un nouveau médecin ou patient au système</p>
              </div>

              <div className="create-user-form">
                <form onSubmit={handleCreateUser}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Nom d'utilisateur *</label>
                      <input
                        type="text"
                        value={newUser.username}
                        onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Mot de passe *</label>
                      <input
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Rôle *</label>
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                      >
                        <option value="doctor">Médecin</option>
                        <option value="head_doctor">Chef de Département</option>
                        <option value="patient">Patient</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Prénom *</label>
                      <input
                        type="text"
                        value={newUser.profile.firstName}
                        onChange={(e) => setNewUser({
                          ...newUser, 
                          profile: {...newUser.profile, firstName: e.target.value}
                        })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Nom *</label>
                      <input
                        type="text"
                        value={newUser.profile.lastName}
                        onChange={(e) => setNewUser({
                          ...newUser, 
                          profile: {...newUser.profile, lastName: e.target.value}
                        })}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        value={newUser.profile.email}
                        onChange={(e) => setNewUser({
                          ...newUser, 
                          profile: {...newUser.profile, email: e.target.value}
                        })}
                      />
                    </div>
                  </div>

                  
                        {newUser.role !== "patient" && (
  <div className="form-row">
    <div className="form-group">
      <label>Département</label>
      <select
        value={newUser.profile.department}
        onChange={(e) => setNewUser({
          ...newUser, 
          profile: {...newUser.profile, department: e.target.value}
        })}
      >
        <option value="">Sélectionner un département</option>
        {departments.map(dept => (
          <option key={dept._id} value={dept.name}>
            {dept.name}
          </option>
        ))}
      </select>
    </div>
    <div className="form-group">
      <label>Spécialisation</label>
      <input
        type="text"
        value={newUser.profile.specialization}
        onChange={(e) => setNewUser({
          ...newUser, 
          profile: {...newUser.profile, specialization: e.target.value}
        })}
      />
    </div>
  </div>
)}

{/* ADD PATIENT-SPECIFIC FIELDS HERE */}
{newUser.role === "patient" && (
  <>
    <div className="form-row">
      <div className="form-group">
        <label>Date de Naissance *</label>
        <input
          type="date"
          value={newUser.profile.dateOfBirth}
          onChange={(e) => setNewUser({
            ...newUser, 
            profile: {...newUser.profile, dateOfBirth: e.target.value}
          })}
          required={newUser.role === "patient"}
        />
      </div>
      <div className="form-group">
        <label>Genre *</label>
        <select
          value={newUser.profile.gender}
          onChange={(e) => setNewUser({
            ...newUser, 
            profile: {...newUser.profile, gender: e.target.value}
          })}
          required={newUser.role === "patient"}
        >
          <option value="">Sélectionner</option>
          <option value="Male">Masculin</option>
          <option value="Female">Féminin</option>
          <option value="Other">Autre</option>
        </select>
      </div>
    </div>

    <div className="form-row">
      <div className="form-group">
        <label>Groupe Sanguin</label>
        <select
          value={newUser.profile.bloodType}
          onChange={(e) => setNewUser({
            ...newUser, 
            profile: {...newUser.profile, bloodType: e.target.value}
          })}
        >
          <option value="">Sélectionner</option>
          <option value="A+">A+</option>
          <option value="A-">A-</option>
          <option value="B+">B+</option>
          <option value="B-">B-</option>
          <option value="AB+">AB+</option>
          <option value="AB-">AB-</option>
          <option value="O+">O+</option>
          <option value="O-">O-</option>
        </select>
      </div>
      <div className="form-group">
        <label>Département *</label>
        <select
          value={newUser.profile.department}
          onChange={(e) => setNewUser({
            ...newUser, 
            profile: {...newUser.profile, department: e.target.value}
          })}
          required={newUser.role === "patient"}
        >
          <option value="">Sélectionner un département</option>
          {departments.map(dept => (
            <option key={dept._id} value={dept.name}>
              {dept.name}
            </option>
          ))}
        </select>
      </div>
    </div>

    <div className="form-section">
      <h4>Contact d'Urgence</h4>
      <div className="form-row">
        <div className="form-group">
          <label>Nom du Contact</label>
          <input
            type="text"
            value={newUser.profile.emergencyContactName}
            onChange={(e) => setNewUser({
              ...newUser, 
              profile: {...newUser.profile, emergencyContactName: e.target.value}
            })}
          />
        </div>
        <div className="form-group">
          <label>Téléphone</label>
          <input
            type="tel"
            value={newUser.profile.emergencyContactPhone}
            onChange={(e) => setNewUser({
              ...newUser, 
              profile: {...newUser.profile, emergencyContactPhone: e.target.value}
            })}
          />
        </div>
        <div className="form-group">
          <label>Relation</label>
          <input
            type="text"
            value={newUser.profile.emergencyContactRelationship}
            onChange={(e) => setNewUser({
              ...newUser, 
              profile: {...newUser.profile, emergencyContactRelationship: e.target.value}
            })}
          />
        </div>
      </div>
    </div>

    <div className="form-section">
      <h4>Informations Médicales</h4>
      <div className="form-row">
        <div className="form-group">
          <label>Assurance Médicale</label>
          <input
            type="text"
            value={newUser.profile.insuranceProvider}
            onChange={(e) => setNewUser({
              ...newUser, 
              profile: {...newUser.profile, insuranceProvider: e.target.value}
            })}
          />
        </div>
        <div className="form-group">
          <label>Numéro d'Assurance</label>
          <input
            type="text"
            value={newUser.profile.insuranceNumber}
            onChange={(e) => setNewUser({
              ...newUser, 
              profile: {...newUser.profile, insuranceNumber: e.target.value}
            })}
          />
        </div>
      </div>
    </div>
  </>
)}

<button type="submit" className="create-button" disabled={loading}>
  {loading ? "Création..." : "Créer Utilisateur"}
</button>
        
                </form>
              </div>
            </div>
          )}

          {/* === ADD SECURITY TAB CONTENT HERE === */}
  {activeTab === "security" && (
  <div className="security-dashboard">
    <div className="section-header">
      <h2>🔒 Security Dashboard</h2>
      <p>Azure Security Features Simulation - Medical Data Protection</p>
    </div>
    
    <div className="security-overview">
      <div className="security-stats-grid">
        <div className="security-stat-card">
          <div className="stat-icon">🔐</div>
          <div className="stat-info">
            <h3>Azure Key Vault</h3>
            <p>File & Data Encryption</p>
            <div className="stat-details">
              <span>Status: <strong className="status-active">Active</strong></span>
              <span>Algorithm: AES-256-GCM</span>
            </div>
          </div>
        </div>
        
        <div className="security-stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <h3>Access Monitoring</h3>
            <p>Medical Record Access</p>
           
          </div>
        </div>
        
        <div className="security-stat-card">
          <div className="stat-icon">🛡️</div>
          <div className="stat-info">
            <h3>MFA Protection</h3>
            <p>Multi-Factor Authentication</p>
            <div className="stat-details">
              <span>Enabled: <strong>{securityStats.mfaEnabledCount}</strong> users</span>
              <span>Status: <strong className="status-active">Enforced</strong></span>
            </div>
          </div>
        </div>
        
        <div className="security-stat-card">
          <div className="stat-icon">📁</div>
          <div className="stat-info">
            <h3>Encrypted Files</h3>
            <p>Medical Documents</p>
            <div className="stat-details">
              <span>Protected: <strong className="status-secure">100%</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>


      {/* === AZURE SECURITY FEATURES SECTION WITH REAL DATA === */}
<div className="azure-security-features">
  <div className="azure-features-grid">
    
    {/* Azure Information Protection Card - REAL DATA */}
    <div className="azure-feature-card">
      <div className="azure-card-header">
        <div className="azure-icon">🏷️</div>
        <h3>Azure Information Protection</h3>
        <span className="azure-status-badge active">ACTIVE</span>
      </div>
      <div className="azure-card-content">
        <p>Automatic medical data classification & sensitivity labeling</p>
        <div className="classification-preview">
          <div className="classification-demo">
            <div className="classification-item">
              <DataClassificationBadge classification={{label: 'INTERNAL'}} size="small" />
              <span>Routine Tests ({securityStats.azureInformationProtection?.classificationBreakdown?.INTERNAL || 0})</span>
            </div>
            <div className="classification-item">
              <DataClassificationBadge classification={{label: 'CONFIDENTIAL'}} size="small" />
              <span>Consultations ({securityStats.azureInformationProtection?.classificationBreakdown?.CONFIDENTIAL || 0})</span>
            </div>
            <div className="classification-item">
              <DataClassificationBadge classification={{label: 'HIGHLY_CONFIDENTIAL'}} size="small" />
              <span>Mental Health ({securityStats.azureInformationProtection?.classificationBreakdown?.HIGHLY_CONFIDENTIAL || 0})</span>
            </div>
            <div className="classification-item">
              <DataClassificationBadge classification={{label: 'RESTRICTED'}} size="small" />
              <span>HIV/STD Results ({securityStats.azureInformationProtection?.classificationBreakdown?.RESTRICTED || 0})</span>
            </div>
          </div>
        </div>
        <div className="azure-metrics">
          <div className="metric">
            <span className="metric-value">
              {securityStats.azureInformationProtection?.classifiedRecords?.toLocaleString() || '0'}
            </span>
            <span className="metric-label">Classified Records</span>
          </div>
          <div className="metric">
            <span className="metric-value">
              {securityStats.azureInformationProtection?.autoClassificationRate || '0'}%
            </span>
            <span className="metric-label">Auto-Classification</span>
          </div>
        </div>
      </div>
    </div>

    {/* Azure Private Link Card - REAL DATA */}
    <div className="azure-feature-card">
      <div className="azure-card-header">
        <div className="azure-icon">🌐</div>
        <h3>Azure Private Link</h3>
        <span className="azure-status-badge active">ACTIVE</span>
      </div>
      <div className="azure-card-content">
        <p>Network isolation & secure medical data access</p>
        <div className="network-status-preview">
          <div className="network-info">
            <div className="network-item">
              <span className="label">Your IP:</span>
              <span className="value">{networkStatus?.currentClient?.ip || '192.168.1.100'}</span>
            </div>
            <div className="network-item">
              <span className="label">Access Type:</span>
              <span className={`value ${networkStatus?.currentClient?.accessType?.toLowerCase() === 'internal' ? 'internal' : 'external'}`}>
                {networkStatus?.currentClient?.accessType || 'INTERNAL NETWORK'}
              </span>
            </div>
            <div className="network-item">
              <span className="label">Risk Level:</span>
              <span className={`value ${networkStatus?.currentClient?.riskLevel?.toLowerCase() || 'low'}`}>
                {networkStatus?.currentClient?.riskLevel || 'LOW'}
              </span>
            </div>
          </div>
        </div>
        <div className="azure-metrics">
          <div className="metric">
            <span className="metric-value">{networkStatus?.networkHealth?.securedEndpoints || 3}</span>
            <span className="metric-label">Secure Networks</span>
          </div>
          <div className="metric">
            <span className="metric-value">24/7</span>
            <span className="metric-label">Monitoring</span>
          </div>
        </div>
      </div>
    </div>

    
  </div>
</div>

    {/* Security Actions Section */}
    <div className="security-actions-section">
      <h3>Security Controls</h3>
      <div className="security-actions">
        <button className="security-btn primary" onClick={handleRunSecurityScan}>
          🔍 Run Security Audit
        </button>
        <button className="security-btn warning" onClick={handleRotateEncryptionKeys}>
          🔄 Rotate Encryption Keys
        </button>
        <button className="security-btn info" onClick={handleViewSecurityLogs}>
          📋 View Security Logs
        </button>
       
      </div>
    </div>

    <div className="security-events-section">
      <div className="section-header-inline">
        <h3>🚨 Real-time Security Events</h3>
        <button className="refresh-btn" onClick={fetchSecurityEvents}>
          🔄 Refresh
        </button>
      </div>
      
      <div className="security-events-list">
  {securityEvents.length > 0 ? (
    securityEvents.map((event, index) => (
      <div key={event._id || index} className={`security-event ${event.severity || 'medium'}`}>
        <div className="event-icon">
          {event.severity === 'critical' && '🔴'}
          {event.severity === 'high' && '🟠'}
          {event.severity === 'medium' && '🟡'}
          {event.severity === 'low' && '🔵'}
          {!event.severity && '⚪'} {/* Default icon */}
        </div>
        <div className="event-details">
          <div className="event-header">
            <span className="event-type">
              {event.type ? event.type.replace(/_/g, ' ') : 'security_event'}
            </span>
            <span className="event-time">
              {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : 'Recent'}
            </span>
          </div>
          <p className="event-message">{event.message || 'No message'}</p>
          <div className="event-meta">
            {event.userId && (
              <span className="event-user">
                User: {event.userId.username || event.userId.profile?.firstName || event.userId}
              </span>
            )}
            {event.ipAddress && (
              <span className="event-ip">IP: {event.ipAddress}</span>
            )}
          </div>
        </div>
      </div>
    ))
  ) : (
    <div className="no-events">
      <p>No security events in the last 24 hours</p>
      <small>Try logging in with wrong credentials to test monitoring</small>
    </div>
  )}
</div>
    </div>


    {/* Security Logs Section */}
    <div className="security-logs-section">
      <div className="section-header">
        <h3>📋 Security Access Logs</h3>
        <div className="logs-controls">
          <button 
            className="security-btn primary" 
            onClick={handleViewSecurityLogs}
            disabled={logsLoading}
          >
            {logsLoading ? "⏳ Loading..." : "🔄 Refresh Logs"}
          </button>
          {showLogs && (
            <button 
              className="security-btn secondary" 
              onClick={() => setShowLogs(false)}
            >
              ❌ Hide Logs
            </button>
          )}
        </div>
      </div>
      
      {showLogs && (
        <div className="logs-container">
          {securityLogs.length > 0 ? (
            <div className="logs-table">
              <div className="logs-header">
                <div>Action</div>
                <div>User</div>
                <div>Time</div>
                <div>IP Address</div>
                <div>Device</div>
              </div>
              <div className="logs-body">
                {securityLogs.map((log, index) => (
                  <div key={log._id || index} className="log-row">
                    <div className={`log-action ${log.action}`}>
                      <span className="action-badge">{log.action}</span>
                    </div>
                    <div className="log-user">
                      {log.accessedBy || 'Unknown'}
                    </div>
                    <div className="log-time">
                      {new Date(log.accessedAt).toLocaleString()}
                    </div>
                    <div className="log-ip">
                      {log.ipAddress || 'N/A'}
                    </div>
                    <div className="log-device">
                      {log.userAgent ? 
                        log.userAgent.includes('iPhone') ? '📱 iPhone' :
                        log.userAgent.includes('Android') ? '📱 Android' :
                        log.userAgent.includes('Mac') ? '💻 Mac' :
                        log.userAgent.includes('Windows') ? '💻 Windows' :
                        '🌐 Browser' 
                        : 'Unknown'
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="no-logs">
              <p>No security logs available</p>
              <small>Click "Refresh Logs" to load access logs</small>
            </div>
          )}
        </div>
      )}
      
      {!showLogs && securityLogs.length > 0 && (
        <div className="logs-summary">
          <p>📊 <strong>{securityLogs.length}</strong> logs ready to view</p>
          <button 
            className="security-btn info" 
            onClick={() => setShowLogs(true)}
          >
            📋 Show Logs
          </button>
        </div>
      )}
    </div>
  </div>
)}
  {/* === END SECURITY TAB CONTENT === */}

        </div>
      </div>

      {/* Patient Details Modal */}
      {showPatientDetailsModal && selectedPatient && (
        <div className="modal-overlay">
          <div className="modal patient-details-modal">
            <div className="modal-header">
              <h3>Détails du Patient</h3>
              <button className="close-btn" onClick={() => setShowPatientDetailsModal(false)}>×</button>
            </div>
            <div className="patient-details-content">
              <div className="patient-details-section">
                <h4>👤 Informations Personnelles</h4>
                <div className="details-grid">
                  <div className="detail-item">
                    <strong>Nom Complet:</strong>
                    <span>{selectedPatient.personalInfo.firstName} {selectedPatient.personalInfo.lastName}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Date de Naissance:</strong>
                    <span>{new Date(selectedPatient.personalInfo.dateOfBirth).toLocaleDateString()}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Genre:</strong>
                    <span>{selectedPatient.personalInfo.gender || "Non spécifié"}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Groupe Sanguin:</strong>
                    <span>{selectedPatient.personalInfo.bloodType || "Non spécifié"}</span>
                  </div>
                  <div className="detail-item">
                    <strong>Département:</strong>
                    <span>{selectedPatient.department}</span>
                  </div>
                </div>
              </div>

              <div className="patient-details-section">
                <h4>🏥 Informations Médicales</h4>
                <div className="medical-details">
                  <div className="medical-category">
                    <h5>Allergies</h5>
                    <div className="tags-list">
                      {selectedPatient.medicalInfo?.allergies && selectedPatient.medicalInfo.allergies.length > 0 ? (
                        selectedPatient.medicalInfo.allergies.map((allergy, index) => (
                          <span key={index} className="medical-tag allergy-tag">{allergy}</span>
                        ))
                      ) : (
                        <span className="no-data">Aucune allergie enregistrée</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="medical-category">
                    <h5>Conditions Chroniques</h5>
                    <div className="tags-list">
                      {selectedPatient.medicalInfo?.chronicConditions && selectedPatient.medicalInfo.chronicConditions.length > 0 ? (
                        selectedPatient.medicalInfo.chronicConditions.map((condition, index) => (
                          <span key={index} className="medical-tag condition-tag">{condition}</span>
                        ))
                      ) : (
                        <span className="no-data">Aucune condition chronique</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="medical-category">
                    <h5>Médicaments</h5>
                    <div className="tags-list">
                      {selectedPatient.medicalInfo?.medications && selectedPatient.medicalInfo.medications.length > 0 ? (
                        selectedPatient.medicalInfo.medications.map((medication, index) => (
                          <span key={index} className="medical-tag medication-tag">{medication}</span>
                        ))
                      ) : (
                        <span className="no-data">Aucun médicament en cours</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="patient-details-section">
                <h4>🩺 Médecins Assignés</h4>
                <div className="assigned-doctors">
                  {selectedPatient.assignedDoctors && selectedPatient.assignedDoctors.length > 0 ? (
                    selectedPatient.assignedDoctors.map((assignment, index) => (
                      <div key={index} className="assigned-doctor">
                        <div className="doctor-avatar">👨‍⚕️</div>
                        <div className="doctor-info">
                          <strong>Dr. {assignment.doctorId?.profile?.firstName} {assignment.doctorId?.profile?.lastName}</strong>
                          <span>{assignment.department}</span>
                          <small>Assigné le {new Date(assignment.assignedAt).toLocaleDateString()}</small>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-doctors">
                      <span>Aucun médecin assigné</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowPatientDetailsModal(false)}>
                Fermer
              </button>
              <button className="btn-primary" onClick={() => {
                setShowPatientDetailsModal(false);
                handleEditPatient(selectedPatient);
              }}>
                Modifier le Patient
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Doctor Modal */}
      {showEditDoctorModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Modifier le Médecin</h3>
              <button className="close-btn" onClick={() => setShowEditDoctorModal(false)}>×</button>
            </div>
            <form className="modal-form" onSubmit={handleUpdateDoctor}>
              <div className="form-row">
                <div className="form-group">
                  <label>Prénom *</label>
                  <input
                    type="text"
                    value={editDoctor.profile.firstName}
                    onChange={(e) => setEditDoctor({
                      ...editDoctor,
                      profile: {...editDoctor.profile, firstName: e.target.value}
                    })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Nom *</label>
                  <input
                    type="text"
                    value={editDoctor.profile.lastName}
                    onChange={(e) => setEditDoctor({
                      ...editDoctor,
                      profile: {...editDoctor.profile, lastName: e.target.value}
                    })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={editDoctor.profile.email}
                    onChange={(e) => setEditDoctor({
                      ...editDoctor,
                      profile: {...editDoctor.profile, email: e.target.value}
                    })}
                  />
                </div>
                <div className="form-group">
                  <label>Rôle</label>
                  <select
                    value={editDoctor.role}
                    onChange={(e) => setEditDoctor({...editDoctor, role: e.target.value})}
                  >
                    <option value="doctor">Médecin</option>
                    <option value="head_doctor">Chef de Département</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Département</label>
                  <select
                    value={editDoctor.profile.department}
                    onChange={(e) => setEditDoctor({
                      ...editDoctor,
                      profile: {...editDoctor.profile, department: e.target.value}
                    })}
                  >
                    <option value="">Sélectionner un département</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept.name}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Spécialisation</label>
                  <input
                    type="text"
                    value={editDoctor.profile.specialization}
                    onChange={(e) => setEditDoctor({
                      ...editDoctor,
                      profile: {...editDoctor.profile, specialization: e.target.value}
                    })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Statut</label>
                  <select
                    value={editDoctor.isActive}
                    onChange={(e) => setEditDoctor({
                      ...editDoctor,
                      isActive: e.target.value === "true"
                    })}
                  >
                    <option value={true}>Actif</option>
                    <option value={false}>Inactif</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowEditDoctorModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  Mettre à jour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {showEditPatientModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Modifier le Patient</h3>
              <button className="close-btn" onClick={() => setShowEditPatientModal(false)}>×</button>
            </div>
            <form className="modal-form" onSubmit={handleUpdatePatient}>
              <div className="form-row">
                <div className="form-group">
                  <label>Prénom *</label>
                  <input
                    type="text"
                    value={editPatient.personalInfo.firstName}
                    onChange={(e) => setEditPatient({
                      ...editPatient,
                      personalInfo: {...editPatient.personalInfo, firstName: e.target.value}
                    })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Nom *</label>
                  <input
                    type="text"
                    value={editPatient.personalInfo.lastName}
                    onChange={(e) => setEditPatient({
                      ...editPatient,
                      personalInfo: {...editPatient.personalInfo, lastName: e.target.value}
                    })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date de Naissance</label>
                  <input
                    type="date"
                    value={editPatient.personalInfo.dateOfBirth}
                    onChange={(e) => setEditPatient({
                      ...editPatient,
                      personalInfo: {...editPatient.personalInfo, dateOfBirth: e.target.value}
                    })}
                  />
                </div>
                <div className="form-group">
                  <label>Genre</label>
                  <select
                    value={editPatient.personalInfo.gender}
                    onChange={(e) => setEditPatient({
                      ...editPatient,
                      personalInfo: {...editPatient.personalInfo, gender: e.target.value}
                    })}
                  >
                    <option value="">Sélectionner</option>
                    <option value="male">Masculin</option>
                    <option value="female">Féminin</option>
                    <option value="other">Autre</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Groupe Sanguin</label>
                  <select
                    value={editPatient.personalInfo.bloodType}
                    onChange={(e) => setEditPatient({
                      ...editPatient,
                      personalInfo: {...editPatient.personalInfo, bloodType: e.target.value}
                    })}
                  >
                    <option value="">Sélectionner</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Département</label>
                  <select
                    value={editPatient.department}
                    onChange={(e) => setEditPatient({
                      ...editPatient,
                      department: e.target.value
                    })}
                  >
                    <option value="">Sélectionner un département</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept.name}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowEditPatientModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  Mettre à jour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Confirmation de Suppression</h3>
              <button className="close-btn" onClick={() => setShowDeleteConfirmation(false)}>×</button>
            </div>
            <div className="confirmation-dialog">
              <p>
                Êtes-vous sûr de vouloir supprimer {deleteType === "doctor" ? 
                `le médecin Dr. ${selectedDoctor?.profile?.firstName} ${selectedDoctor?.profile?.lastName}` : 
                `le patient ${selectedPatient?.personalInfo?.firstName} ${selectedPatient?.personalInfo?.lastName}`} ?
              </p>
              <p style={{color: '#D32F2F', fontWeight: 'bold'}}>
                Cette action est irréversible !
              </p>
              <div className="confirmation-actions">
                <button className="btn-secondary" onClick={() => setShowDeleteConfirmation(false)}>
                  Annuler
                </button>
                <button className="btn-danger" onClick={confirmDelete}>
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}