'use client';

import React from 'react';
import { Appointment, AppointmentStatus } from '../../types/dashboard';
import { AppointmentStatusBadge } from './AppointmentStatusBadge';
import {
  Calendar,
  Clock,
  User,
  UserCheck,
  Briefcase,
  Edit2,
  XCircle,
  CheckSquare,
  Plus,
  Phone,
} from 'lucide-react';

interface AppointmentTableProps {
  appointments: Appointment[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (appointment: Appointment) => void;
  onCancel: (appointment: Appointment) => void;
  onComplete: (appointment: Appointment) => void;
}

export const AppointmentTable: React.FC<AppointmentTableProps> = ({
  appointments,
  loading,
  onAdd,
  onEdit,
  onCancel,
  onComplete,
}) => {
  const formatDateTimeRange = (startIso: string, endIso: string) => {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const dateStr = start.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeStr = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return { dateStr, timeStr };
  };

  return (
    <div className="space-y-4">
      {/* Loading Skeleton */}
      {loading && (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-3 animate-pulse">
          <div className="h-10 bg-slate-800/80 rounded-xl"></div>
          <div className="h-16 bg-slate-800/50 rounded-xl"></div>
          <div className="h-16 bg-slate-800/50 rounded-xl"></div>
        </div>
      )}

      {/* Empty State: No Appointments */}
      {!loading && appointments.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">No Appointments Scheduled Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Schedule client appointments or let the autonomous AI receptionist book slots during voice calls.
            </p>
          </div>
          <button
            onClick={onAdd}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-all shadow-lg shadow-amber-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Book First Appointment</span>
          </button>
        </div>
      )}

      {/* Appointment Table List */}
      {!loading && appointments.length > 0 && (
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 overflow-hidden shadow-sm">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/50 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Service Offering</th>
                  <th className="py-3 px-4">Assigned Specialist</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {appointments.map((apt) => {
                  const { dateStr, timeStr } = formatDateTimeRange(apt.startTime, apt.endTime);
                  return (
                    <tr
                      key={apt.id}
                      className="hover:bg-slate-850/50 transition-colors group"
                    >
                      {/* Date & Time */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-white flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-400" />
                            {dateStr}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {timeStr}
                          </p>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-medium text-slate-100 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="truncate max-w-[150px]">{apt.customer?.name || 'Unknown'}</span>
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-500" />
                            {apt.customer?.phone}
                          </p>
                        </div>
                      </td>

                      {/* Service */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-medium text-slate-200 flex items-center gap-1.5 truncate max-w-[170px]">
                            <Briefcase className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                            <span className="truncate">{apt.service?.name || 'Service'}</span>
                          </p>
                          <span className="text-[10px] text-indigo-300 font-mono">
                            {apt.service?.durationMinutes} mins
                          </span>
                        </div>
                      </td>

                      {/* Staff */}
                      <td className="py-3.5 px-4 text-slate-300">
                        {apt.staff ? (
                          <div className="space-y-0.5">
                            <p className="font-medium text-slate-200 flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                              <span className="truncate max-w-[140px]">{apt.staff.name}</span>
                            </p>
                            <p className="text-[10px] text-slate-500">{apt.staff.role}</p>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Unassigned</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <AppointmentStatusBadge status={apt.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right space-x-1.5">
                        {apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED' && (
                          <button
                            onClick={() => onComplete(apt)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-slate-800 transition-colors"
                            title="Mark as Completed"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onEdit(apt)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors"
                          title="Reschedule / Edit Booking"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {apt.status !== 'CANCELLED' && (
                          <button
                            onClick={() => onCancel(apt)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            title="Cancel Appointment"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile / Tablet Card View */}
          <div className="lg:hidden divide-y divide-slate-800/60">
            {appointments.map((apt) => {
              const { dateStr, timeStr } = formatDateTimeRange(apt.startTime, apt.endTime);
              return (
                <div key={apt.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        {dateStr}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {timeStr}
                      </p>
                    </div>
                    <AppointmentStatusBadge status={apt.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Customer</span>
                      <span className="text-slate-200 font-medium truncate block">
                        {apt.customer?.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Service</span>
                      <span className="text-slate-200 font-medium truncate block">
                        {apt.service?.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Specialist</span>
                      <span className="text-slate-300 truncate block">
                        {apt.staff?.name || 'Unassigned'}
                      </span>
                    </div>
                    {apt.notes && (
                      <div>
                        <span className="text-slate-500 block text-[10px]">Notes</span>
                        <span className="text-slate-400 truncate block">{apt.notes}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-1">
                    {apt.status !== 'COMPLETED' && apt.status !== 'CANCELLED' && (
                      <button
                        onClick={() => onComplete(apt)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-750 text-emerald-400 border border-slate-700 flex items-center gap-1"
                      >
                        <CheckSquare className="w-3 h-3" />
                        <span>Complete</span>
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(apt)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-750 text-amber-300 border border-slate-700 flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Reschedule</span>
                    </button>
                    {apt.status !== 'CANCELLED' && (
                      <button
                        onClick={() => onCancel(apt)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-750 text-rose-400 border border-slate-700 flex items-center gap-1"
                      >
                        <XCircle className="w-3 h-3" />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
