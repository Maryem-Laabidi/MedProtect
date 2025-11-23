// frontend/src/pages/MedicalRecords.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import "./MedicalRecords.css"; 

export default function MedicalRecords() {
  const [records, setRecords] = useState([]);
  const [patientId, setPatientId] = useState("");
  const [recordType, setRecordType] = useState("Lab Result");
  const [recordData, setRecordData] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5000/api/medical-records");
      setRecords(res.data);
      setLoading(false);
    } catch (err) {
      console.error(" Error fetching medical records:", err);
      setLoading(false);
    }
  };

  const addRecord = async () => {
    if (!patientId || !recordType || !recordData) {
      alert("Veuillez remplir tous les champs obligatoires !");
      return;
    }
    try {
      const res = await axios.post("http://localhost:5000/api/medical-records", {
        patientId: patientId,
        recordType: recordType,
        data: recordData,
        fileName: fileName || undefined,
      });
      setPatientId("");
      setRecordType("Lab Result");
      setRecordData("");
      setFileName("");
      fetchRecords();
      alert(" Dossier médical ajouté avec succès !");
    } catch (err) {
      console.error(" Error adding medical record:", err);
    }
  };

  const deleteRecord = async (id) => {
    if (!window.confirm("Supprimer ce dossier médical ?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/medical-records/${id}`);
      fetchRecords();
    } catch (err) {
      console.error(" Error deleting medical record:", err);
    }
  };

  return (
    <div className="page">
      <h2>📁 Dossiers Médicaux Sécurisés</h2>
      <p>Gérez les dossiers patients de manière sécurisée et confidentielle</p>

      {/* Add medical record form */}
      <div className="form-container">
        <input
          type="text"
          placeholder="ID Patient"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
        />
        <select
          value={recordType}
          onChange={(e) => setRecordType(e.target.value)}
        >
          <option value="Lab Result">Résultat de Laboratoire</option>
          <option value="Prescription">Ordonnance</option>
          <option value="Medical Note">Note Médicale</option>
          <option value="Radiology Report">Rapport de Radiologie</option>
          <option value="Other">Autre</option>
        </select>
        <input
          type="text"
          placeholder="Nom du fichier (optionnel)"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
        />
        <textarea
          placeholder="Données médicales"
          value={recordData}
          onChange={(e) => setRecordData(e.target.value)}
          rows="3"
        />
        <button onClick={addRecord}>Ajouter Dossier</button>
      </div>

      {/* Medical records list */}
      <h3> Dossiers Médicaux Stockés</h3>
      {loading ? (
        <p>Chargement...</p>
      ) : records.length === 0 ? (
        <p>Aucun dossier médical pour le moment.</p>
      ) : (
        <ul className="record-list">
          {records.map((record) => (
            <li key={record._id}>
              <strong>{record.recordType}</strong>
              <div className="record-meta">
                <span>Patient: {record.patientId}</span>
                {record.fileName && <span>Fichier: {record.fileName}</span>}
                <span>Créé le: {new Date(record.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="record-actions">
                <span>Données: {record.data}</span>
                <button onClick={() => deleteRecord(record._id)}>Supprimer</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}