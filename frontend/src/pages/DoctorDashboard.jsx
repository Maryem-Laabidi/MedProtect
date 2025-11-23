import React, { useState, useEffect } from "react";
import axios from "axios";
import "./DoctorDashboard.css";


function DoctorDashboard() {
 

  const [activeTab, setActiveTab] = useState("patients");
  const [patients, setPatients] = useState([]);
  const [departmentDoctors, setDepartmentDoctors] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [showAssignDoctorModal, setShowAssignDoctorModal] = useState(false);
  const [showPatientDetailsModal, setShowPatientDetailsModal] = useState(false);
  const [showRecordDetailsModal, setShowRecordDetailsModal] = useState(false);
  const [showEditPatientModal, setShowEditPatientModal] = useState(false);
  const [showRequestAccessModal, setShowRequestAccessModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [allPatients, setAllPatients] = useState([]); // All patients for access requests
  const [departmentPatients, setDepartmentPatients] = useState([]); // Department patients for head doctor
  
  const [newRecord, setNewRecord] = useState({
    recordType: "consultation",
    title: "",
    description: "",
    content: ""
  });

  const [newPatient, setNewPatient] = useState({
    username: "",
    password: "",
    personalInfo: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "",
      bloodType: ""
    },
    medicalInfo: {
      allergies: [],
      chronicConditions: [],
      medications: []
    },
    department: ""
  });

  const [editPatient, setEditPatient] = useState({
    personalInfo: {
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "",
      bloodType: ""
    },
    medicalInfo: {
      allergies: [],
      chronicConditions: [],
      medications: []
    },
    department: ""
  });

  const [accessRequests, setAccessRequests] = useState([]);
  const [myAccessRequests, setMyAccessRequests] = useState([]);
  const [accessRequest, setAccessRequest] = useState({
    patientId: "",
    reason: "",
    accessDuration: 24
  });

  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [attachments, setAttachments] = useState([]);
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
  fetchPatients(); // My assigned patients
  fetchMedicalRecords();
  fetchAllPatients(); // Load ALL patients for access requests
  
  if (user.role === "head_doctor") {
    fetchDepartmentDoctors();
    fetchDepartmentPatients(); // Load department patients only for head doctor
    fetchPendingAccessRequests();
  }
  fetchMyAccessRequests();
}, []);

  const fetchDepartmentPatients = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get("http://localhost:5000/api/patients", {
      headers: { Authorization: `Bearer ${token}` }
    });
    setDepartmentPatients(response.data.patients || []);
  } catch (error) {
    console.error("Error fetching department patients:", error);
    setDepartmentPatients([]);
  }
};

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

 const fetchAllPatients = async () => {
  try {
    const token = localStorage.getItem("token");
    // Use the correct endpoint that returns ALL patients for access requests
    const response = await axios.get("http://localhost:5000/api/patients/all-for-access", {
      headers: { Authorization: `Bearer ${token}` }
    });
    setAllPatients(response.data.patients || []);
  } catch (error) {
    console.error("Error fetching all patients:", error);
    setAllPatients([]);
  }
};

  // New function to fetch all patients for access requests
  const fetchAllPatientsForAccess = async () => {
  try {
    const token = localStorage.getItem("token");
    // Use the same endpoint as your other patient fetches
    const response = await axios.get("http://localhost:5000/api/patients", {
      headers: { Authorization: `Bearer ${token}` }
    });
    setAllPatients(response.data.patients || response.data || []);
  } catch (error) {
    console.error("Error fetching patients for access:", error);
    setAllPatients([]);
  }
};

  const fetchDepartmentDoctors = async () => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`http://localhost:5000/api/departments/${user.department}/doctors`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // For each doctor, count their assigned patients
    const doctorsWithPatientCounts = await Promise.all(
      response.data.doctors.map(async (doctor) => {
        const patientsResponse = await axios.get(`http://localhost:5000/api/patients?doctor=${doctor._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        return {
          ...doctor,
          assignedPatientsCount: patientsResponse.data.patients.length
        };
      })
    );
    
    setDepartmentDoctors(doctorsWithPatientCounts);
  } catch (error) {
    console.error("Error fetching department doctors:", error);
  }
};



  const fetchMedicalRecords = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/medical-records", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMedicalRecords(response.data.records);
    } catch (error) {
      console.error("Error fetching medical records:", error);
    }
  };

  const fetchPendingAccessRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/access-requests/pending", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAccessRequests(response.data.requests);
    } catch (error) {
      console.error("Error fetching access requests:", error);
    }
  };

  const fetchMyAccessRequests = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/access-requests/my-requests", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyAccessRequests(response.data.requests);
    } catch (error) {
      console.error("Error fetching my access requests:", error);
    }
  };
  
  const fetchPatientMedicalRecords = async (patientId) => {
  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(`http://localhost:5000/api/medical-records/patient/${patientId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.records || [];
  } catch (error) {
    console.error("Error fetching patient medical records:", error);
    
    // Fallback: filter from existing medicalRecords
    const patientRecords = medicalRecords.filter(record => 
      record.patient?._id === patientId || record.patient === patientId
    );
    return patientRecords;
  }
};

 const handleViewPatientDetails = async (patient) => {
  setSelectedPatient(patient);
  setShowPatientDetailsModal(true);
  
  // Fetch medical records for this patient - works for both regular and temporary access patients
  try {
    const records = await fetchPatientMedicalRecords(patient._id);
    setSelectedPatient(prev => ({
      ...prev,
      medicalRecords: records
    }));
  } catch (error) {
    console.error("Error loading medical records:", error);
    setSelectedPatient(prev => ({
      ...prev,
      medicalRecords: []
    }));
  }
};

  const handleViewRecordDetails = (record) => {
    setSelectedRecord(record);
    setShowRecordDetailsModal(true);
  };

  const handleEditPatientClick = (patient) => {
    setSelectedPatient(patient);
    setEditPatient({
      personalInfo: {
        firstName: patient.personalInfo.firstName,
        lastName: patient.personalInfo.lastName,
        dateOfBirth: patient.personalInfo.dateOfBirth,
        gender: patient.personalInfo.gender,
        bloodType: patient.personalInfo.bloodType
      },
      medicalInfo: {
        allergies: patient.medicalInfo?.allergies || [],
        chronicConditions: patient.medicalInfo?.chronicConditions || [],
        medications: patient.medicalInfo?.medications || []
      },
      department: patient.department
    });
    setShowEditPatientModal(true);
  };

  const handleUpdatePatient = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      await axios.put(`http://localhost:5000/api/patients/${selectedPatient._id}`, editPatient, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowEditPatientModal(false);
      fetchPatients();
      if (user.role === "head_doctor") fetchAllPatients();
      alert("Patient mis à jour avec succès !");
    } catch (error) {
      console.error("Error updating patient:", error);
      alert(error.response?.data?.message || "Erreur lors de la mise à jour du patient");
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecordClick = (patient) => {
    setSelectedPatient(patient);
    setNewRecord({
      recordType: "consultation",
      title: "",
      description: "",
      content: ""
    });
    setAttachments([]);
    setShowAddRecordModal(true);
  };

  const handleAddPatientClick = () => {
    setNewPatient({
      username: "",
      password: "",
      personalInfo: {
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        gender: "",
        bloodType: ""
      },
      medicalInfo: {
        allergies: [],
        chronicConditions: [],
        medications: []
      },
      department: user.department
    });
    setShowAddPatientModal(true);
  };

  const handleAssignDoctorClick = (patient) => {
    setSelectedPatient(patient);
    setSelectedDoctor("");
    setShowAssignDoctorModal(true);
  };

  const handleRequestAccessClick = () => {
  setAccessRequest({
    patientId: "",
    reason: "",
    accessDuration: 24
  });
  setShowRequestAccessModal(true);
};
const testAccessRequest = async () => {
  console.log("🧪 Testing access request API...");
  
  try {
    const token = localStorage.getItem("token");
    const testData = {
      patientId: allPatients[0]?._id, // Use first patient
      reason: "Test d'accès",
      accessDuration: 24
    };
    
    console.log("Test data:", testData);
    
    const response = await axios.post("http://localhost:5000/api/access-requests/request", testData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log("✅ Test successful:", response.data);
    alert("Test réussi!");
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
    alert("Test échoué: " + (error.response?.data?.message || error.message));
  }
};
 

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(files);
  };

  const handleCreateRecord = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    const token = localStorage.getItem("token");
    const formData = new FormData();

    formData.append("patientId", selectedPatient._id);
    formData.append("recordType", newRecord.recordType);
    formData.append("title", newRecord.title);
    formData.append("description", newRecord.description);
    formData.append("content", newRecord.content);

    attachments.forEach(file => {
      formData.append("attachments", file);
    });

    const response = await axios.post("http://localhost:5000/api/medical-records", formData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data"
      }
    });

    if (response.data.success) {
      setShowAddRecordModal(false);
      setSelectedPatient(null);
      setAttachments([]);
      fetchMedicalRecords();
      alert("Dossier médical créé avec succès !");
    }
  } catch (error) {
    console.error("Error creating medical record:", error);
    
    // SIMPLE FIX: Show the actual error message from the server
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        "Erreur lors de la création du dossier";
    
    alert(`Erreur: ${errorMessage}`);
  } finally {
    setLoading(false);
  }
};

  const handleCreatePatient = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    const token = localStorage.getItem("token");
    
    console.log("Creating patient with data:", newPatient);
    
    // Create patient directly using the enhanced patients endpoint
    const patientData = {
      username: newPatient.username,
      password: newPatient.password,
      personalInfo: newPatient.personalInfo,
      medicalInfo: newPatient.medicalInfo,
      department: user.department
    };

    const response = await axios.post("http://localhost:5000/api/patients", patientData, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("Patient creation response:", response.data);

    if (response.data.success) {
      setShowAddPatientModal(false);
      fetchPatients();
      if (user.role === "head_doctor") fetchAllPatients();
      alert("Patient créé avec succès !");
    }
  } catch (error) {
    console.error("Error creating patient:", error);
    
    // More detailed error logging
    if (error.response) {
      console.error("Server response:", error.response.data);
      console.error("Status:", error.response.status);
      alert("Erreur: " + (error.response.data.message || "Erreur lors de la création du patient"));
    } else {
      alert("Erreur de connexion au serveur");
    }
  } finally {
    setLoading(false);
  }
};

  const handleAssignDoctor = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      
      await axios.post(`http://localhost:5000/api/patients/${selectedPatient._id}/assign-doctor`, {
        doctorId: selectedDoctor
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowAssignDoctorModal(false);
      setSelectedPatient(null);
      setSelectedDoctor("");
      if (user.role === "head_doctor") fetchAllPatients();
      alert("Médecin assigné avec succès !");
    } catch (error) {
      console.error("Error assigning doctor:", error);
      alert(error.response?.data?.message || "Erreur lors de l'assignation du médecin");
    } finally {
      setLoading(false);
    }
  };


const handleRequestAccess = async (e) => {
  e.preventDefault();
  setLoading(true);
  
  try {
    const token = localStorage.getItem("token");
    
    // ✅ NEW: Check if patient has restricted records before sending request
    const classificationCheck = await axios.get(
      `http://localhost:5000/api/medical-records/patient/${accessRequest.patientId}/classification-check`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (classificationCheck.data.hasRestrictedRecords) {
      alert("❌ Accès refusé - Ce patient contient des dossiers médicaux classifiés comme HIGHLY_CONFIDENTIAL ou RESTRICTED. L'accès ne peut pas être demandé via ce système.");
      setLoading(false);
      return; // Stop here, don't send the request
    }

    const accessRequestData = {
      patientId: String(accessRequest.patientId),
      reason: accessRequest.reason,
      accessDuration: accessRequest.accessDuration
    };

    const response = await fetch("http://localhost:5000/api/access-requests/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(accessRequestData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    alert("Demande d'accès envoyée avec succès !");
    setShowRequestAccessModal(false);
    
    // Reset the form
    setAccessRequest({
      patientId: "",
      reason: "",
      accessDuration: 24
    });
    
    // AUTO-REFRESH REQUESTS
    fetchMyAccessRequests();
    if (user.role === "head_doctor") {
      fetchPendingAccessRequests();
    }
    
  } catch (error) {
    alert(error.message || "Erreur lors de l'envoi de la demande");
  } finally {
    setLoading(false);
  }
};


  const handleRespondToRequest = async (requestId, status) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(`http://localhost:5000/api/access-requests/${requestId}/respond`, 
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      fetchPendingAccessRequests();
      fetchAllPatients();
      alert(`Demande ${status === 'approved' ? 'approuvée' : 'rejetée'} avec succès !`);
    } catch (error) {
      console.error("Error responding to request:", error);
      alert(error.response?.data?.message || "Erreur lors de la réponse");
    }
  };

  const downloadAttachment = async (recordId, attachmentId, filename) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:5000/api/medical-records/${recordId}/attachments/${attachmentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob"
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading attachment:", error);
      alert("Erreur lors du téléchargement du fichier");
    }
  };

  const getAccessStatus = (request) => {
    if (request.status === "approved") return { text: "✅ Approuvée", class: "status-approved" };
    if (request.status === "rejected") return { text: "❌ Rejetée", class: "status-rejected" };
    return { text: "⏳ En attente", class: "status-pending" };
  };

 const hasTemporaryAccess = (patient) => {
  return patient.temporaryAccess?.some(access => {
    // Add safety checks for nested properties
    const doctorId = access?.doctorId?._id || access?.doctorId;
    const expiresAt = access?.expiresAt;
    
    // Check if doctorId exists and matches current user, and access hasn't expired
    return doctorId && 
           doctorId.toString() === user.userId && 
           expiresAt && 
           new Date(expiresAt) > new Date();
  });
};

  return (
    <div className="doctor-dashboard">
      <div className="dashboard-content">
        <div className="welcome-section">
          <h1>Tableau de Bord Médecin</h1>
          <p>Bienvenue, Dr. {user.profile?.firstName} {user.profile?.lastName}</p>
          <div className="user-details">
            <span className="detail-item">📋 Département: {user.department}</span>
            <span className="detail-item">🎯 Rôle: {user.role === "head_doctor" ? "Chef de Département" : "Médecin"}</span>
            <span className="detail-item">🎓 Spécialisation: {user.profile?.specialization || "Médecine Générale"}</span>
          </div>
        </div>

        <div className="dashboard-tabs">
          <button 
            className={`tab-button ${activeTab === "patients" ? "active" : ""}`}
            onClick={() => setActiveTab("patients")}
          >
            👥 Mes Patients
          </button>
          <button 
            className={`tab-button ${activeTab === "records" ? "active" : ""}`}
            onClick={() => setActiveTab("records")}
          >
            📋 Dossiers Médicaux
          </button>
          {user.role === "head_doctor" && (
            <button 
              className={`tab-button ${activeTab === "department" ? "active" : ""}`}
              onClick={() => setActiveTab("department")}
            >
              🏥 Gestion Département
            </button>
          )}
          <button 
            className={`tab-button ${activeTab === "access" ? "active" : ""}`}
            onClick={() => setActiveTab("access")}
          >
            🔐 Demandes d'Accès
          </button>
        </div>

        <div className="tab-content">
          {activeTab === "patients" && (
            <div className="patients-section">
              <div className="section-header">
                <h2>Mes Patients</h2>
                <p>Patients sous votre responsabilité</p>
                <div className="header-actions">
                  <button 
                    className="add-patient-btn"
                    onClick={handleAddPatientClick}
                  >
                    ➕ Ajouter un Patient
                  </button>
                 
                </div>
              </div>

              <div className="patients-grid">
                {patients.map(patient => {
                  const isTemporaryAccess = hasTemporaryAccess(patient);
                  return (
                    <div key={patient._id} className={`patient-card ${isTemporaryAccess ? 'temporary-access' : ''}`}>
                      <div className="patient-header">
                        <div className="patient-title">
                          <h3>{patient.personalInfo.firstName} {patient.personalInfo.lastName}</h3>
                          {isTemporaryAccess && (
                            <span className="access-badge">Accès Temporaire</span>
                          )}
                        </div>
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
                        <button 
                          className="edit-btn"
                          onClick={() => handleEditPatientClick(patient)}
                        >
                          Modifier
                        </button>
                        <button 
                          className="add-record-btn"
                          onClick={() => handleAddRecordClick(patient)}
                        >
                          Ajouter Dossier
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {patients.length === 0 && (
                <div className="empty-state">
                  <p>Aucun patient assigné pour le moment.</p>
                  <button 
                    className="request-access-btn"
                    onClick={handleRequestAccessClick}
                    style={{marginTop: '15px'}}
                  >
                    🔐 Demander Accès à un Patient
                  </button>
                  
                </div>
              )}
            </div>
          )}

          {activeTab === "records" && (
            <div className="records-section">
              <div className="section-header">
                <h2>Dossiers Médicaux</h2>
                <p>Tous les dossiers médicaux auxquels vous avez accès</p>
              </div>

              <div className="records-list">
                {medicalRecords.map(record => (
                  <div key={record._id} className="record-card">
                    <div className="record-header">
                      <h3>{record.title}</h3>
                      <span className={`record-type ${record.recordType}`}>
                        {record.recordType.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="record-meta">
                      <span>Patient: {record.patient.personalInfo.firstName} {record.patient.personalInfo.lastName}</span>
                      <span>Date: {new Date(record.createdAt).toLocaleDateString()}</span>
                      <span>Docteur: Dr. {record.createdBy?.profile?.firstName} {record.createdBy?.profile?.lastName}</span>
                    </div>

                    {record.description && (
                      <div className="record-description">
                        <p>{record.description}</p>
                      </div>
                    )}

                    {record.content && (
                      <div className="record-content">
                        <p>{record.content}</p>
                      </div>
                    )}

                    {record.attachments && record.attachments.length > 0 && (
                      <div className="attachments-section">
                        <h4>📎 Pièces jointes ({record.attachments.length})</h4>
                        <div className="attachments-list">
                          {record.attachments.map(attachment => (
                            <div key={attachment._id} className="attachment-item">
                              <span className="attachment-name">{attachment.originalName}</span>
                              <span className="attachment-size">
                                {(attachment.fileSize / 1024 / 1024).toFixed(2)} MB
                              </span>
                              <button 
                                className="download-btn"
                                onClick={() => downloadAttachment(record._id, attachment._id, attachment.originalName)}
                              >
                                Télécharger
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="record-actions">
                      <button 
                        className="view-details-btn"
                        onClick={() => handleViewRecordDetails(record)}
                      >
                        Voir Détails
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {medicalRecords.length === 0 && (
                <div className="empty-state">
                  <p>Aucun dossier médical trouvé.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "department" && user.role === "head_doctor" && (
            <div className="department-section">
              <div className="section-header">
                <h2>Gestion du Département {user.department}</h2>
                <p>Gestion des patients et médecins du département</p>
              </div>

              <div className="department-management">
                <div className="management-grid">
                  <div className="management-card">
                    <h3>👥 Tous les Patients du Département</h3>
                    <div className="patients-list">
                      {departmentPatients.map(patient => (
                        <div key={patient._id} className="department-patient-item">
                          <div className="patient-main-info">
                            <h4>{patient.personalInfo.firstName} {patient.personalInfo.lastName}</h4>
                            <p>Médecins assignés: {patient.assignedDoctors?.length || 0}</p>
                            {patient.temporaryAccess && patient.temporaryAccess.length > 0 && (
                              <p className="temp-access-info">
                                Accès temporaires: {patient.temporaryAccess.filter(access => new Date(access.expiresAt) > new Date()).length}
                              </p>
                            )}
                          </div>
                          <div className="patient-actions">
                            <button 
                              className="assign-doctor-btn"
                              onClick={() => handleAssignDoctorClick(patient)}
                            >
                              Assigner Médecin
                            </button>
                            <button 
                              className="view-btn"
                              onClick={() => handleViewPatientDetails(patient)}
                            >
                              Voir Détails
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="management-card">
                    <h3>🩺 Médecins du Département</h3>
                    <div className="doctors-list">
                      {departmentDoctors.map(doctor => (
                        <div key={doctor._id} className="department-doctor-item">
                          <div className="doctor-info">
                            <h4>Dr. {doctor.profile.firstName} {doctor.profile.lastName}</h4>
                            <p className="specialization">{doctor.profile.specialization}</p>
                            <p className="role">
                              {doctor.role === "head_doctor" ? "👑 Chef de Département" : "👨‍⚕️ Médecin"}
                            </p>
                          </div>
                          <div className="doctor-stats">
                            <span className="stat">
                              Patients: {doctor.assignedPatientsCount || 0}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="management-card full-width">
                    <h3>🔐 Demandes d'Accès en Attente</h3>
                    <div className="access-requests-list">
                      {accessRequests.map(request => (
                        <div key={request._id} className="access-request-item">
                          <div className="request-info">
                            <h4>Dr. {request.requestingDoctor.profile.firstName} {request.requestingDoctor.profile.lastName}</h4>
                            <p><strong>Patient:</strong> {request.patient.personalInfo.firstName} {request.patient.personalInfo.lastName}</p>
                            <p><strong>Raison:</strong> {request.reason}</p>
                            <p><strong>Durée demandée:</strong> {request.accessDuration} heures</p>
                            <small>Demandé le {new Date(request.createdAt).toLocaleDateString()}</small>
                          </div>
                          <div className="request-actions">
                            <button 
                              className="approve-btn"
                              onClick={() => handleRespondToRequest(request._id, "approved")}
                            >
                              ✅ Approuver
                            </button>
                            <button 
                              className="reject-btn"
                              onClick={() => handleRespondToRequest(request._id, "rejected")}
                            >
                              ❌ Rejeter
                            </button>
                          </div>
                        </div>
                      ))}
                      {accessRequests.length === 0 && (
                        <div className="empty-state">
                          <p>Aucune demande d'accès en attente.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "access" && (
  <div className="access-section">
    <div className="section-header">
      <h2>Gestion des Accès</h2>
      <p>Demandes d'accès aux dossiers patients</p>
      <div className="header-actions">
        <button 
          className="request-access-btn"
          onClick={handleRequestAccessClick}
        >
          🔐 Nouvelle Demande d'Accès
        </button>
        
      </div>
    </div>

    
      <div className="access-management">
  <div className="management-grid">
    {/* === MERGED REQUESTS SECTION === */}
    <div className="management-card full-width">
      <h3>📋 Toutes les Demandes d'Accès</h3>
      <div className="all-requests-list">
        {/* Combine both accessRequests and myAccessRequests */}
        {[...accessRequests, ...myAccessRequests]
          .filter((request, index, self) => 
            index === self.findIndex(r => r._id === request._id) // Remove duplicates
          )
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // Sort by date
          .map(request => {
            const requestingDoctorId = request.requestingDoctor?._id || request.requestingDoctor;
            const isMyRequest = requestingDoctorId?.toString() === user.userId;
            const canRespond = request.status === 'pending' && !isMyRequest;
            
            return (
              <div key={request._id} className={`request-item ${isMyRequest ? 'my-request' : 'received-request'}`}>
                <div className="request-header">
                  <span className="request-type">
                    {isMyRequest ? '📤 Votre demande' : '📥 Demande reçue'}
                  </span>
                  <span className={`status ${request.status === 'approved' ? 'status-approved' : request.status === 'rejected' ? 'status-rejected' : 'status-pending'}`}>
                    {request.status === 'approved' ? '✅ Approuvée' : request.status === 'rejected' ? '❌ Rejetée' : '⏳ En attente'}
                  </span>
                </div>
                
                <div className="request-info">
                  <h4>
                    {isMyRequest ? 
                      `Vous avez demandé accès à ${request.patient?.personalInfo?.firstName} ${request.patient?.personalInfo?.lastName}` : 
                      `Demande de Dr. ${request.requestingDoctor?.profile?.firstName} ${request.requestingDoctor?.profile?.lastName}`
                    }
                  </h4>
                  <p><strong>Patient:</strong> {request.patient?.personalInfo?.firstName} {request.patient?.personalInfo?.lastName}</p>
                  <p><strong>Raison:</strong> {request.reason}</p>
                  <p><strong>Durée:</strong> {request.accessDuration} heures</p>
                  <small>Demandé le {new Date(request.createdAt).toLocaleDateString()}</small>
                  {request.respondedAt && (
                    <small> - Répondu le {new Date(request.respondedAt).toLocaleDateString()}</small>
                  )}
                </div>
                
               {request.status === 'pending' && (
<div className="request-actions">
  {isMyRequest ? (
    <span className="waiting-label">⏳ En attente d'approbation</span>
  ) : (user.role === "head_doctor" || 
       request.patient?.assignedDoctors?.some(assignment => 
         assignment.doctorId?._id?.toString() === user.userId || 
         assignment.doctorId?.toString() === user.userId
       )) ? (
    <>
      <button 
        className="approve-btn"
        onClick={() => handleRespondToRequest(request._id, "approved")}
      >
        Approuver
      </button>
      <button 
        className="reject-btn"
        onClick={() => handleRespondToRequest(request._id, "rejected")}
      >
        Rejeter
      </button>
    </>
  ) : (
    <span className="no-permission">❌ Non autorisé à répondre</span>
  )}
</div>
)}
              </div>
            );
          })}
        
        {accessRequests.length === 0 && myAccessRequests.length === 0 && (
          <div className="empty-state">
            <p>Aucune demande d'accès.</p>
          </div>
        )}
      </div>
    </div>
    {/* === END OF MERGED SECTION === */}

        {/* === MEDICAL RECORDS FOR TEMPORARY ACCESS === */}
    <div className="management-card full-width">
      <h3>📁 Dossiers Médicaux - Accès Temporaires</h3>
      <div className="temporary-access-records">
       {allPatients.filter(patient => {
  return patient.temporaryAccess?.some(access => {
    const doctorId = access?.doctorId?._id || access?.doctorId;
    const expiresAt = access?.expiresAt;
    
    return doctorId && 
           doctorId.toString() === user.userId && 
           expiresAt && 
           new Date(expiresAt) > new Date();
  });
}).map(patient => {
  const tempAccess = patient.temporaryAccess?.find(access => {
    const doctorId = access?.doctorId?._id || access?.doctorId;
    const expiresAt = access?.expiresAt;
    
    return doctorId && 
           doctorId.toString() === user.userId && 
           expiresAt && 
           new Date(expiresAt) > new Date();
  });
          
          return (
            <div key={patient._id} className="temporary-access-patient">
              <div className="patient-header">
                <h4>{patient.personalInfo.firstName} {patient.personalInfo.lastName}</h4>
                <span className="access-expiry">
                  ⏰ Accès expire le: {new Date(tempAccess.expiresAt).toLocaleString()}
                </span>
              </div>
              
              <div className="patient-details">
                <p><strong>Département:</strong> {patient.department}</p>
                <p><strong>Genre:</strong> {patient.personalInfo.gender || "Non spécifié"}</p>
                <p><strong>Groupe sanguin:</strong> {patient.personalInfo.bloodType || "Non spécifié"}</p>
              </div>
              
              <div className="medical-records-preview">
                <button 
                  className="view-records-btn"
                  onClick={() => handleViewPatientDetails(patient)}
                >
                  📋 Voir les dossiers médicaux complets
                </button>
                <button 
                  className="add-record-btn"
                  onClick={() => handleAddRecordClick(patient)}
                >
                  ➕ Ajouter un dossier
                </button>
              </div>
            </div>
          );
        })}
        
        {allPatients.filter(patient => 
          patient.temporaryAccess?.some(access => 
            access.doctorId?._id?.toString() === user.userId && 
            new Date(access.expiresAt) > new Date()
          )
        ).length === 0 && (
          <div className="empty-state">
            <p>Aucun accès temporaire actif.</p>
            <p className="empty-state-subtitle">
              Les patients pour lesquels vos demandes d'accès sont approuvées apparaîtront ici.
            </p>
          </div>
        )}
      </div>
    </div>
    {/* === END OF TEMPORARY ACCESS SECTION === */}

  </div>
</div>


  </div>
)}


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

                {selectedPatient.temporaryAccess && selectedPatient.temporaryAccess.length > 0 && (
                  <div className="patient-details-section">
                    <h4>⏰ Accès Temporaires</h4>
                    <div className="temporary-access-list">
                      {selectedPatient.temporaryAccess
                        .filter(access => new Date(access.expiresAt) > new Date())
                        .map((access, index) => (
                          <div key={index} className="temporary-access-item">
                            <div className="access-info">
                              <strong>Dr. {access.doctorId?.profile?.firstName} {access.doctorId?.profile?.lastName}</strong>
                              <span>Expire le: {new Date(access.expiresAt).toLocaleString()}</span>
                              <small>Accordé par: Dr. {access.grantedBy?.profile?.firstName} {access.grantedBy?.profile?.lastName}</small>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                <div className="patient-details-section">
  <h4>📋 Dossiers Médicaux</h4>
  <div className="medical-records-list">
    {selectedPatient.medicalRecords && selectedPatient.medicalRecords.length > 0 ? (
      selectedPatient.medicalRecords.map(record => (
        <div key={record._id} className="medical-record-item">
          <div className="record-header">
            <h5>{record.title}</h5>
            <span className={`record-type ${record.recordType}`}>
              {record.recordType.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          <div className="record-meta">
            <span>Date: {new Date(record.createdAt).toLocaleDateString()}</span>
            <span>Type: {record.recordType}</span>
          </div>
          {record.description && (
            <p className="record-description">{record.description}</p>
          )}
          <button 
            className="view-record-btn"
            onClick={() => {
              setShowPatientDetailsModal(false);
              setSelectedRecord(record);
              setShowRecordDetailsModal(true);
            }}
          >
            Voir Détails
          </button>
        </div>
      ))
    ) : (
      <div className="no-records">
        <span>Aucun dossier médical trouvé</span>
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
                  handleEditPatientClick(selectedPatient);
                }}>
                  Modifier le Patient
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Record Details Modal */}
        {showRecordDetailsModal && selectedRecord && (
          <div className="modal-overlay">
            <div className="modal record-details-modal">
              <div className="modal-header">
                <h3>Détails du Dossier Médical</h3>
                <button className="close-btn" onClick={() => setShowRecordDetailsModal(false)}>×</button>
              </div>
              <div className="record-details-content">
                <div className="record-details-section">
                  <h4>📋 Informations Générales</h4>
                  <div className="details-grid">
                    <div className="detail-item">
                      <strong>Titre:</strong>
                      <span>{selectedRecord.title}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Type:</strong>
                      <span className={`record-type ${selectedRecord.recordType}`}>
                        {selectedRecord.recordType.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="detail-item">
                      <strong>Patient:</strong>
                      <span>{selectedRecord.patient.personalInfo.firstName} {selectedRecord.patient.personalInfo.lastName}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Créé par:</strong>
                      <span>Dr. {selectedRecord.createdBy?.profile?.firstName} {selectedRecord.createdBy?.profile?.lastName}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Date de création:</strong>
                      <span>{new Date(selectedRecord.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="detail-item">
                      <strong>Département:</strong>
                      <span>{selectedRecord.department}</span>
                    </div>
                  </div>
                </div>

                {selectedRecord.description && (
                  <div className="record-details-section">
                    <h4>📝 Description</h4>
                    <div className="description-content">
                      <p>{selectedRecord.description}</p>
                    </div>
                  </div>
                )}

                {selectedRecord.content && (
                  <div className="record-details-section">
                    <h4>📄 Contenu/Notes</h4>
                    <div className="content-area">
                      <pre>{selectedRecord.content}</pre>
                    </div>
                  </div>
                )}

                {selectedRecord.attachments && selectedRecord.attachments.length > 0 && (
                  <div className="record-details-section">
                    <h4>📎 Pièces Jointes ({selectedRecord.attachments.length})</h4>
                    <div className="attachments-grid">
                      {selectedRecord.attachments.map(attachment => (
                        <div key={attachment._id} className="attachment-card">
                          <div className="attachment-info">
                            <span className="attachment-name">{attachment.originalName}</span>
                            <span className="attachment-size">{(attachment.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                          </div>
                          <button 
                            className="download-btn"
                            onClick={() => downloadAttachment(selectedRecord._id, attachment._id, attachment.originalName)}
                          >
                            Télécharger
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowRecordDetailsModal(false)}>
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Patient Modal */}
        {showEditPatientModal && selectedPatient && (
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
                    <input
                      type="text"
                      value={editPatient.department}
                      onChange={(e) => setEditPatient({
                        ...editPatient,
                        department: e.target.value
                      })}
                    />
                  </div>
                </div>

                <div className="medical-info-section">
                  <h4>Informations Médicales</h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Allergies (séparées par des virgules)</label>
                      <input
                        type="text"
                        value={editPatient.medicalInfo.allergies.join(', ')}
                        onChange={(e) => setEditPatient({
                          ...editPatient,
                          medicalInfo: {...editPatient.medicalInfo, allergies: e.target.value.split(',').map(a => a.trim())}
                        })}
                        placeholder="ex: Penicillin, Pollen, Shellfish"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Conditions Chroniques (séparées par des virgules)</label>
                      <input
                        type="text"
                        value={editPatient.medicalInfo.chronicConditions.join(', ')}
                        onChange={(e) => setEditPatient({
                          ...editPatient,
                          medicalInfo: {...editPatient.medicalInfo, chronicConditions: e.target.value.split(',').map(c => c.trim())}
                        })}
                        placeholder="ex: Hypertension, Diabète, Asthme"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Médicaments (séparés par des virgules)</label>
                      <input
                        type="text"
                        value={editPatient.medicalInfo.medications.join(', ')}
                        onChange={(e) => setEditPatient({
                          ...editPatient,
                          medicalInfo: {...editPatient.medicalInfo, medications: e.target.value.split(',').map(m => m.trim())}
                        })}
                        placeholder="ex: Lisinopril 10mg, Metformin 500mg"
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowEditPatientModal(false)}>
                    Annuler
                  </button>
                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? "Mise à jour..." : "Mettre à jour"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Record Modal */}
        {showAddRecordModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>Ajouter un Dossier Médical</h3>
                <button 
                  className="close-btn"
                  onClick={() => setShowAddRecordModal(false)}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreateRecord} className="modal-form">
                <div className="form-group">
                  <label>Patient</label>
                  <input 
                    type="text" 
                    value={`${selectedPatient.personalInfo.firstName} ${selectedPatient.personalInfo.lastName}`}
                    disabled 
                  />
                </div>

                <div className="form-group">
                  <label>Type de dossier *</label>
                  <select
                    value={newRecord.recordType}
                    onChange={(e) => setNewRecord({...newRecord, recordType: e.target.value})}
                    required
                  >
                    <option value="consultation">Consultation</option>
                    <option value="lab_result">Résultat de Laboratoire</option>
                    <option value="prescription">Ordonnance</option>
                    <option value="radiology">Radiologie</option>
                    <option value="surgery">Chirurgie</option>
                    <option value="other">Autre</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Titre *</label>
                  <input
                    type="text"
                    value={newRecord.title}
                    onChange={(e) => setNewRecord({...newRecord, title: e.target.value})}
                    placeholder="ex: Bilan Annuel, Résultats de Prise de Sang"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <input
                    type="text"
                    value={newRecord.description}
                    onChange={(e) => setNewRecord({...newRecord, description: e.target.value})}
                    placeholder="Brève description du dossier"
                  />
                </div>

                <div className="form-group">
                  <label>Contenu/Notes</label>
                  <textarea
                    value={newRecord.content}
                    onChange={(e) => setNewRecord({...newRecord, content: e.target.value})}
                    placeholder="Notes détaillées, observations, ou résultats..."
                    rows="4"
                  />
                </div>

                <div className="form-group">
                  <label>Pièces jointes (Optionnel)</label>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.txt,.xls,.xlsx"
                  />
                  <small>Max 5 fichiers, 10MB chacun. Autorisés: Images, PDFs, Documents</small>
                  
                  {attachments.length > 0 && (
                    <div className="selected-files">
                      <p>Fichiers sélectionnés:</p>
                      <ul>
                        {attachments.map((file, index) => (
                          <li key={index}>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="modal-actions">
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => setShowAddRecordModal(false)}
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={loading}
                  >
                    {loading ? "Création..." : "Créer Dossier"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Patient Modal */}
        {showAddPatientModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>Ajouter un Nouveau Patient</h3>
                <button 
                  className="close-btn"
                  onClick={() => setShowAddPatientModal(false)}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleCreatePatient} className="modal-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Nom d'utilisateur *</label>
                    <input
                      type="text"
                      value={newPatient.username}
                      onChange={(e) => setNewPatient({...newPatient, username: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Mot de passe *</label>
                    <input
                      type="password"
                      value={newPatient.password}
                      onChange={(e) => setNewPatient({...newPatient, password: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Prénom *</label>
                    <input
                      type="text"
                      value={newPatient.personalInfo.firstName}
                      onChange={(e) => setNewPatient({
                        ...newPatient,
                        personalInfo: {...newPatient.personalInfo, firstName: e.target.value}
                      })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Nom *</label>
                    <input
                      type="text"
                      value={newPatient.personalInfo.lastName}
                      onChange={(e) => setNewPatient({
                        ...newPatient,
                        personalInfo: {...newPatient.personalInfo, lastName: e.target.value}
                      })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Date de Naissance *</label>
                    <input
                      type="date"
                      value={newPatient.personalInfo.dateOfBirth}
                      onChange={(e) => setNewPatient({
                        ...newPatient,
                        personalInfo: {...newPatient.personalInfo, dateOfBirth: e.target.value}
                      })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Genre</label>
                    <select
                      value={newPatient.personalInfo.gender}
                      onChange={(e) => setNewPatient({
                        ...newPatient,
                        personalInfo: {...newPatient.personalInfo, gender: e.target.value}
                      })}
                    >
                      <option value="">Sélectionner</option>
                      <option value="Male">Masculin</option>
                      <option value="Female">Féminin</option>
                      <option value="Other">Autre</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Groupe Sanguin</label>
                  <input
                    type="text"
                    value={newPatient.personalInfo.bloodType}
                    onChange={(e) => setNewPatient({
                      ...newPatient,
                      personalInfo: {...newPatient.personalInfo, bloodType: e.target.value}
                    })}
                    placeholder="ex: A+, O-, etc."
                  />
                </div>

                <div className="modal-actions">
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => setShowAddPatientModal(false)}
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={loading}
                  >
                    {loading ? "Création..." : "Créer Patient"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assign Doctor Modal */}
        {showAssignDoctorModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>Assigner un Médecin</h3>
                <button 
                  className="close-btn"
                  onClick={() => setShowAssignDoctorModal(false)}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleAssignDoctor} className="modal-form">
                <div className="form-group">
                  <label>Patient</label>
                  <input 
                    type="text" 
                    value={`${selectedPatient.personalInfo.firstName} ${selectedPatient.personalInfo.lastName}`}
                    disabled 
                  />
                </div>

                <div className="form-group">
                  <label>Sélectionner un Médecin *</label>
                  <select
                    value={selectedDoctor}
                    onChange={(e) => setSelectedDoctor(e.target.value)}
                    required
                  >
                    <option value="">Sélectionner un médecin</option>
                    {departmentDoctors.map(doctor => (
                      <option key={doctor._id} value={doctor._id}>
                        Dr. {doctor.profile.firstName} {doctor.profile.lastName} - {doctor.profile.specialization}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="modal-actions">
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => setShowAssignDoctorModal(false)}
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary"
                    disabled={loading}
                  >
                    {loading ? "Assignation..." : "Assigner Médecin"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Request Access Modal */}
{showRequestAccessModal && (
  <div className="modal-overlay">
    <div className="modal">
      <div className="modal-header">
        <h3>Demander l'Accès au Patient</h3>
        <button className="close-btn" onClick={() => setShowRequestAccessModal(false)}>×</button>
      </div>
      <form onSubmit={(e) => {
        e.preventDefault(); // Make sure this is here
        handleRequestAccess(e);
      }} className="modal-form">
        <div className="form-group">
          <label>Sélectionner un Patient *</label>
          <select
            value={accessRequest.patientId}
            onChange={(e) => setAccessRequest({...accessRequest, patientId: e.target.value})}
            required
          >
            <option value="">Sélectionner un patient</option>
            {allPatients.map(patient => (
              <option key={patient._id} value={patient._id}>
                {patient.personalInfo.firstName} {patient.personalInfo.lastName} - {patient.department}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Raison de l'accès *</label>
          <textarea
            value={accessRequest.reason}
            onChange={(e) => setAccessRequest({...accessRequest, reason: e.target.value})}
            placeholder="Expliquez pourquoi vous avez besoin d'accéder à ce dossier..."
            required
            rows="3"
          />
        </div>

        <div className="form-group">
          <label>Durée d'accès (heures)</label>
          <select
            value={accessRequest.accessDuration}
            onChange={(e) => setAccessRequest({...accessRequest, accessDuration: parseInt(e.target.value)})}
          >
            <option value={24}>24 heures</option>
            <option value={48}>48 heures</option>
            <option value={72}>72 heures</option>
            <option value={168}>1 semaine</option>
          </select>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={() => setShowRequestAccessModal(false)}>
            Annuler
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
  {loading ? "Vérification..." : "Envoyer la Demande"}
</button>
        </div>
      </form>
    </div>
  </div>
)}

      </div>
    </div>
  );
}

export default DoctorDashboard;