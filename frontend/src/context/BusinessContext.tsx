'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Business } from '../types/dashboard';
import { api, ApiError } from '../lib/api';
import { useAuth } from './AuthContext';

interface BusinessContextType {
  businesses: Business[];
  selectedBusiness: Business | null;
  selectedBusinessId: string | null;
  loading: boolean;
  error: string | null;
  selectBusiness: (id: string) => void;
  refreshBusinesses: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

const STORAGE_KEY = 'receptionist_selected_business_id';

export const BusinessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshBusinesses = useCallback(async () => {
    if (!isAuthenticated) {
      setBusinesses([]);
      setSelectedBusinessId(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.businesses.getAll();

      if (res.success && Array.isArray(res.data)) {
        const owned = res.data;
        setBusinesses(owned);

        if (owned.length > 0) {
          // Check if previously saved preference exists in owned list
          const savedId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
          const matched = owned.find((b) => b.id === savedId);

          if (matched) {
            setSelectedBusinessId(matched.id);
          } else {
            // Default to first owned business
            setSelectedBusinessId(owned[0].id);
            if (typeof window !== 'undefined') {
              localStorage.setItem(STORAGE_KEY, owned[0].id);
            }
          }
        } else {
          setSelectedBusinessId(null);
        }
      } else {
        setBusinesses([]);
        setSelectedBusinessId(null);
      }
    } catch (err) {
      console.error('Failed to load owned businesses:', err);
      const message = err instanceof ApiError ? err.message : 'Unable to load businesses';
      setError(message);
      setBusinesses([]);
      setSelectedBusinessId(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshBusinesses();
  }, [refreshBusinesses]);

  const selectBusiness = (id: string) => {
    const exists = businesses.some((b) => b.id === id);
    if (exists) {
      setSelectedBusinessId(id);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, id);
      }
    }
  };

  const selectedBusiness = businesses.find((b) => b.id === selectedBusinessId) || null;

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        selectedBusiness,
        selectedBusinessId,
        loading,
        error,
        selectBusiness,
        refreshBusinesses,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = (): BusinessContextType => {
  const context = useContext(BusinessContext);
  if (!context) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
};
