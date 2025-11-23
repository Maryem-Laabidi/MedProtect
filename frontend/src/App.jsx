// frontend/src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import PatientDashboard from "./pages/PatientDashboard";
import "./App.css";
import MFALogin from "./pages/MFALogin";
import MFASetup from "./pages/MFASetup";

// Protected Route Component
function ProtectedRoute({ children, requiredRoles = [] }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    
    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    } else {
      setIsAuthenticated(false);
    }
  };

  if (isAuthenticated === null) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required role
  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on role
    switch (user.role) {
      case "admin":
        return <Navigate to="/admin" replace />;
      case "head_doctor":
      case "doctor":
        return <Navigate to="/doctor" replace />;
      case "patient":
        return <Navigate to="/patient" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return children;
}

// Header Component with Logout
function Header({ user, onLogout }) {
  const getDashboardName = () => {
    switch (user.role) {
      case "admin":
        return "Tableau de Bord Administrateur";
      case "head_doctor":
      case "doctor":
        return "Tableau de Bord Médecin";
      case "patient":
        return "Mon Portail Médical";
      default:
        return "MedProtect";
    }
  };

  const getUserDisplayName = () => {
    if (user.role === "patient") {
      return `${user.profile?.firstName} ${user.profile?.lastName}`;
    } else {
      return `Dr. ${user.profile?.firstName} ${user.profile?.lastName}`;
    }
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="header-left">
          <h1>🏥 MedProtect</h1>
          <span className="dashboard-name">{getDashboardName()}</span>
        </div>
        
        <div className="header-right">
          <div className="user-info">
            <span className="user-name">{getUserDisplayName()}</span>
            <span className="user-role">
              {user.role === "admin" ? "Administrateur" : 
               user.role === "head_doctor" ? "Chef de Département" :
               user.role === "doctor" ? "Médecin" : "Patient"}
            </span>
          </div>
          <button className="logout-btn" onClick={onLogout}>
             Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
}

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check if user is logged in on app start
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    // Clear all stored data
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    
    // Redirect to login page
    window.location.href = "/login";
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  return (
    <Router>
      <div className="app">
        {user && <Header user={user} onLogout={handleLogout} />}
        
        <div className={user ? "app-content with-header" : "app-content"}>
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/login" 
              element={<Login onLogin={updateUser} />} 
            />
            
            {/* Protected Routes */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute requiredRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/doctor" 
              element={
                <ProtectedRoute requiredRoles={["admin", "head_doctor", "doctor"]}>
                  <DoctorDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/patient" 
              element={
                <ProtectedRoute requiredRoles={["patient"]}>
                  <PatientDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Default redirect based on user role */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/login" replace />} />
            {/* MFA Routes */}
<Route 
  path="/mfa-login" 
  element={<MFALogin />} 
/>

<Route 
  path="/mfa-setup" 
  element={
    <ProtectedRoute>
      <MFASetup />
    </ProtectedRoute>
  } 
/>
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;