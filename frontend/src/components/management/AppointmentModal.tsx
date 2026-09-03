'use client';

import React, { useState, useEffect } from 'react';
import {
  Appointment,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  Customer,
  Staff,
  Service,
  AppointmentStatus,
} from '../../types/dashboard';
import { api, ApiError } from '../../lib/api';
import {
  X,
  Calendar,
  Clock,
  User,
  UserCheck,
  Briefcase,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface AppointmentModalProps {
  isOpen: boolean;
  appointment?: Appointment | null;
  businessId: string;
  customers: Customer[];
  staffList: Staff[];
  services: Service[];
  loading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (data: CreateAppointmentInput | UpdateAppointmentInput) => Promise<void>;
}

export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  isOpen,
  appointment,
  businessId,
  customers,
  staffList,
  services,
  loading,
  error,
  onClose,
  onSubmit,
}) => {
  const isEdit = !!appointment;

  const [customerId, setCustomerId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [startTimeStr, setStartTimeStr] = useState('');
  const [status, setStatus] = useState<AppointmentStatus>('SCHEDULED');
  const [notes, setNotes] = useState('');

  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  // Availability check state
  const [checkingAvail, setCheckingAvail] = useState(false);
  const [availResult, setAvailResult] = useState<{ available: boolean; reason?: string } | null>(null);

  // Format ISO to local input datetime string (YYYY-MM-DDTHH:mm)
  const formatIsoForInput = (isoString?: string) => {
    if (!isoString) {
      const now = new Date();
      now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15);
      now.setSeconds(0, 0);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    }
    const d = new Date(isoString);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    if (appointment) {
      setCustomerId(appointment.customerId);
      setStaffId(appointment.staffId || '');
      setServiceId(appointment.serviceId);
      setStartTimeStr(formatIsoForInput(appointment.startTime));
      setStatus(appointment.status);
      setNotes(appointment.notes || '');
    } else {
      setCustomerId(customers[0]?.id || '');
      setStaffId(staffList[0]?.id || '');
      setServiceId(services[0]?.id || '');
      setStartTimeStr(formatIsoForInput());
      setStatus('SCHEDULED');
      setNotes('');
    }
    setFieldErrors({});
    setAvailResult(null);
  }, [appointment, isOpen, customers, staffList, services]);

  const selectedService = services.find((s) => s.id === serviceId);
  const duration = selectedService?.durationMinutes || 30;

  // Calculate projected End Time
  const calculatedEndTime = React.useMemo(() => {
    if (!startTimeStr) return null;
    const start = new Date(startTimeStr);
    if (isNaN(start.getTime())) return null;
    return new Date(start.getTime() + duration * 60000);
  }, [startTimeStr, duration]);

  // Real-time / on-demand availability check
  const handleCheckAvailability = async () => {
    if (!businessId || !staffId || !startTimeStr) return;
    try {
      setCheckingAvail(true);
      setAvailResult(null);
      const startIso = new Date(startTimeStr).toISOString();
      const res = await api.appointments.checkAvailability({
        businessId,
        staffId,
        startTime: startIso,
        durationMinutes: duration,
        excludeAppointmentId: appointment?.id,
      });
      if (res.success && res.data) {
        setAvailResult(res.data);
      }
    } catch (err) {
      console.warn('Availability check failed:', err);
    } finally {
      setCheckingAvail(false);
    }
  };

  if (!isOpen) return null;

  const validate = () => {
    const errors: { [key: string]: string } = {};
    if (!customerId) errors.customerId = 'Please select a customer';
    if (!serviceId) errors.serviceId = 'Please select a service';
    if (!startTimeStr) {
      errors.startTime = 'Please select appointment date and time';
    } else if (isNaN(new Date(startTimeStr).getTime())) {
      errors.startTime = 'Invalid date and time format';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const startIso = new Date(startTimeStr).toISOString();
    const endIso = calculatedEndTime ? calculatedEndTime.toISOString() : undefined;

    if (isEdit) {
      await onSubmit({
        businessId,
        customerId,
        staffId: staffId || null,
        serviceId,
        startTime: startIso,
        endTime: endIso,
        status,
        notes: notes.trim() || undefined,
      });
    } else {
      await onSubmit({
        businessId,
        customerId,
        staffId: staffId || null,
        serviceId,
        startTime: startIso,
        endTime: endIso,
        status,
        notes: notes.trim() || undefined,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={loading ? undefined : onClose}
      />

      <div className="relative z-10 max-w-xl w-full rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                {isEdit ? 'Reschedule / Edit Appointment' : 'Book New Appointment'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEdit ? 'Update appointment time, staff, or status' : 'Schedule a booking with automatic conflict detection'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Error Notice */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Customer / Caller *</span>
              {fieldErrors.customerId && (
                <span className="text-rose-400 text-[11px]">{fieldErrors.customerId}</span>
              )}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              >
                {customers.length === 0 ? (
                  <option value="">No customers available - Add customer first</option>
                ) : (
                  customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Service Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Service Offering *</span>
              {fieldErrors.serviceId && (
                <span className="text-rose-400 text-[11px]">{fieldErrors.serviceId}</span>
              )}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Briefcase className="w-4 h-4" />
              </div>
              <select
                value={serviceId}
                onChange={(e) => {
                  setServiceId(e.target.value);
                  setAvailResult(null);
                }}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              >
                {services.length === 0 ? (
                  <option value="">No services configured - Create service first</option>
                ) : (
                  services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.durationMinutes} mins)
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Staff Specialist Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Assigned Specialist (Optional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <UserCheck className="w-4 h-4" />
              </div>
              <select
                value={staffId}
                onChange={(e) => {
                  setStaffId(e.target.value);
                  setAvailResult(null);
                }}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              >
                <option value="">Unassigned / Any Specialist</option>
                {staffList.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} — {st.role} {st.isActive ? '' : '(Inactive)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date & Time Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Appointment Start Time *</span>
              {fieldErrors.startTime && (
                <span className="text-rose-400 text-[11px]">{fieldErrors.startTime}</span>
              )}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Clock className="w-4 h-4" />
              </div>
              <input
                type="datetime-local"
                value={startTimeStr}
                onChange={(e) => {
                  setStartTimeStr(e.target.value);
                  setAvailResult(null);
                }}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* Dynamic Duration and Slot Preview */}
          {calculatedEndTime && (
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400">Scheduled Duration: </span>
                <span className="text-indigo-300 font-mono font-semibold">
                  {duration} minutes
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Ends at{' '}
                  <span className="text-slate-300 font-mono">
                    {calculatedEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </p>
              </div>

              {staffId && (
                <button
                  type="button"
                  onClick={handleCheckAvailability}
                  disabled={checkingAvail}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 transition-colors"
                >
                  {checkingAvail ? 'Checking...' : 'Check Availability'}
                </button>
              )}
            </div>
          )}

          {/* Availability Result Banner */}
          {availResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center space-x-2 ${
                availResult.available
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
              }`}
            >
              {availResult.available ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>Selected specialist is available during this time slot.</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{availResult.reason || 'Specialist has a scheduling conflict.'}</span>
                </>
              )}
            </div>
          )}

          {/* Status Selection (in Edit Mode) */}
          {isEdit && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Appointment Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              >
                <option value="SCHEDULED">SCHEDULED (Upcoming)</option>
                <option value="CONFIRMED">CONFIRMED (Client Verified)</option>
                <option value="COMPLETED">COMPLETED (Concluded)</option>
                <option value="CANCELLED">CANCELLED (Released)</option>
                <option value="NO_SHOW">NO_SHOW (Client Missed)</option>
              </select>
            </div>
          )}

          {/* Notes Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Appointment Notes (Optional)
            </label>
            <div className="relative">
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Caller requested wheelchair access and morning reminder."
                className="w-full p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || customers.length === 0 || services.length === 0}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-all shadow-lg shadow-amber-600/20 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <span>{isEdit ? 'Update Booking' : 'Confirm Appointment'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
