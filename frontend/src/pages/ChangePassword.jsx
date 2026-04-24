import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Lock, CheckCircle } from 'lucide-react';

function ChangePassword() {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await client.post('/auth/change-password', { newPassword: password });
            
            // Instantly clear the restriction locally so ProtectedRoute allows them into Dashboard
            updateUser({ must_change_password: false });
            
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update password.');
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--background)' }}>
            <div className="card" style={{ width: 400, padding: 32 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <div style={{ background: 'var(--role-admin)', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <Lock size={24} color="white" />
                    </div>
                    <h2 style={{ margin: 0, color: 'var(--text)', fontSize: 22 }}>Welcome, {user?.name}!</h2>
                    <p style={{ margin: '8px 0 0', color: 'var(--text)', opacity: 0.6, fontSize: 14 }}>
                        Since this is your first time logging in, you must create a new secure password to continue.
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text)', opacity: 0.8 }}>
                            New Password
                        </label>
                        <input
                            className="input"
                            type="password"
                            placeholder="Enter a strong password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && (
                        <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 8, color: '#ef4444', fontSize: 13 }}>
                            {error}
                        </div>
                    )}

                    <button type="submit" className="btn-primary" disabled={loading} style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}>
                        {loading ? 'Updating...' : <><CheckCircle size={18} /> Save & Continue</>}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default ChangePassword;
