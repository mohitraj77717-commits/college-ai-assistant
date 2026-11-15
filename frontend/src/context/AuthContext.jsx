import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, tokenStorage } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Rehydrate session from stored token on page load
  useEffect(() => {
    async function rehydrateUser() {
      const token = tokenStorage.get();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.getMe();
        if (res.success && res.data?.user) {
          setUser(res.data.user);
        } else {
          // Token is invalid or expired
          tokenStorage.clear();
          setUser(null);
        }
      } catch (err) {
        tokenStorage.clear();
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    rehydrateUser();
  }, []);

  // --- Student Registration ---
  const registerStudent = async (studentData) => {
    setAuthError(null);
    const res = await api.registerStudent(studentData);
    if (res.success && res.data) {
      tokenStorage.set(res.data.token);
      setUser(res.data.user);
      return { success: true, user: res.data.user };
    }
    setAuthError(res.error);
    return { success: false, error: res.error };
  };

  // --- Student Login ---
  const loginStudent = async (credentials) => {
    setAuthError(null);
    const res = await api.loginStudent(credentials);
    if (res.success && res.data) {
      tokenStorage.set(res.data.token);
      setUser(res.data.user);
      return { success: true, user: res.data.user };
    }
    setAuthError(res.error);
    return { success: false, error: res.error };
  };

  // --- Teacher Registration ---
  const registerTeacher = async (teacherData) => {
    setAuthError(null);
    const res = await api.registerTeacher(teacherData);
    if (res.success) {
      return { success: true, message: res.data.message };
    }
    setAuthError(res.error);
    return { success: false, error: res.error };
  };

  // --- Teacher Login ---
  const loginTeacher = async (credentials) => {
    setAuthError(null);
    const res = await api.loginTeacher(credentials);
    if (res.success && res.data) {
      tokenStorage.set(res.data.token);
      setUser(res.data.user);
      return { success: true, user: res.data.user };
    }
    setAuthError(res.error);
    return {
      success: false,
      error: res.error,
      errorType: res.errorType,
      isPending: res.errorType === 'AccountPendingApproval'
    };
  };

  // --- Admin Setup ---
  const setupAdmin = async (setupData) => {
    setAuthError(null);
    const res = await api.setupAdmin(setupData);
    if (res.success && res.data) {
      tokenStorage.set(res.data.token);
      setUser(res.data.user);
      return { success: true, user: res.data.user };
    }
    setAuthError(res.error);
    return { success: false, error: res.error };
  };

  // --- Admin Login ---
  const loginAdmin = async (credentials) => {
    setAuthError(null);
    const res = await api.loginAdmin(credentials);
    if (res.success && res.data) {
      tokenStorage.set(res.data.token);
      setUser(res.data.user);
      return { success: true, user: res.data.user };
    }
    setAuthError(res.error);
    return { success: false, error: res.error };
  };

  // --- Logout ---
  const logout = () => {
    tokenStorage.clear();
    setUser(null);
    setAuthError(null);
    api.logout().catch(() => {});
  };

  const value = {
    user,
    role: user?.role || null,
    isAuthenticated: !!user,
    loading,
    authError,
    setAuthError,
    registerStudent,
    loginStudent,
    registerTeacher,
    loginTeacher,
    setupAdmin,
    loginAdmin,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
