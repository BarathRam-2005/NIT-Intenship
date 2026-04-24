import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Copy, Check, Users, Mail, ShieldCheck, User } from 'lucide-react';

// ─── Role Badge ───────────────────────────────────────────────────────────────
function RoleBadge({ role }) {
    const isAdmin = role === 'ADMIN';
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: isAdmin ? 'var(--role-admin)' : 'var(--role-member)',
            color: 'white', letterSpacing: '0.4px',
        }}>
            {isAdmin ? <ShieldCheck size={11} /> : <User size={11} />}
            {role}
        </span>
    );
}

// ─── Add Member Modal ─────────────────────────────────────────────────────────
function AddMemberModal({ onClose, onAdded }) {
    const [form, setForm] = useState({ name: '', email: '' });
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim() || !form.email.trim()) { setError('Name and email are required.'); return; }
        setLoading(true); setError('');
        try {
            await client.post('/tasks/members', form);
            setSuccess(true);
            onAdded(); // Refresh members list
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add member.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={onClose}>
            <div className="card" style={{ width: '100%', maxWidth: 480, padding: 32, borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.3)' }}
                onClick={e => e.stopPropagation()}>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <div style={{ background: 'var(--role-admin)', borderRadius: 10, padding: 8, display: 'flex' }}>
                        <UserPlus size={20} color="white" />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text)' }}>Add Team Member</h2>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', opacity: 0.6 }}>Add an employee directly to your organization</p>
                    </div>
                </div>

                {!success ? (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)', opacity: 0.8 }}>
                                Employee Name <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <User size={16} style={{ position: 'absolute', top: 12, left: 12, color: 'var(--text)', opacity: 0.4 }} />
                                <input
                                    className="input"
                                    placeholder="Jane Doe"
                                    value={form.name}
                                    onChange={e => setForm(prev => ({...prev, name: e.target.value}))}
                                    style={{ width: '100%', paddingLeft: 38 }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)', opacity: 0.8 }}>
                                Employee Email <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', top: 12, left: 12, color: 'var(--text)', opacity: 0.4 }} />
                                <input
                                    className="input"
                                    type="email"
                                    placeholder="employee@company.com"
                                    value={form.email}
                                    onChange={e => setForm(prev => ({...prev, email: e.target.value}))}
                                    style={{ width: '100%', paddingLeft: 38 }}
                                />
                            </div>
                        </div>

                        {error && (
                            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ef4444' }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 4 }}>
                            <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: '10px 20px' }}>Cancel</button>
                            <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                {loading ? 'Adding...' : <><UserPlus size={16} /> Add Member</>}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: 8, padding: '14px 16px', fontSize: 14, color: '#16a34a' }}>
                            ✅ <strong>{form.name}</strong> was added to the team!
                        </div>

                        <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: 8, padding: '16px', color: 'var(--text)' }}>
                            <p style={{ margin: '0 0 12px', fontSize: 14, opacity: 0.8 }}>
                                Their account was created with a temporary default password. Share these details with them securely:
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, fontSize: 15 }}>
                                <span style={{ opacity: 0.5, fontWeight: 600 }}>Email:</span>
                                <strong>{form.email}</strong>
                                <span style={{ opacity: 0.5, fontWeight: 600 }}>Password:</span>
                                <strong style={{ color: 'var(--primary)', letterSpacing: '0.5px' }}>Welcome@123</strong>
                            </div>
                            <p style={{ margin: '12px 0 0', fontSize: 13, opacity: 0.7, borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: 12 }}>
                                🔒 <em>They will automatically be forced to choose a new password the first time they log in.</em>
                            </p>
                        </div>

                        <button onClick={onClose} className="btn-primary" style={{ padding: '10px 20px', alignSelf: 'flex-end' }}>Done</button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Team Page ────────────────────────────────────────────────────────────────
function Team() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showInvite, setShowInvite] = useState(false);

    const fetchMembers = async () => {
        try {
            const res = await client.get('/tasks/members');
            setMembers(res.data.members || []);
        } catch (err) {
            console.error('Failed to fetch members', err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleSuspend = async (memberId, currentSuspendStatus) => {
        try {
            await client.put(`/tasks/members/${memberId}/status`, { suspend: !currentSuspendStatus });
            fetchMembers();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update member status.');
        }
    };

    useEffect(() => { fetchMembers(); }, []);

    return (
        <div>
            {showInvite && <AddMemberModal onClose={() => setShowInvite(false)} onAdded={fetchMembers} />}

            {/* Header Bar */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, padding: '12px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Users size={20} color="var(--primary)" />
                    <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
                        Team Members
                        <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 400, opacity: 0.5 }}>({members.length} total)</span>
                    </span>
                </div>
                {isAdmin && (
                    <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setShowInvite(true)}>
                        <UserPlus size={18} /> Add Employee
                    </button>
                )}
            </div>

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center', opacity: 0.5 }}>Loading team...</div>
            ) : members.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 64, opacity: 0.5 }}>
                    <Users size={32} style={{ marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
                    <p>No team members yet. Add your first employee!</p>
                </div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--background)', borderBottom: '1px solid var(--border)' }}>
                                <th style={thStyle}>Name</th>
                                <th style={thStyle}>Email</th>
                                <th style={thStyle}>Role</th>
                                {isAdmin && <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {members.map((m, i) => (
                                <tr key={m.id} style={{
                                    borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none',
                                    transition: 'background 0.15s',
                                    background: m.id === user?.id ? 'rgba(99,102,241,0.04)' : 'transparent',
                                }}>
                                    <td style={tdStyle}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{
                                                width: 34, height: 34, borderRadius: '50%',
                                                background: 'var(--role-admin)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0,
                                            }}>
                                                {m.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <span style={{ fontWeight: 600, color: 'var(--text)', textDecoration: m.deleted_at ? 'line-through' : 'none', opacity: m.deleted_at ? 0.4 : 1 }}>
                                                {m.name}
                                                {m.id === user?.id && <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.5 }}>(you)</span>}
                                                {m.deleted_at && <span style={{ marginLeft: 8, fontSize: 10, background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: 10 }}>SUSPENDED</span>}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ ...tdStyle, opacity: 0.7 }}>{m.email}</td>
                                    <td style={tdStyle}><RoleBadge role={m.role} /></td>
                                    {isAdmin && (
                                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                                            {m.id !== user?.id && m.role !== 'ADMIN' && (
                                                <button 
                                                    onClick={() => handleToggleSuspend(m.id, !!m.deleted_at)}
                                                    className={m.deleted_at ? 'btn-primary' : 'btn-secondary'} 
                                                    style={{ padding: '6px 12px', fontSize: 12, color: m.deleted_at ? 'white' : '#ef4444', borderColor: m.deleted_at ? 'transparent' : 'rgba(239,68,68,0.2)' }}
                                                >
                                                    {m.deleted_at ? 'Reactivate' : 'Suspend'}
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

const thStyle = { padding: '12px 20px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: 'var(--text)', opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.5px' };
const tdStyle = { padding: '14px 20px', fontSize: 14, color: 'var(--text)' };

export default Team;
