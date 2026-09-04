'use client';

import React, { useState } from 'react';
import { useBusiness } from '../../../context/BusinessContext';
import { useAuth } from '../../../context/AuthContext';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';
import { BusinessSelector } from '../../../components/dashboard/BusinessSelector';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Clock,
  User,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Lock,
  Check,
} from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const { selectedBusiness } = useBusiness();
  const [savedNotice, setSavedNotice] = useState(false);

  const operatingHours = [
    { day: 'Monday', hours: '9:00 AM – 6:00 PM', status: 'Open' },
    { day: 'Tuesday', hours: '9:00 AM – 6:00 PM', status: 'Open' },
    { day: 'Wednesday', hours: '9:00 AM – 6:00 PM', status: 'Open' },
    { day: 'Thursday', hours: '9:00 AM – 6:00 PM', status: 'Open' },
    { day: 'Friday', hours: '9:00 AM – 5:00 PM', status: 'Open' },
    { day: 'Saturday', hours: 'Closed', status: 'Closed' },
    { day: 'Sunday', hours: 'Closed', status: 'Closed' },
  ];

  const handleSavePlaceholder = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <DashboardLayout title="Business Settings" businessSelector={<BusinessSelector />}>
      <div className="space-y-8 max-w-5xl">
        {/* Header Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 sm:p-8 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
                <Building2 className="w-3.5 h-3.5" />
                <span>Organization Settings</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {selectedBusiness?.name || 'Business'} Settings
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm">
                Manage your enterprise profile, caller contact details, operating hours, and team security.
              </p>
            </div>

            {savedNotice && (
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold animate-fadeIn">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Settings updated successfully</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column: Business Profile & Operating Hours (2 cols) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Business Profile Card */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-6 space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">Business Profile</h3>
                    <p className="text-xs text-slate-400">Public business details used by the AI receptionist</p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Active
                </span>
              </div>

              <form onSubmit={handleSavePlaceholder} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Business Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={selectedBusiness?.name || ''}
                        className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Primary Phone
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        readOnly
                        value={selectedBusiness?.phone || '+1-555-0100'}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Contact Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        readOnly
                        value={selectedBusiness?.email || 'contact@business.com'}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Timezone
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                        <Clock className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        readOnly
                        value={selectedBusiness?.timezone || 'America/New_York'}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Clinic Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      readOnly
                      value="123 Medical Center Blvd, Suite 400"
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none"
                    />
                  </div>
                </div>
              </form>
            </div>

            {/* Operating Hours Card */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">Operating Schedule</h3>
                    <p className="text-xs text-slate-400">Regular clinic hours used for appointment scheduling</p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">Standard Hours</span>
              </div>

              <div className="divide-y divide-slate-800/80 rounded-xl border border-slate-800/80 overflow-hidden bg-slate-950/40">
                {operatingHours.map((item) => (
                  <div
                    key={item.day}
                    className="flex items-center justify-between px-4 py-3 text-xs"
                  >
                    <span className="font-semibold text-slate-200">{item.day}</span>
                    <div className="flex items-center space-x-3">
                      <span className="text-slate-400">{item.hours}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          item.status === 'Open'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-500 border border-slate-700/60'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Account & Security Information (1 col) */}
          <div className="space-y-8">
            {/* Account Details */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-6 space-y-4 shadow-sm">
              <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-4">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Account</h3>
                  <p className="text-xs text-slate-400">Logged-in credentials</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px] uppercase font-semibold">User Name</span>
                  <span className="text-slate-200 font-medium text-sm">{user?.name || 'Administrator'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] uppercase font-semibold">Email Address</span>
                  <span className="text-slate-200 font-medium">{user?.email || 'admin@business.demo'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] uppercase font-semibold">Role</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 mt-0.5">
                    {user?.role || 'BUSINESS_OWNER'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px] uppercase font-semibold">Active Organization</span>
                  <span className="text-slate-300 font-medium">{selectedBusiness?.name || 'Default Enterprise'}</span>
                </div>
              </div>
            </div>

            {/* Security Status */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800/80 p-6 space-y-4 shadow-sm">
              <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-4">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Security</h3>
                  <p className="text-xs text-slate-400">Data protection policies</p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-200 block">Secure Authentication</span>
                    <p className="text-[11px] text-slate-400">Protected by secure HTTP-only cookies and token rotation.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-200 block">Multi-Tenant Isolation</span>
                    <p className="text-[11px] text-slate-400">All customer, staff, and appointment records are strictly scoped.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
