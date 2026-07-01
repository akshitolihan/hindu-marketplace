import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Validate the stored token against the server and load the user. Exposed so
  // flows that set a token directly (email verify, password reset) can refresh
  // the in-memory user without a full page reload.
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      return null;
    }
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
      return res.data;
    } catch {
      localStorage.removeItem('token');
      setUser(null);
      return null;
    }
  }, []);

  // On boot, validate any stored token.
  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const persist = (token, userData) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const login = async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      persist(data.token, data.user);
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Login failed' };
    }
  };

  const signup = async (name, email, password) => {
    try {
      const { data } = await api.post('/auth/signup', { name, email, password });
      // If verification is off, the backend returns a token and logs us in.
      if (data.token) persist(data.token, data.user);
      return {
        success: true,
        message: data.message,
        requiresVerification: !!data.requiresVerification,
        loggedIn: !!data.token
      };
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Signup failed' };
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, login, signup, logout, loading, refreshUser, isAdmin: user?.role === 'admin' }}
    >
      {children}
    </AuthContext.Provider>
  );
};
