import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import axios from "axios";
import './MFALogin.css';

const MFALogin = () => {
    const navigate = useNavigate();
    const [mfaToken, setMfaToken] = useState('');
    const [backupCode, setBackupCode] = useState('');
    const [useBackupCode, setUseBackupCode] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const user = JSON.parse(localStorage.getItem("mfaUser"));

    const handleMFASuccess = async (usedBackup = false) => {
        try {
            const mfaUser = JSON.parse(localStorage.getItem("mfaUser"));
            const endpoint = usedBackup ? '/api/mfa/backup-code' : '/api/auth/verify-mfa';
            const payload = usedBackup 
                ? { username: mfaUser.username, backupCode }
                : { username: mfaUser.username, mfaToken };

            const response = await axios.post(`http://localhost:5000${endpoint}`, payload);
            
            if (response.data.success) {
                localStorage.setItem("token", response.data.token);
                localStorage.setItem("user", JSON.stringify(response.data.user));
                localStorage.removeItem("mfaUser");
                
                // Redirect based on role
                const role = response.data.user.role;
                if (role === "admin") navigate("/admin");
                else if (role === "head_doctor" || role === "doctor") navigate("/doctor");
                else if (role === "patient") navigate("/patient");
                else navigate("/");
            }
        } catch (error) {
            setError("Login failed after MFA verification");
        }
    };

    const handleMFALogin = async () => {
        setLoading(true);
        setError('');
        await handleMFASuccess(false);
        setLoading(false);
    };

    const handleBackupCode = async () => {
        setLoading(true);
        setError('');
        await handleMFASuccess(true);
        setLoading(false);
    };

    if (!user) {
        return (
            <div className="mfa-login">
                <h2>Error</h2>
                <p>No user found for MFA verification. Please login again.</p>
                <button onClick={() => navigate('/login')}>Go to Login</button>
            </div>
        );
    }

    return (
        <div className="mfa-login">
            <h2>Two-Factor Authentication</h2>
            <p>Enter the verification code from your authenticator app for {user.username}</p>
            
            {!useBackupCode ? (
                <div className="mfa-verification">
                    <input
                        type="text"
                        placeholder="Enter 6-digit code"
                        value={mfaToken}
                        onChange={(e) => setMfaToken(e.target.value)}
                        maxLength={6}
                    />
                    <button 
                        onClick={handleMFALogin} 
                        disabled={loading || mfaToken.length !== 6}
                    >
                        {loading ? 'Verifying...' : 'Verify'}
                    </button>
                    
                    <button 
                        className="backup-option"
                        onClick={() => setUseBackupCode(true)}
                    >
                        Use Backup Code
                    </button>
                </div>
            ) : (
                <div className="backup-verification">
                    <input
                        type="text"
                        placeholder="Enter backup code"
                        value={backupCode}
                        onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                    />
                    <button 
                        onClick={handleBackupCode} 
                        disabled={loading || !backupCode}
                    >
                        {loading ? 'Verifying...' : 'Use Backup Code'}
                    </button>
                    
                    <button 
                        className="back-option"
                        onClick={() => setUseBackupCode(false)}
                    >
                        Back to App Code
                    </button>
                </div>
            )}
            
            {error && <div className="error-message">{error}</div>}
        </div>
    );
};

export default MFALogin;