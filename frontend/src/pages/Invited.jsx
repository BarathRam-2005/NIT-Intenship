import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

function Invited() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    // Automatically extract the secure cryptographic hash from the URL parameters
    const token = searchParams.get('token');
    
    const [inviteData, setInviteData] = useState(null);
    const [formData, setFormData] = useState({ name: '', password: '' });
    const [error, setError] = useState(null);

    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setError('CRITICAL: No invitation token provided inside URL handshake.');
                return;
            }
            try {
                // Instantly checks Postgres to assure hash hasn't expired (48 hours requirement mapped here natively)
                const res = await client.get(`/invites/${token}`);
                setInviteData(res.data.invitation);
            } catch (err) {
                setError('The invitation URL is invalid, tampered, or explicitly expired.');
            }
        };
        verifyToken();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // Send mapping request. Back-end ensures user receives MEMBER role, NOT Admin!
            const res = await client.post('/invites/accept', { token, ...formData });
            login(res.data.user, res.data.accessToken, res.data.refreshToken);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Handshake pipeline failure.');
        }
    };

    if (error) return <div style={{ padding: 60, color: 'var(--notif-urgent)', textAlign: 'center' }}><h2 style={{margin:0}}>Access Denied</h2><p style={{opacity:0.8}}>{error}</p></div>;
    if (!inviteData) return <div style={{ padding: 60, textAlign: 'center', opacity: 0.6 }}>Validating Cryptographic Identity Handshake...</div>;

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--background)' }}>
            <div className="card" style={{ width: '450px', padding: '32px' }}>
                <h2 style={{ margin: '0 0 8px 0', textAlign: 'center', color: 'var(--text)' }}>Welcome to {inviteData.organization_name}</h2>
                <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text)', opacity: 0.8, marginBottom: '24px' }}>
                    You have been invited mapped to <strong>{inviteData.email}</strong>. Please complete the profile.
                </p>
                
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ fontSize: '14px', marginBottom: '8px', display: 'block', fontWeight: 500 }}>Your Legal Name</label>
                        <input className="input" required onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Jane Doe" />
                    </div>
                    <div>
                        <label style={{ fontSize: '14px', marginBottom: '8px', display: 'block', fontWeight: 500 }}>Create Password</label>
                        <input className="input" type="password" required onChange={(e) => setFormData({...formData, password: e.target.value})} />
                    </div>
                    <button type="submit" className="btn-primary" style={{ marginTop: '12px', height: '44px' }}>Join the Platform</button>
                </form>
            </div>
        </div>
    );
}

export default Invited;
