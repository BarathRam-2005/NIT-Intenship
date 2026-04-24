import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    
    // Controlled Form State
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setCredentials({...credentials, [e.target.name]: e.target.value});
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await client.post('/auth/login', credentials);
            
            // Push payload explicitly into Global State
            login(res.data.user, res.data.accessToken, res.data.refreshToken);
            navigate('/dashboard'); // Interceptor forces them into system
        } catch (err) {
            setError(err.response?.data?.message || 'A network error occurred connecting to the backend.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--background)' }}>
            
            <div className="card" style={{ width: '420px', display: 'flex', flexDirection: 'column', gap: '24px', padding: '32px' }}>
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ margin: 0, color: 'var(--text)', fontSize: '26px' }}>Welcome Back</h2>
                    <p style={{ margin: '8px 0 0 0', color: 'var(--text)', opacity: 0.6, fontSize: '14px' }}>Sign in to your organization workspace</p>
                </div>
                
                {error && (
                    <div style={{ background: 'var(--notif-urgent)', color: 'white', padding: '12px', borderRadius: '8px', fontSize: '14px', textAlign: 'center', fontWeight: 500 }}>
                        {error}
                    </div>
                )}
                
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>Email Address</label>
                        <input className="input" type="email" name="email" required placeholder="name@example.com" value={credentials.email} onChange={handleChange} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', fontWeight: 500 }}>Password</label>
                        <input className="input" type="password" name="password" required placeholder="Enter password" value={credentials.password} onChange={handleChange} />
                    </div>
                    
                    <button type="submit" className="btn-primary" style={{ marginTop: '12px', height: '44px' }} disabled={loading}>
                        {loading ? 'Authenticating...' : 'Log In Securely'}
                    </button>
                    
                </form>

                <div style={{ textAlign: 'center', fontSize: '14px' }}>
                    Need a new workspace? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Register Organization</Link>
                </div>
            </div>
        </div>
    );
}

export default Login;
