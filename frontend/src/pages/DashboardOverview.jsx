import React, { useEffect, useState } from 'react';
import { Target, CheckCircle2, Clock, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
    BarChart, Bar, Cell 
} from 'recharts';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

function DashboardOverview() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                if (isAdmin) {
                    const res = await client.get('/tasks/analytics');
                    setAnalytics(res.data);
                } else {
                    // Members still get basic numbers or nothing for now.
                    // This creates an opportunity to hit the existing /api/tasks endpoint and count them natively.
                    const taskRes = await client.get('/tasks');
                    const myTasks = taskRes.data.tasks || [];
                    setAnalytics({
                        memberOnly: true,
                        summary: {
                            total_tasks: myTasks.length,
                            completed_tasks: myTasks.filter(t => t.status === 'COMPLETED').length,
                            pending_tasks: myTasks.filter(t => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length,
                            overdue_tasks: myTasks.filter(t => t.status === 'OVERDUE').length
                        }
                    });
                }
            } catch (err) {
                console.error("Failed to load dashboard analytics", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [isAdmin]);

    if (loading) return <div style={{ padding: 40 }}>Loading Analytics Engine...</div>;

    // Derived summary for Admin
    let summary = { total_tasks: 0, completed_tasks: 0, pending_tasks: 0, overdue_tasks: 0 };
    if (analytics?.memberOnly) {
        summary = analytics.summary;
    } else if (analytics?.statusDistribution) {
        summary.total_tasks = analytics.statusDistribution.reduce((acc, curr) => acc + parseInt(curr.count), 0);
        summary.completed_tasks = parseInt(analytics.statusDistribution.find(s => s.status === 'COMPLETED')?.count || 0);
        summary.pending_tasks = parseInt(analytics.statusDistribution.find(s => s.status === 'PENDING' || s.status === 'IN_PROGRESS')?.count || 0);
        summary.overdue_tasks = parseInt(analytics.statusDistribution.find(s => s.status === 'OVERDUE')?.count || 0);
    }

    // Colors
    const COMPLETED_COLOR = '#10b981';
    const PRIMARY_COLOR = '#4f46e5';

    return (
        <div style={{ paddingBottom: '40px' }}>
            <h1 style={{ margin: '0 0 24px 0', fontSize: '24px' }}>Welcome back, {user?.name}</h1>
            
            {/* Top 4 Premium Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                <StatCard title="Total Tasks" value={summary.total_tasks} icon={<Target size={36} opacity={0.3} />} color="var(--card-total)" />
                <StatCard title="Completed" value={summary.completed_tasks} icon={<CheckCircle2 size={36} opacity={0.3} />} color="var(--card-completed)" />
                <StatCard title="Active & Pending" value={summary.pending_tasks} icon={<Clock size={36} opacity={0.3} />} color="var(--card-pending)" />
                <StatCard title="Overdue" value={summary.overdue_tasks} icon={<AlertTriangle size={36} opacity={0.3} />} color="var(--card-overdue)" />
            </div>

            {/* Analytics Engine (Admin Only) */}
            {isAdmin && !analytics?.memberOnly && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                    
                    {/* Completion Timeline Chart (30 Days) */}
                    <div className="card" style={{ padding: '24px' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 24px 0', fontSize: '16px' }}>
                            <TrendingUp size={20} color={PRIMARY_COLOR} /> 30-Day Completion Rate
                        </h3>
                        <div style={{ height: '300px', width: '100%' }}>
                            {analytics?.timeline?.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={analytics.timeline}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                        <XAxis dataKey="date" tick={{fontSize: 12, fill: 'var(--text)', opacity: 0.5}} tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} />
                                        <YAxis allowDecimals={false} tick={{fontSize: 12, fill: 'var(--text)', opacity: 0.5}} />
                                        <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                        <Line type="monotone" dataKey="completed_count" stroke={PRIMARY_COLOR} strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} name="Completed Tasks" />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>Not enough data collected.</div>
                            )}
                        </div>
                    </div>

                    {/* Top Performers Bar Chart */}
                    <div className="card" style={{ padding: '24px' }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 24px 0', fontSize: '16px' }}>
                            <Users size={20} color={COMPLETED_COLOR} /> Top Performers (Completed)
                        </h3>
                        <div style={{ height: '300px', width: '100%' }}>
                            {analytics?.topPerformers?.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analytics.topPerformers} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: 'var(--text)', fontWeight: 500}} width={100} />
                                        <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                        <Bar dataKey="task_count" radius={[0, 4, 4, 0]} barSize={24} name="Tasks Completed">
                                            {analytics.topPerformers.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COMPLETED_COLOR} fillOpacity={0.8 - (index * 0.15)} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>No completions yet.</div>
                            )}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}

// Reusable card design component matching the previous design
const StatCard = ({ title, value, icon, color }) => (
    <div className="card" style={{ borderLeft: `5px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text)', opacity: 0.7, fontWeight: 500 }}>{title}</p>
            <h2 style={{ margin: '8px 0 0 0', fontSize: '32px', color: title === 'Overdue' ? color : 'var(--text)' }}>{value}</h2>
        </div>
        <div style={{ color }}>{icon}</div>
    </div>
);

export default DashboardOverview;
