import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './NetworkSecurityDashboard.css';

const NetworkSecurityDashboard = () => {
    const [networkStatus, setNetworkStatus] = useState(null);
    const [accessAttempts, setAccessAttempts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchNetworkStatus();
        fetchRecentAccessAttempts();
    }, []);

    const fetchNetworkStatus = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/security/network-status', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNetworkStatus(response.data);
        } catch (error) {
            console.error('Error fetching network status:', error);
            // Fallback demo data
            setNetworkStatus({
                service: 'Azure Private Link Simulation',
                status: 'ACTIVE',
                currentClient: {
                    ip: '192.168.1.100',
                    accessType: 'INTERNAL',
                    location: 'Clinic Network',
                    riskLevel: 'LOW'
                },
                networkHealth: {
                    totalEndpoints: 24,
                    securedEndpoints: 24,
                    blockedAttempts: 12,
                    vpnConnections: 8
                },
                allowedNetworks: [
                    { range: '192.168.1.0/24', name: 'Main Clinic Network', type: 'INTERNAL', devices: 45 },
                    { range: '10.0.1.0/24', name: 'Medical Devices VLAN', type: 'RESTRICTED', devices: 12 },
                    { range: '172.16.0.0/16', name: 'Staff VPN Network', type: 'REMOTE_ACCESS', devices: 23 }
                ]
            });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchRecentAccessAttempts = async () => {
        // Simulated access attempts
        setAccessAttempts([
            {
                id: 1,
                ip: '192.168.1.105',
                user: 'dr_smith',
                endpoint: '/api/medical-records',
                accessType: 'INTERNAL',
                status: 'ALLOWED',
                timestamp: new Date(),
                riskScore: 2
            },
            {
                id: 2,
                ip: '203.0.113.45',
                user: 'unknown',
                endpoint: '/api/medical-records',
                accessType: 'EXTERNAL',
                status: 'BLOCKED',
                timestamp: new Date(Date.now() - 300000),
                riskScore: 85
            },
            {
                id: 3,
                ip: '192.168.1.201',
                user: 'nurse_jones',
                endpoint: '/api/patients',
                accessType: 'INTERNAL',
                status: 'ALLOWED',
                timestamp: new Date(Date.now() - 600000),
                riskScore: 5
            }
        ]);
    };

    const simulateNetworkThreat = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/security/simulate-threat', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('🚨 Network threat simulation triggered! Check security logs.');
            fetchRecentAccessAttempts();
        } catch (error) {
            console.error('Error simulating threat:', error);
        }
    };

    if (isLoading) {
        return <div className="loading">Loading Azure Private Link Security...</div>;
    }

    return (
        <div className="network-security-dashboard">
            <div className="dashboard-header">
                <h2>🌐 Azure Private Link Security</h2>
                <p>Network Isolation & Access Control Simulation</p>
                <button 
                    className="simulate-threat-btn"
                    onClick={simulateNetworkThreat}
                >
                    🚨 Simulate Network Threat
                </button>
            </div>

            {/* Current Connection Status */}
            <div className="connection-status-card">
                <div className="status-header">
                    <h3>Current Connection</h3>
                    <div className={`status-badge ${networkStatus?.currentClient.riskLevel?.toLowerCase()}`}>
                        {networkStatus?.currentClient.accessType} NETWORK
                    </div>
                </div>
                <div className="connection-details">
                    <div className="detail-item">
                        <label>IP Address:</label>
                        <span className="ip-address">{networkStatus?.currentClient.ip}</span>
                    </div>
                    <div className="detail-item">
                        <label>Location:</label>
                        <span>{networkStatus?.currentClient.location}</span>
                    </div>
                    <div className="detail-item">
                        <label>Risk Level:</label>
                        <span className={`risk-level ${networkStatus?.currentClient.riskLevel?.toLowerCase()}`}>
                            {networkStatus?.currentClient.riskLevel}
                        </span>
                    </div>
                </div>
            </div>

            {/* Network Health Metrics */}
            <div className="metrics-grid">
                <div className="metric-card">
                    <div className="metric-icon">🔒</div>
                    <div className="metric-info">
                        <h4>Secured Endpoints</h4>
                        <div className="metric-value">
                            {networkStatus?.networkHealth.securedEndpoints}/{networkStatus?.networkHealth.totalEndpoints}
                        </div>
                        <div className="metric-progress">
                            <div 
                                className="progress-bar" 
                                style={{width: '100%'}}
                            ></div>
                        </div>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon">🛡️</div>
                    <div className="metric-info">
                        <h4>Blocked Attempts</h4>
                        <div className="metric-value">
                            {networkStatus?.networkHealth.blockedAttempts}
                        </div>
                        <small>Last 24 hours</small>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon">🔗</div>
                    <div className="metric-info">
                        <h4>VPN Connections</h4>
                        <div className="metric-value">
                            {networkStatus?.networkHealth.vpnConnections}
                        </div>
                        <small>Active now</small>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon">🌍</div>
                    <div className="metric-info">
                        <h4>Network Isolation</h4>
                        <div className="metric-value">ACTIVE</div>
                        <small>Azure Private Link</small>
                    </div>
                </div>
            </div>

            {/* Allowed Networks */}
            <div className="networks-section">
                <h3>✅ Allowed Network Ranges</h3>
                <div className="networks-grid">
                    {networkStatus?.allowedNetworks.map((network, index) => (
                        <div key={index} className="network-card">
                            <div className="network-header">
                                <span className="network-name">{network.name}</span>
                                <span className={`network-type ${network.type.toLowerCase()}`}>
                                    {network.type}
                                </span>
                            </div>
                            <div className="network-range">{network.range}</div>
                            <div className="network-devices">
                                <span className="device-count">{network.devices} devices</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Access Attempts */}
            <div className="access-attempts-section">
                <h3>📊 Recent Access Attempts</h3>
                <div className="attempts-list">
                    {accessAttempts.map(attempt => (
                        <div key={attempt.id} className={`attempt-item ${attempt.status.toLowerCase()}`}>
                            <div className="attempt-main">
                                <div className="attempt-ip">{attempt.ip}</div>
                                <div className="attempt-user">{attempt.user}</div>
                                <div className="attempt-endpoint">{attempt.endpoint}</div>
                                <div className={`attempt-status ${attempt.status.toLowerCase()}`}>
                                    {attempt.status}
                                </div>
                            </div>
                            <div className="attempt-meta">
                                <span className="attempt-time">
                                    {new Date(attempt.timestamp).toLocaleTimeString()}
                                </span>
                                <span className={`risk-score risk-${Math.floor(attempt.riskScore/20)}`}>
                                    Risk: {attempt.riskScore}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Azure Service Status */}
            <div className="azure-status-card">
                <div className="azure-header">
                    <h3>🛡️ Azure Security Center Integration</h3>
                    <div className="status-indicator active"></div>
                </div>
                <div className="azure-features">
                    <div className="feature">
                        <span className="feature-icon">🔍</span>
                        <span>Threat Detection</span>
                        <span className="feature-status active">ACTIVE</span>
                    </div>
                    <div className="feature">
                        <span className="feature-icon">📊</span>
                        <span>Security Analytics</span>
                        <span className="feature-status active">ACTIVE</span>
                    </div>
                    <div className="feature">
                        <span className="feature-icon">🌐</span>
                        <span>Network Security Groups</span>
                        <span className="feature-status active">ACTIVE</span>
                    </div>
                    <div className="feature">
                        <span className="feature-icon">🔒</span>
                        <span>Private Endpoints</span>
                        <span className="feature-status active">ACTIVE</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NetworkSecurityDashboard;