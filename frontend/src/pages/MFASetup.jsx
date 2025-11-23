import React, { useState } from 'react';
import './MFASetup.css';

const MFASetup = () => {
    const [step, setStep] = useState(1);
    const [qrCode, setQrCode] = useState('');
    const [secret, setSecret] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [backupCodes, setBackupCodes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const startSetup = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/mfa/setup', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            if (response.ok) {
                setQrCode(data.qrCode);
                setSecret(data.secret);
                setStep(2);
            } else {
                setMessage(data.error);
            }
        } catch (error) {
            setMessage('Failed to start MFA setup');
        }
        setLoading(false);
    };

    const verifyAndEnable = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/mfa/verify', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token: verificationCode })
            });
            
            const data = await response.json();
            if (response.ok) {
                setBackupCodes(data.backupCodes);
                setStep(3);
            } else {
                setMessage(data.error);
            }
        } catch (error) {
            setMessage('Verification failed');
        }
        setLoading(false);
    };

    return (
        <div className="mfa-setup">
            <h2>Two-Factor Authentication Setup</h2>
            
            {step === 1 && (
                <div className="setup-step">
                    <p>Secure your account with two-factor authentication.</p>
                    <button onClick={startSetup} disabled={loading}>
                        {loading ? 'Setting up...' : 'Start Setup'}
                    </button>
                </div>
            )}

            {step === 2 && (
                <div className="setup-step">
                    <h3>Scan QR Code</h3>
                    <p>Use Microsoft Authenticator or any authenticator app:</p>
                    <img src={qrCode} alt="QR Code" className="qr-code" />
                    <p className="secret-text">Or enter secret manually: {secret}</p>
                    
                    <div className="verification">
                        <input
                            type="text"
                            placeholder="Enter 6-digit code"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            maxLength={6}
                        />
                        <button onClick={verifyAndEnable} disabled={loading || verificationCode.length !== 6}>
                            {loading ? 'Verifying...' : 'Verify & Enable'}
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="setup-step">
                    <h3>Backup Codes</h3>
                    <p className="warning">Save these backup codes in a secure location!</p>
                    <div className="backup-codes">
                        {backupCodes.map((code, index) => (
                            <div key={index} className="backup-code">{code}</div>
                        ))}
                    </div>
                    <p>You can use these codes if you lose access to your authenticator app.</p>
                    <button onClick={() => setStep(4)}>I've Saved My Codes</button>
                </div>
            )}

            {step === 4 && (
                <div className="setup-step success">
                    <h3>✓ MFA Enabled Successfully</h3>
                    <p>Your account is now protected with two-factor authentication.</p>
                    <button onClick={() => window.location.href = '/dashboard'}>
                        Go to Dashboard
                    </button>
                </div>
            )}

            {message && <div className="error-message">{message}</div>}
        </div>
    );
};

export default MFASetup;