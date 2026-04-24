import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

function Register() {
    const { login } = useAuth();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({ orgName: '', userName: '', email: '', password: '' });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Simultaneously generates a root Organization AND an Admin user mapping
            const res = await client.post('/auth/register', formData);
            login(res.data.user, res.data.accessToken, res.data.refreshToken);
            navigate('/dashboard'); // Successfully logged in! Jump to system.
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed processing.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--background)' }}>
            <div className="card" style={{ width: '460px', padding: '36px' }}>
                <h2 style={{ margin: '0 0 24px 0', textAlign: 'center', color: 'var(--text)' }}>Establish Organization</h2>
                
                {error && <div style={{ background: 'var(--notif-urgent)', color: 'white', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', fontWeight: 500 }}>{error}</div>}
                
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ fontSize: '14px', marginBottom: '8px', display: 'block', fontWeight: 500 }}>Workspace Title</label>
                        <input className="input" name="orgName" required onChange={handleChange} placeholder="e.g. Acme Corporation" />
                    </div>
                    <div>
                        <label style={{ fontSize: '14px', marginBottom: '8px', display: 'block', fontWeight: 500 }}>Your Legal Name</label>
                        <input className="input" name="userName" required onChange={handleChange} placeholder="First Last" />
                    </div>
                    <div>
                        <label style={{ fontSize: '14px', marginBottom: '8px', display: 'block', fontWeight: 500 }}>Administrator Email</label>
                        <input className="input" type="email" name="email" required onChange={handleChange} placeholder="admin@acme.com" />
                    </div>
                    <div>
                        <label style={{ fontSize: '14px', marginBottom: '8px', display: 'block', fontWeight: 500 }}>Root Password</label>
                        <input className="input" type="password" name="password" required onChange={handleChange} />
                    </div>
                    
                    <button type="submit" className="btn-primary" style={{ marginTop: '16px', height: '44px' }} disabled={loading}>
                        {loading ? 'Provisioning Tenant...' : 'Initialize Secure Workspace'}
                    </button>
                    
                    <div style={{ textAlign: 'center', fontSize: '14px', marginTop: '16px', color: 'var(--text)', opacity: 0.8 }}>
                        Already have an environment? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Log In here</Link>.
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Register;
