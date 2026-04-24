import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Target, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

function DashboardStats() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Instantly grabs robust aggregation payload from backend!
                const res = await client.get('/dashboard/stats');
                setStats(res.data);
            } catch (err) {
                console.error("Failed to load dashboard stats", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div style={{ padding: 40 }}>Loading Analytics Dashboard...</div>;

    const summary = stats?.summary || { total_tasks: 0, completed_tasks: 0, pending_tasks: 0, overdue_tasks: 0 };

    return (
        <div>
            <h1 style={{ margin: '0 0 24px 0', fontSize: '24px' }}>Welcome back, {user?.name}</h1>
            
            {/* Top 4 Premium Stat Cards - Integrating requested borders! */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
                
                <div className="card" style={{ borderLeft: '5px solid var(--card-total)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text)', opacity: 0.7, fontWeight: 500 }}>Total Tasks</p>
                            <h2 style={{ margin: '8px 0 0 0', fontSize: '32px' }}>{summary.total_tasks}</h2>
                        </div>
                        <Target size={36} color="var(--card-total)" opacity={0.15} />
                    </div>
                </div>

                <div className="card" style={{ borderLeft: '5px solid var(--card-completed)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text)', opacity: 0.7, fontWeight: 500 }}>Completed</p>
                            <h2 style={{ margin: '8px 0 0 0', fontSize: '32px' }}>{summary.completed_tasks}</h2>
                        </div>
                        <CheckCircle2 size={36} color="var(--card-completed)" opacity={0.15} />
                    </div>
                </div>

                <div className="card" style={{ borderLeft: '5px solid var(--card-pending)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text)', opacity: 0.7, fontWeight: 500 }}>Pending</p>
                            <h2 style={{ margin: '8px 0 0 0', fontSize: '32px' }}>{summary.pending_tasks}</h2>
                        </div>
                        <Clock size={36} color="var(--card-pending)" opacity={0.15} />
                    </div>
                </div>

                <div className="card" style={{ borderLeft: '5px solid var(--card-overdue)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text)', opacity: 0.7, fontWeight: 500 }}>Overdue</p>
                            <h2 style={{ margin: '8px 0 0 0', fontSize: '32px', color: 'var(--card-overdue)' }}>{summary.overdue_tasks}</h2>
                        </div>
                        <AlertTriangle size={36} color="var(--card-overdue)" opacity={0.15} />
                    </div>
                </div>

            </div>

            {/* Sub-layout: Recent Activity (left list) and Admin Details (right list) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="card" style={{ minHeight: '300px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Approaching Deadlines</h3>
                    
                    {/* Placeholder for Notifications stream iteration */}
                    <div style={{ padding: '16px', background: 'var(--background)', borderRadius: '8px', fontSize: '14px', color: 'var(--text)', opacity: 0.8 }}>
                        System monitoring active. Deadlines within 24 hours will escalate here automatically via Cron.
                    </div>
                </div>
                
                {/* Securely hidden from Members! */}
                {user?.role === 'ADMIN' && stats?.userStats && (
                    <div className="card" style={{ minHeight: '300px' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Organization Load Distribution (Admin)</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {stats.userStats.map((u, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--background)', borderRadius: '8px' }}>
                                    <span style={{ fontWeight: 500, fontSize: '14px' }}>{u.name}</span>
                                    <span className="badge badge-pending">{u.assigned_tasks} Actions Required</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default DashboardStats;
