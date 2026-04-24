import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Primary UI Components
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';

import Register from './pages/Register';
import Invited from './pages/Invited';
import DashboardOverview from './pages/DashboardOverview';
import TaskList from './pages/TaskList';
import Notifications from './pages/Notifications';
import Team from './pages/Team';
import ChangePassword from './pages/ChangePassword';
import ActivityLog from './pages/ActivityLog';

/**
 * Route protection wrapper. Intercepts navigation if JWT Context determines session is missing.
 */
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (!user) return <Navigate to="/login" replace />;
    // Enforce password change restriction!
    if (user.must_change_password) return <Navigate to="/change-password" replace />;
    return children;
};

/**
 * Specifically for the ChangePassword page — only accessible if they are logged in BUT must_change_password=true
 */
const PasswordChangeRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (!user) return <Navigate to="/login" replace />;
    if (!user.must_change_password) return <Navigate to="/dashboard" replace />;
    return children;
};

/**
 * Public route wrapper explicitly blocking already-authenticated users from hitting login again.
 */
const AuthRoute = ({ children }) => {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (user) {
        if (user.must_change_password) return <Navigate to="/change-password" replace />;
        return <Navigate to="/dashboard" replace />;
    }
    return children;
};

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Open Authentication Portal */}
            <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
            <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />
            <Route path="/register/invite" element={<AuthRoute><Invited /></AuthRoute>} />
            
            {/* Fully Protected internal system routing mapped into Dashboard Layout visually */}
            <Route path="/change-password" element={<PasswordChangeRoute><ChangePassword /></PasswordChangeRoute>} />

            <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<DashboardOverview />} />
                <Route path="/activity-logs" element={<ActivityLog />} />
                <Route path="/tasks" element={<TaskList />} />
                <Route path="/team" element={<Team />} />
                <Route path="/notifications" element={<Notifications />} />
            </Route>
        </Routes>
    );
};

function App() {
  return (
    <AuthProvider>
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
