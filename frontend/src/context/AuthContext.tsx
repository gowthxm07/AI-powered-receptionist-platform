'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, LoginInput, RegisterInput } from '../types/auth';
import { api, ApiError } from '../lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.auth.me();
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (input: LoginInput) => {
    const res = await api.auth.login(input);
    if (res.success && res.data) {
      setUser(res.data);
    } else {
      throw new ApiError(res.message || 'Login failed', 400);
    }
  };

  const register = async (input: RegisterInput) => {
    const res = await api.auth.register(input);
    if (res.success && res.data) {
      setUser(res.data);
    } else {
      throw new ApiError(res.message || 'Registration failed', 400);
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
