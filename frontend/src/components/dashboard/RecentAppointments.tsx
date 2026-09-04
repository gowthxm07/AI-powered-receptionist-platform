'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { Appointment } from '../../types/dashboard';
import { Calendar, Clock, User, ArrowUpRight, CheckCircle2, AlertCircle } from 'lucide-react';

interface RecentAppointmentsProps {
  businessId: string;
}

export const RecentAppointments: React.FC<RecentAppointmentsProps> = ({ businessId }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchAppointments() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.appointments.getAll({ businessId });
        if (isMounted && res.success && res.data) {
          // Sort by date descending and take top 5
          const sorted = [...res.data].sort(
            (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
          );
          setAppointments(sorted.slice(0, 5));
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Failed to load appointments');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (businessId) {
      fetchAppointments();
    }

    return () => {
      isMounted = false;
    };
  }, [businessId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Confirmed
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Scheduled
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Completed
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Recent Appointments</h3>
            <p className="text-xs text-slate-400">Real-time schedule activity</p>
          </div>
        </div>

        <Link
          href="/dashboard/appointments"
          className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors group"
        >
          <span>View All</span>
          <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-xs gap-2">
          <div className="w-6 h-6 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <span>Loading bookings...</span>
        </div>
      ) : error ? (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : appointments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-6 text-center space-y-2">
          <p className="text-xs font-medium text-slate-300">No appointments recorded yet.</p>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            Bookings created by callers through the AI receptionist or scheduled manually will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="pb-2.5 font-medium">Customer</th>
                <th className="pb-2.5 font-medium">Service</th>
                <th className="pb-2.5 font-medium">Date & Time</th>
                <th className="pb-2.5 font-medium">Specialist</th>
                <th className="pb-2.5 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {appointments.map((apt) => (
                <tr key={apt.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 pr-2">
                    <div className="font-semibold text-slate-200">
                      {apt.customer?.name || 'Guest Caller'}
                    </div>
                    {apt.customer?.phone && (
                      <div className="text-[10px] text-slate-500 font-mono">
                        {apt.customer.phone}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-2">
                    <div className="text-slate-300 font-medium">
                      {apt.service?.name || 'General Service'}
                    </div>
                    {apt.service?.durationMinutes && (
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {apt.service.durationMinutes} min
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-2 text-slate-300 whitespace-nowrap">
                    {formatDateTime(apt.startTime)}
                  </td>
                  <td className="py-3 pr-2 text-slate-400">
                    {apt.staff?.name || 'Any Specialist'}
                  </td>
                  <td className="py-3 text-right">
                    <div className="inline-block">{getStatusBadge(apt.status)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
