import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, CheckSquare, Bell, LogOut, Users, Activity } from 'lucide-react';

const DashboardLayout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
            
            {/* Sidebar matching requested specs -> Darker grey (--primary) */}
            <aside style={{
                width: '260px',
                backgroundColor: 'var(--primary)',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                padding: '24px 16px',
                boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
                zIndex: 10
            }}>
                <div style={{ paddingBottom: '40px', paddingLeft: '8px' }}>
                    <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, letterSpacing: '0.2px' }}>
                         Task Management
                    </h2>
                </div>

                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <Link to="/dashboard" style={getNavStyle(location.pathname === '/dashboard')}>
                        <LayoutDashboard size={20} /> Dashboard Overview
                    </Link>
                    <Link to="/tasks" style={getNavStyle(location.pathname === '/tasks')}>
                        <CheckSquare size={20} /> Task Engine
                    </Link>
                    {user?.role === 'ADMIN' && (
                        <>
                            <Link to="/team" style={getNavStyle(location.pathname === '/team')}>
                                <Users size={20} /> Team Members
                            </Link>
                            <Link to="/activity-logs" style={getNavStyle(location.pathname === '/activity-logs')}>
                                <Activity size={20} /> Activity Logs
                            </Link>
                        </>
                    )}
                </nav>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
                    <button onClick={logout} style={{ ...getNavStyle(false), width: '100%', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                        <LogOut size={20} /> Terminate Session
                    </button>
                </div>
            </aside>

            {/* Main background matching responsive Light grey (--background) */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--background)' }}>
                
                {/* Fixed Top Header (White card aesthetic) */}
                <header style={{
                    height: '64px',
                    backgroundColor: 'var(--card)',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    padding: '0 32px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                        
                        {/* Interactive Notification Bell */}
                        <Link to="/notifications" style={{ color: 'inherit', display: 'flex' }}>
                            <div style={{ cursor: 'pointer', position: 'relative' }}>
                                <Bell size={22} color="var(--primary)" />
                                {/* Visual Red Dot for unread simulation */}
                                <span style={{ position: 'absolute', top: -3, right: -2, width: 9, height: 9, background: 'var(--notif-urgent)', borderRadius: '50%', border: '2px solid white' }} />
                            </div>
                        </Link>
                        
                        {/* Profile Area */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderLeft: '1px solid var(--border)', paddingLeft: '24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>{user?.name || 'Authorized Member'}</span>
                                <span style={{ fontSize: '12px', color: 'var(--text)', opacity: 0.6 }}>{user?.organization_id ? 'Organization Connected' : user?.email}</span>
                            </div>
                            
                            {/* Strict mapping to your specific role badge CSS variables */}
                            <div style={{
                                background: user?.role === 'ADMIN' ? 'var(--role-admin)' : 'var(--role-member)',
                                color: 'white',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                letterSpacing: '0.5px'
                            }}>
                                {user?.role || 'MEMBER'}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Sub-routing Injector */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

// Extracted style generator for cleanliness
const getNavStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '8px',
    color: 'white',
    textDecoration: 'none',
    backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
    transition: 'background-color 0.2s, transform 0.1s',
    fontSize: '14px',
    fontWeight: 500,
    transform: isActive ? 'none' : 'scale(1)',
});

export default DashboardLayout;
