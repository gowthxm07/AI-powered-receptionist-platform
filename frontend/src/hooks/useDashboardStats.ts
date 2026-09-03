'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardStats } from '../types/dashboard';
import { api, ApiError } from '../lib/api';
import { useBusiness } from '../context/BusinessContext';

const initialStats: DashboardStats = {
  totalCustomers: 0,
  activeStaff: 0,
  totalStaff: 0,
  availableServices: 0,
  totalServices: 0,
  upcomingAppointments: 0,
};

export function useDashboardStats() {
  const { selectedBusinessId, loading: loadingBusiness } = useBusiness();
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (loadingBusiness) return;

    // If user has no businesses registered
    if (!selectedBusinessId) {
      setStats(initialStats);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch real business-scoped data in parallel
      const [customersRes, staffRes, servicesRes, appointmentsRes] = await Promise.all([
        api.customers.getAll(selectedBusinessId),
        api.staff.getAll(selectedBusinessId),
        api.services.getAll(selectedBusinessId),
        api.appointments.getAll({ businessId: selectedBusinessId }),
      ]);

      const customers = customersRes.success && Array.isArray(customersRes.data) ? customersRes.data : [];
      const staff = staffRes.success && Array.isArray(staffRes.data) ? staffRes.data : [];
      const services = servicesRes.success && Array.isArray(servicesRes.data) ? servicesRes.data : [];
      const appointments = appointmentsRes.success && Array.isArray(appointmentsRes.data) ? appointmentsRes.data : [];

      const activeStaffCount = staff.filter((s) => s.isActive).length;
      const availableServicesCount = services.filter((s) => s.isActive).length;
      const activeAppointmentsCount = appointments.filter(
        (a) => a.status === 'SCHEDULED' || a.status === 'CONFIRMED'
      ).length;

      setStats({
        totalCustomers: customers.length,
        activeStaff: activeStaffCount,
        totalStaff: staff.length,
        availableServices: availableServicesCount,
        totalServices: services.length,
        upcomingAppointments: activeAppointmentsCount,
      });
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
      const msg = err instanceof ApiError ? err.message : 'Unable to load statistics';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedBusinessId, loadingBusiness]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading: loading || loadingBusiness,
    error,
    refetch: fetchStats,
  };
}
