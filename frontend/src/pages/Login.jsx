// frontend/src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Login.css";

export default function Login({ onLogin }) {
  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError("");
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError("");

  try {
    // First check if MFA is required
    const checkResponse = await axios.post("http://localhost:5000/api/auth/login-check", formData);
    
    if (checkResponse.data.success) {
      if (checkResponse.data.requiresMFA) {
        // MFA required - redirect to MFA login
        localStorage.setItem("mfaUser", JSON.stringify(checkResponse.data.user));
        navigate("/mfa-login");
      } else {
        // No MFA required - complete login
        await completeLogin(formData);
      }
    }
  } catch (error) {
    // If login-check fails, try direct login (backward compatibility)
    try {
      await completeLogin(formData);
    } catch (loginError) {
      setError(loginError.response?.data?.message || "Échec de la connexion");
    }
  } finally {
    setLoading(false);
  }
};

// Add this helper function
const completeLogin = async (loginData, mfaToken = null) => {
  const loginPayload = { ...loginData };
  if (mfaToken) {
    loginPayload.mfaToken = mfaToken;
  }

  const response = await axios.post("http://localhost:5000/api/auth/login", loginPayload);
  
  if (response.data.success) {
    localStorage.setItem("token", response.data.token);
    localStorage.setItem("user", JSON.stringify(response.data.user));
    
    // Notify parent component about login
    if (onLogin) {
      onLogin(response.data.user);
    }
    
    // Check if MFA setup is recommended
    if (!response.data.user.mfaEnabled) {
  // All users including patients should setup MFA
  navigate("/mfa-setup");
} else {
  // Redirect based on role
  switch (response.data.user.role) {
    case "admin":
      navigate("/admin");
      break;
    case "head_doctor":
    case "doctor":
      navigate("/doctor");
      break;
    case "patient":
      navigate("/patient");
      break;
    default:
      navigate("/");
  }
}
  }
};

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🏥 MedProtect</h1>
          <p>Portail Médical Sécurisé</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="username">Nom d'utilisateur</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              disabled={loading}
              placeholder="Entrez votre nom d'utilisateur"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={loading}
              placeholder="Entrez votre mot de passe"
            />
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <div className="login-footer">
          <p>Contactez l'administrateur pour obtenir un accès</p>
          
        </div>
      </div>
    </div>
  );
}