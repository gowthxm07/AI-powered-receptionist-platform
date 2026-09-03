'use client';

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBusiness } from '../../context/BusinessContext';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { StatsCard } from './StatsCard';
import { QuickActions } from './QuickActions';
import { RecentActivity } from './RecentActivity';
import { AIReceptionistCard } from './AIReceptionistCard';
import { AIPerformanceCard } from './AIPerformanceCard';
import { SystemStatus } from './SystemStatus';
import {
  Users,
  UserCheck,
  Briefcase,
  Calendar,
  AlertCircle,
  RefreshCw,
  Building2,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export const DashboardOverview: React.FC = () => {
  const { user } = useAuth();
  const { selectedBusiness, loading: loadingBiz } = useBusiness();
  const { stats, loading: loadingStats, error, refetch } = useDashboardStats();

  const isAllEmpty =
    !loadingStats &&
    stats.totalCustomers === 0 &&
    stats.totalStaff === 0 &&
    stats.totalServices === 0;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900/30 via-indigo-900/30 to-purple-900/20 border border-indigo-500/20 p-6 sm:p-8 backdrop-blur-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Multi-Tenant Business Workspace</span>
              </div>

              {selectedBusiness && (
                <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Data Isolated: {selectedBusiness.name}</span>
                </div>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {user?.name || 'Receptionist'}! 👋
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl">
              {selectedBusiness ? (
                <>
                  Managing operations for <span className="text-white font-medium">{selectedBusiness.name}</span> ({selectedBusiness.phone}). All statistics, customers, staff, and services are scoped to this business.
                </>
              ) : (
                'Review your live business overview, customer records, staff roster, and AI receptionist readiness.'
              )}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => refetch()}
              disabled={loadingStats}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-all disabled:opacity-50"
              title="Refresh dashboard data from backend"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Refresh Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert if stats API failed */}
      {error && (
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => refetch()}
            className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Real Statistics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Customers */}
        <StatsCard
          title="Total Customers"
          value={loadingStats ? '-' : stats.totalCustomers}
          subtitle="Registered client records"
          icon={Users}
          colorScheme="emerald"
          badge={stats.totalCustomers > 0 ? 'Live Data' : 'Empty'}
          badgeVariant={stats.totalCustomers > 0 ? 'success' : 'default'}
          loading={loadingStats}
        />

        {/* Active Staff */}
        <StatsCard
          title="Active Staff"
          value={loadingStats ? '-' : `${stats.activeStaff} / ${stats.totalStaff}`}
          subtitle="Specialists on roster"
          icon={UserCheck}
          colorScheme="blue"
          badge={stats.activeStaff > 0 ? `${stats.activeStaff} Available` : 'None Active'}
          badgeVariant={stats.activeStaff > 0 ? 'info' : 'default'}
          loading={loadingStats}
        />

        {/* Available Services */}
        <StatsCard
          title="Bookable Services"
          value={loadingStats ? '-' : `${stats.availableServices} / ${stats.totalServices}`}
          subtitle="Configured catalog items"
          icon={Briefcase}
          colorScheme="purple"
          badge={stats.availableServices > 0 ? 'Catalog Ready' : 'Unconfigured'}
          badgeVariant={stats.availableServices > 0 ? 'info' : 'default'}
          loading={loadingStats}
        />

        {/* Upcoming Appointments (Phase 4 indicator) */}
        <StatsCard
          title="Upcoming Bookings"
          value="Phase 4"
          subtitle="Autonomous calendar scheduling"
          icon={Calendar}
          colorScheme="amber"
          badge="Coming Soon"
          badgeVariant="warning"
          loading={loadingStats}
        />
      </div>

      {/* Clean Empty State Notice for Fresh Businesses */}
      {isAllEmpty && (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">No Domain Records for this Business</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            This business currently has 0 customers, 0 staff, and 0 services. Full CRUD interfaces to add records will launch in Phase 6.
          </p>
        </div>
      )}

      {/* Quick Operations Section */}
      <QuickActions />

      {/* 2-Column Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: AI Receptionist Card & Latency Telemetry */}
        <div className="space-y-6">
          <AIReceptionistCard />
          <AIPerformanceCard />
        </div>

        {/* Right Column: Recent Activity & System Health */}
        <div className="space-y-6">
          <RecentActivity />
          <SystemStatus />
        </div>
      </div>
    </div>
  );
};
