import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { AlertCircle, Check } from 'lucide-react';

function Notifications() {
    const [notifications, setNotifications] = useState([]);
    
    useEffect(() => {
        // Fetch raw notification triggers generated autonomously by Deadline Cron system + Invites
        client.get('/notifications').then(res => setNotifications(res.data.notifications || []));
    }, []);

    const markAsRead = async (id) => {
        await client.put(`/notifications/${id}/read`);
        // Natively mutate React state dynamically instead of brute forcing a refresh!
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '24px' }}>System Alerts & Overdue Events</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {notifications.length === 0 && <div className="card" style={{ textAlign: 'center', padding: 40, opacity: 0.6 }}>System health nominal. No events to display.</div>}
                
                {notifications.map(n => (
                    // We map unread notifications explicitly to the YELLOW/WARNING CSS class requirement!
                    <div key={n.id} className={`card ${!n.is_read ? 'notif-warning' : ''}`} style={{ 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                        opacity: n.is_read ? 0.6 : 1, transition: 'all 0.2s',
                        borderLeft: !n.is_read ? '5px solid #EAB308' : '1px solid var(--border)' 
                    }}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <AlertCircle size={24} color={!n.is_read ? '#854D0E' : 'var(--text)'} />
                            <div>
                                <p style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: !n.is_read ? 600 : 400, color: !n.is_read ? '#854D0E' : 'inherit' }}>
                                    {n.message}
                                </p>
                                <span style={{ fontSize: '12px', opacity: 0.7 }}>Triggered: {new Date(n.created_at).toLocaleString()}</span>
                            </div>
                        </div>
                        {/* Dynamic read button functionality */}
                        {!n.is_read && (
                            <button onClick={() => markAsRead(n.id)} style={{ 
                                padding: '8px 12px', fontSize: '12px', fontWeight: 600, background: 'transparent', 
                                color: '#854D0E', border: '1px solid rgba(133, 77, 14, 0.3)', borderRadius: '6px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '4px'
                            }}>
                                <Check size={16} /> Mark as Read
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Notifications;
