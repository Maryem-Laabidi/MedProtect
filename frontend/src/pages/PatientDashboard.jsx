import React, { useState, useEffect } from "react";
import axios from "axios";
import "./PatientDashboard.css";

export default function PatientDashboard() {
  const [activeTab, setActiveTab] = useState("records");
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [patientInfo, setPatientInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    fetchMedicalRecords();
    fetchPatientInfo();
     const checkMFA = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/auth/mfa-status", {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.mfaEnabled === false) {
        console.log(" MFA not enabled - redirecting to setup");
        window.location.href = '/mfa-setup';
      }
    } catch (error) {
      console.error("MFA check error:", error);
    }
  };
  
  checkMFA();
  }, []);

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

  const fetchPatientInfo = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/users/profile", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatientInfo(response.data.patient);
    } catch (error) {
      console.error("Error fetching patient info:", error);
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

  return (
    <div className="patient-dashboard">
      <div className="dashboard-content">
        <div className="welcome-section">
          <h1>Mon Portail Médical</h1>
          <p>Bienvenue, {user.profile?.firstName} {user.profile?.lastName}</p>
          <div className="user-details">
            <span className="detail-item">🏥 Département: {patientInfo?.department || "Général"}</span>
            <span className="detail-item">📋 Votre historique médical</span>
            <span className="detail-item">👨‍⚕️ Médecins assignés: {patientInfo?.assignedDoctors?.length || 0}</span>
          </div>
        </div>

        <div className="dashboard-tabs">
          <button 
            className={`tab-button ${activeTab === "records" ? "active" : ""}`}
            onClick={() => setActiveTab("records")}
          >
            📋 Mes Dossiers Médicaux
          </button>
          <button 
            className={`tab-button ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            👤 Mon Profil
          </button>
          <button 
            className={`tab-button ${activeTab === "doctors" ? "active" : ""}`}
            onClick={() => setActiveTab("doctors")}
          >
            🩺 Mes Médecins
          </button>
        </div>

        <div className="tab-content">
          {activeTab === "records" && (
            <div className="records-section">
              <div className="section-header">
                <h2>Mes Dossiers Médicaux</h2>
                <p>Votre historique médical complet</p>
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
                      <span>Date: {new Date(record.createdAt).toLocaleDateString()}</span>
                      <span>Docteur: Dr. {record.createdBy?.profile?.firstName} {record.createdBy?.profile?.lastName}</span>
                      <span>Département: {record.department}</span>
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

                    {/* Attachments Section */}
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
                      <button className="view-details-btn">Voir Détails</button>
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

          {activeTab === "profile" && (
            <div className="profile-section">
              <h2>Mon Profil</h2>
              {patientInfo && (
                <div className="profile-info">
                  <div className="info-group">
                    <h3>Informations Personnelles</h3>
                    <p><strong>Nom:</strong> {patientInfo.personalInfo.firstName} {patientInfo.personalInfo.lastName}</p>
                    <p><strong>Date de Naissance:</strong> {new Date(patientInfo.personalInfo.dateOfBirth).toLocaleDateString()}</p>
                    <p><strong>Genre:</strong> {patientInfo.personalInfo.gender || "Non spécifié"}</p>
                    <p><strong>Groupe Sanguin:</strong> {patientInfo.personalInfo.bloodType || "Non spécifié"}</p>
                  </div>
                  
                  {patientInfo.medicalInfo && (
                    <div className="info-group">
                      <h3>Informations Médicales</h3>
                      {patientInfo.medicalInfo.allergies && patientInfo.medicalInfo.allergies.length > 0 && (
                        <p><strong>Allergies:</strong> {patientInfo.medicalInfo.allergies.join(", ")}</p>
                      )}
                      {patientInfo.medicalInfo.chronicConditions && patientInfo.medicalInfo.chronicConditions.length > 0 && (
                        <p><strong>Conditions Chroniques:</strong> {patientInfo.medicalInfo.chronicConditions.join(", ")}</p>
                      )}
                      {patientInfo.medicalInfo.medications && patientInfo.medicalInfo.medications.length > 0 && (
                        <p><strong>Médicaments:</strong> {patientInfo.medicalInfo.medications.join(", ")}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "doctors" && (
            <div className="doctors-section">
              <h2>Mes Médecins</h2>
              {patientInfo && patientInfo.assignedDoctors && patientInfo.assignedDoctors.length > 0 ? (
                <div className="doctors-list">
                  {patientInfo.assignedDoctors.map((assignment, index) => (
                    <div key={index} className="doctor-card">
                      <h3>Dr. {assignment.doctorId?.profile?.firstName} {assignment.doctorId?.profile?.lastName}</h3>
                      <p><strong>Département:</strong> {assignment.department}</p>
                      <p><strong>Spécialisation:</strong> {assignment.doctorId?.profile?.specialization || "Médecine Générale"}</p>
                      <p><strong>Assigné depuis:</strong> {new Date(assignment.assignedAt).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>Aucun médecin assigné pour le moment.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}