import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // Stores dynamic user permissions: { id, email, role, organization_id }
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Re-hydrate full session securely if user reloads the browser
    useEffect(() => {
        const initAuth = () => {
            const token = localStorage.getItem('accessToken');
            const cachedUser = localStorage.getItem('userContext');
            
            if (token && cachedUser) {
                try {
                    setUser(JSON.parse(cachedUser));
                } catch (e) {
                    // Safe fallback
                    localStorage.removeItem('userContext');
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    // Bound directly to the Login/Registration payload from our Node backend!
    const login = (userData, accessToken, refreshToken) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('userContext', JSON.stringify(userData));
        setUser(userData);
    };

    // Update partial user data (e.g. after changing password)
    const updateUser = (newUserData) => {
        const merged = { ...user, ...newUserData };
        localStorage.setItem('userContext', JSON.stringify(merged));
        setUser(merged);
    };

    // Obliterate caching traces.
    const logout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userContext');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
