'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import {
  Bot,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  CheckCircle2,
  Mail,
  Key,
  Database,
  ArrowRight,
  Layers,
  Loader2,
} from 'lucide-react';

function DashboardContent() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Dashboard Top Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-lg text-white tracking-tight">Smart Receptionist</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Authenticated
                  </span>
                </div>
              </div>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <UserIcon className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-300 font-medium">{user?.name}</span>
            </div>

            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 hover:border-slate-600 transition-all shadow-sm disabled:opacity-50"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Signing out...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Sign Out</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Body */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-8">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-900/30 via-indigo-900/30 to-purple-900/20 border border-indigo-500/20 p-6 sm:p-8 backdrop-blur-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Phase 3.2: Frontend Authentication Active</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Welcome, {user?.name}!
              </h1>
              <p className="text-slate-300 text-sm max-w-2xl">
                Your account is authenticated via secure HTTP-only JWT cookies directly with the Express backend and PostgreSQL database.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-all"
              >
                <span>View Public Landing</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* User Identity & Security Details Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Profile Identity</h3>
                <p className="text-xs text-slate-400">Verified User Account</p>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Full Name</span>
                <span className="text-slate-200 font-medium">{user?.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-500" />
                  Email
                </span>
                <span className="text-slate-200 font-medium">{user?.email}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">User ID</span>
                <span className="text-slate-400 font-mono text-[11px] truncate max-w-[150px]">{user?.id}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Role & Permissions</h3>
                <p className="text-xs text-slate-400">Access Control Level</p>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Assigned Role</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {user?.role}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Token Type</span>
                <span className="text-slate-200 font-medium">HTTP-Only Cookie (JWT)</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Session Security</span>
                <span className="text-emerald-400 font-medium">XSS-Protected</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Backend Health</h3>
                <p className="text-xs text-slate-400">PostgreSQL Integration</p>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Database Engine</span>
                <span className="text-slate-200 font-medium">PostgreSQL (Prisma)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Auth Authority</span>
                <span className="text-slate-200 font-medium">Express API (/api/auth)</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Status</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Active & Synced
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Future Modules Placeholder Notice */}
        <div className="border border-dashed border-slate-800 rounded-2xl p-6 text-center space-y-2">
          <Layers className="w-8 h-8 text-slate-600 mx-auto" />
          <h4 className="text-sm font-semibold text-slate-300">Phase 3.2 Verification Shell</h4>
          <p className="text-xs text-slate-500 max-w-lg mx-auto">
            This dashboard placeholder validates that protected routes, authentication session state, and logout operations are functional. Business entities, appointments, and local AI agent management will be connected in subsequent phases.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
