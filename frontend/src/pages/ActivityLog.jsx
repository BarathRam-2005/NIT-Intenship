import { useEffect, useState } from 'react';
import { Activity, Clock } from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function ActivityLog() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAdmin) return;
        client.get('/tasks/activity-logs')
            .then(res => setLogs(res.data.logs || []))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, [isAdmin]);

    if (!isAdmin) {
        return <div style={{ padding: 40, textAlign: 'center' }}>Unauthorized Access</div>;
    }

    if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading audit logs...</div>;

    const getActionColor = (action) => {
        switch(action) {
            case 'CREATED': return '#3b82f6';
            case 'UPDATED': return '#f59e0b';
            case 'COMPLETED': return '#10b981';
            case 'APPROVED': return '#8b5cf6';
            case 'DELETED': return '#ef4444';
            default: return 'var(--text)';
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <Activity size={28} style={{ color: 'var(--primary)' }} /> Audit & Activity Logs
            </h1>

            <div className="card" style={{ padding: '24px' }}>
                {logs.length === 0 ? (
                    <div style={{ textAlign: 'center', opacity: 0.6, padding: '24px' }}>No recorded activity yet.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {logs.map(log => (
                            <div key={log.id} style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '16px', lastChild: { borderBottom: 'none', paddingBottom: 0 }}}>
                                <div style={{ minWidth: '40px', height: '40px', borderRadius: '50%', background: `${getActionColor(log.action)}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Clock size={18} style={{ color: getActionColor(log.action) }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '14px', marginBottom: '4px' }}>
                                        <strong style={{ color: 'var(--text)' }}>{log.actor_name || 'System / Deleted User'}</strong> 
                                        <span style={{ opacity: 0.7, margin: '0 6px' }}>{log.action.toLowerCase().replace('_', ' ')}</span>
                                        <strong style={{ color: 'var(--text)' }}>{log.task_title || 'Unknown Task'}</strong>
                                    </div>
                                    <div style={{ fontSize: '12px', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {new Date(log.timestamp).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
