import React, { useEffect, useState } from 'react';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Search, Plus, Calendar, Flag, CheckSquare, X, Loader, Trash2, CheckCircle, Clock, Edit2 } from 'lucide-react';

// ─── Create / Edit Task Modal ────────────────────────────────────────────────────────
function ComposeTaskModal({ onClose, onCreated, isAdmin, initialData = null }) {
    const { user } = useAuth();
    const [form, setForm] = useState(
        initialData ? {
            ...initialData,
            due_date: initialData.due_date ? new Date(initialData.due_date).toISOString().split('T')[0] : ''
        } : { title: '', description: '', priority: 'MEDIUM', due_date: '', assigned_to: '' }
    );
    const [members, setMembers] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Fetch org members for the "Assign To" dropdown (admins only)
    useEffect(() => {
        if (!isAdmin) return;
        client.get('/tasks/members')
            .then(res => {
                setMembers(res.data.members || []);
                if (!initialData) {
                    setForm(prev => ({ ...prev, assigned_to: user?.id?.toString() || '' }));
                }
            })
            .catch(() => {});
    }, [isAdmin, initialData]);

    const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) { setError('Task title is required.'); return; }
        setSubmitting(true);
        setError('');
        try {
            if (initialData) {
                // For editing (Admin only) - optionally clear extension request if due date changed
                const payload = { ...form };
                if (initialData.extension_requested) {
                    const initialDateStr = initialData.due_date ? new Date(initialData.due_date).toISOString().split('T')[0] : '';
                    if (form.due_date !== initialDateStr) {
                        payload.extension_requested = false; // Reset it if admin updated the date!
                    }
                }
                await client.put(`/tasks/${initialData.id}`, payload);
            } else {
                await client.post('/tasks', form);
            }
            onCreated();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || `Failed to ${initialData ? 'update' : 'create'} task.`);
        } finally {
            setSubmitting(false);
        }
    };


    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={onClose}>
            <div className="card" style={{
                width: '100%', maxWidth: 500, padding: '32px',
                borderRadius: '16px', position: 'relative',
                boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h2 style={{ margin: 0, fontSize: 20, color: 'var(--text)' }}>Compose Task</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', opacity: 0.6, padding: 4 }}>
                        <X size={20} />
                    </button>
                </div>

                {error && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#ef4444' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Title */}
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)', opacity: 0.8 }}>
                            Task Title <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                            className="input"
                            name="title"
                            placeholder="e.g. Design landing page mockup"
                            value={form.title}
                            onChange={handleChange}
                            style={{ width: '100%' }}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)', opacity: 0.8 }}>
                            Description
                        </label>
                        <textarea
                            className="input"
                            name="description"
                            placeholder="Optional — describe what needs to be done..."
                            value={form.description}
                            onChange={handleChange}
                            rows={3}
                            style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
                        />
                    </div>

                    {/* Assign To (Admin only) */}
                    {isAdmin && (
                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)', opacity: 0.8 }}>Assign To</label>
                            <select className="input" name="assigned_to" value={form.assigned_to} onChange={handleChange} style={{ width: '100%', cursor: 'pointer' }}>
                                <option value="">— Unassigned —</option>
                                {members.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.name} ({m.role}) — {m.email}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Priority + Due Date row */}
                    <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)', opacity: 0.8 }}>Priority</label>
                            <select className="input" name="priority" value={form.priority} onChange={handleChange} style={{ width: '100%', cursor: 'pointer' }}>
                                <option value="HIGH">🔴 High</option>
                                <option value="MEDIUM">🟡 Medium</option>
                                <option value="LOW">🟢 Low</option>
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)', opacity: 0.8 }}>Due Date</label>
                            <input
                                className="input"
                                type="date"
                                name="due_date"
                                value={form.due_date}
                                onChange={handleChange}
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 12, marginTop: 8, justifyContent: 'flex-end' }}>
                        <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: '10px 20px' }}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" disabled={submitting} style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
                            {submitting ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Plus size={16} /> {initialData ? 'Update Task' : 'Create Task'}</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ─── Task List Page ───────────────────────────────────────────────────────────
function TaskList() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [search, setSearch] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');

    const fetchTasks = async () => {
        try {
            const res = await client.get('/tasks');
            setTasks(res.data.tasks || []);
        } catch (err) {
            console.error("Failed to fetch tasks", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTasks(); }, [search, priorityFilter]);

    const handleQuickAction = async (id, payload) => {
        try {
            await client.put(`/tasks/${id}`, payload);
            fetchTasks();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update task.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to permanently delete this task?')) return;
        try {
            await client.delete(`/tasks/${id}`);
            fetchTasks();
        } catch (err) {
            alert('Failed to delete task.');
        }
    };

    const getBadgeClass = (status) => {
        if (status === 'COMPLETED') return 'badge-completed';
        if (status === 'OVERDUE') return 'badge-overdue';
        return 'badge-pending';
    };

    const filteredTasks = tasks.filter(t => {
        const matchSearch = (t.title || '').toLowerCase().includes(search.toLowerCase());
        const matchPriority = priorityFilter ? t.priority === priorityFilter : true;
        return matchSearch && matchPriority;
    });

    return (
        <div>
            {showModal && <ComposeTaskModal onClose={() => { setShowModal(false); setEditingTask(null); }} onCreated={fetchTasks} isAdmin={isAdmin} initialData={editingTask} />}

            {/* Filter Bar */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', padding: '12px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '60%' }}>
                    <div style={{ position: 'relative', width: '60%' }}>
                        <Search size={18} style={{ position: 'absolute', top: 11, left: 12, color: 'var(--text)', opacity: 0.5 }} />
                        <input className="input" placeholder="Search tasks by title..." style={{ paddingLeft: '40px' }} value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <select className="input" style={{ width: '30%', cursor: 'pointer' }} value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
                        <option value="">Any Priority</option>
                        <option value="HIGH">High Priority</option>
                        <option value="MEDIUM">Medium Priority</option>
                        <option value="LOW">Low Priority</option>
                    </select>
                </div>
                {isAdmin && (
                    <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => { setEditingTask(null); setShowModal(true); }}>
                        <Plus size={18} /> Compose Task
                    </button>
                )}
            </div>

            {loading ? (
                <div style={{ padding: 40, textAlign: 'center' }}>Synchronizing task stream...</div>
            ) : filteredTasks.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '64px', color: 'var(--text)', opacity: 0.6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div style={{ background: 'var(--background)', padding: '16px', borderRadius: '50%' }}>
                        <CheckSquare size={32} opacity={0.5} />
                    </div>
                    <span>No active tasks were found. Assign a new task!</span>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                    {filteredTasks.map(task => (
                        <div key={task.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', cursor: 'grab', transition: 'transform 0.2s' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span className={`badge ${getBadgeClass(task.status)}`}>{(task.status || 'PENDING').replace('_', ' ')}</span>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)', opacity: 0.5, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Flag size={12} /> {task.priority}
                                </span>
                            </div>
                            <div>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: 'var(--text)' }}>{task.title}</h3>
                                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text)', opacity: 0.7, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.5' }}>
                                    {task.description || 'No description provided.'}
                                </p>
                            </div>
                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: 'auto', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text)', opacity: 0.7 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} /> Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'N/A'}</span>
                            </div>

                            {/* Role-Based Action Bar */}
                            {isAdmin && task.extension_requested && (
                                <div style={{ display: 'flex', gap: 8, marginTop: '8px' }}>
                                    <div style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706', padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, flex: 2, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                        <Clock size={14} /> Extension Requested
                                    </div>
                                    <button onClick={() => handleQuickAction(task.id, { extension_requested: false })} className="btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        Dismiss
                                    </button>
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 8, marginTop: '8px' }}>
                                {isAdmin ? (
                                    <>
                                        {task.status === 'COMPLETED' && !task.completion_approved && (
                                            <>
                                                <button onClick={() => handleQuickAction(task.id, { completion_approved: true })} className="btn-primary" style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                    <CheckCircle size={14} /> Approve
                                                </button>
                                                <button onClick={() => {
                                                    const reason = window.prompt("Enter remarks for returning this task:");
                                                    if (reason !== null) {
                                                        handleQuickAction(task.id, { status: 'IN_PROGRESS', completion_approved: false, admin_remark: reason });
                                                    }
                                                }} className="btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '12px', color: '#ea580c', borderColor: 'rgba(234,88,12,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                    <X size={14} /> Reject
                                                </button>
                                            </>
                                        )}
                                        {(!task.completion_approved) && (
                                            <>
                                                <button onClick={() => { setEditingTask(task); setShowModal(true); }} className="btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                    <Edit2 size={14} /> Edit
                                                </button>
                                                <button onClick={() => handleDelete(task.id)} className="btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '12px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                    <Trash2 size={14} /> Delete
                                                </button>
                                            </>
                                        )}
                                        {task.completion_approved && (
                                            <div style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a', padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, flex: 1, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                <CheckCircle size={14} /> Approved
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {task.status !== 'COMPLETED' && (
                                            <button onClick={() => handleQuickAction(task.id, { status: 'COMPLETED' })} className="btn-primary" style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                <CheckSquare size={14} /> Complete
                                            </button>
                                        )}
                                        {!task.extension_requested && task.status !== 'COMPLETED' && (
                                            <button onClick={() => handleQuickAction(task.id, { extension_requested: true })} className="btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                <Clock size={14} /> Need Extension
                                            </button>
                                        )}
                                        {task.extension_requested && (
                                            <div style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706', padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, flex: 1, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                <Clock size={14} /> Ext. Requested
                                            </div>
                                        )}
                                        {task.status === 'COMPLETED' && !task.completion_approved && (
                                            <div style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, flex: 1, textAlign: 'center' }}>
                                                Pending Admin Approval
                                            </div>
                                        )}
                                        {task.completion_approved && (
                                            <div style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a', padding: '8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, flex: 1, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                <CheckCircle size={14} /> Approved
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

export default TaskList;
