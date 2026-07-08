/**
 * Authentication context — manages user state, login, register, logout.
 * Persists token + user to localStorage for session recovery.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Restore session from localStorage on mount ────────────────────────
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const saveSession = useCallback((tokenVal, userVal) => {
    localStorage.setItem('token', tokenVal);
    localStorage.setItem('user', JSON.stringify(userVal));
    setToken(tokenVal);
    setUser(userVal);
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await authAPI.login({ username, password });
    saveSession(res.data.access_token, res.data.user);
    return res.data;
  }, [saveSession]);

  const register = useCallback(async (username, email, password, role = 'customer') => {
    const res = await authAPI.register({ username, email, password, role });
    saveSession(res.data.access_token, res.data.user);
    return res.data;
  }, [saveSession]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'admin',
    isCustomer: user?.role === 'customer',
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
