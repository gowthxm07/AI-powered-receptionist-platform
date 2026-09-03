'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';
import { BusinessSelector } from '../../../components/dashboard/BusinessSelector';
import { AppointmentTable } from '../../../components/management/AppointmentTable';
import { AppointmentModal } from '../../../components/management/AppointmentModal';
import { AppointmentFilters } from '../../../components/management/AppointmentFilters';
import { ConfirmDialog } from '../../../components/management/ConfirmDialog';
import { Toast } from '../../../components/management/Toast';
import { useBusiness } from '../../../context/BusinessContext';
import {
  Appointment,
  AppointmentStatus,
  Customer,
  Staff,
  Service,
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from '../../../types/dashboard';
import { api, ApiError } from '../../../lib/api';
import { Calendar, AlertCircle, RefreshCw, Building2 } from 'lucide-react';

export default function AppointmentsPage() {
  const { selectedBusiness, selectedBusinessId, loading: loadingBiz } = useBusiness();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'ALL'>('ALL');
  const [staffFilter, setStaffFilter] = useState<string>('ALL');

  // Modal & Dialog states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [cancellingAppointment, setCancellingAppointment] = useState<Appointment | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Request race condition prevention
  const activeRequestId = useRef(0);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const loadData = useCallback(async () => {
    if (loadingBiz) return;

    if (!selectedBusinessId) {
      setAppointments([]);
      setCustomers([]);
      setStaffList([]);
      setServices([]);
      setLoading(false);
      return;
    }

    const currentReq = ++activeRequestId.current;
    setLoading(true);
    setError(null);
    setAppointments([]); // Clear stale data

    try {
      const [aptRes, custRes, staffRes, servRes] = await Promise.all([
        api.appointments.getAll({
          businessId: selectedBusinessId,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          staffId: staffFilter !== 'ALL' ? staffFilter : undefined,
        }),
        api.customers.getAll(selectedBusinessId),
        api.staff.getAll(selectedBusinessId),
        api.services.getAll(selectedBusinessId),
      ]);

      if (currentReq === activeRequestId.current) {
        setAppointments(aptRes.success && Array.isArray(aptRes.data) ? aptRes.data : []);
        setCustomers(custRes.success && Array.isArray(custRes.data) ? custRes.data : []);
        setStaffList(staffRes.success && Array.isArray(staffRes.data) ? staffRes.data : []);
        setServices(servRes.success && Array.isArray(servRes.data) ? servRes.data : []);
      }
    } catch (err) {
      if (currentReq === activeRequestId.current) {
        console.error('Failed to load appointments:', err);
        const msg = err instanceof ApiError ? err.message : 'Unable to load appointment schedule';
        setError(msg);
      }
    } finally {
      if (currentReq === activeRequestId.current) {
        setLoading(false);
      }
    }
  }, [selectedBusinessId, loadingBiz, statusFilter, staffFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Create or Edit Handler
  const handleModalSubmit = async (data: CreateAppointmentInput | UpdateAppointmentInput) => {
    if (!selectedBusinessId) return;

    try {
      setModalLoading(true);
      setModalError(null);

      if (editingAppointment) {
        // Update Appointment
        const res = await api.appointments.update(editingAppointment.id, data as UpdateAppointmentInput);
        if (res.success && res.data) {
          setAppointments((prev) =>
            prev.map((a) => (a.id === editingAppointment.id ? res.data! : a))
          );
          setIsModalOpen(false);
          setEditingAppointment(null);
          showToast('Appointment updated successfully!');
        }
      } else {
        // Create Appointment
        const createData = data as CreateAppointmentInput;
        const res = await api.appointments.create({
          businessId: selectedBusinessId,
          customerId: createData.customerId,
          staffId: createData.staffId,
          serviceId: createData.serviceId,
          startTime: createData.startTime,
          endTime: createData.endTime,
          status: createData.status || 'SCHEDULED',
          notes: createData.notes,
        });
        if (res.success && res.data) {
          setAppointments((prev) => [res.data!, ...prev]);
          setIsModalOpen(false);
          showToast('Appointment booked successfully!');
        }
      }
    } catch (err) {
      console.error('Appointment save error:', err);
      const msg = err instanceof ApiError ? err.message : 'Failed to schedule appointment';
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  // Mark Completed Handler
  const handleComplete = async (apt: Appointment) => {
    try {
      const res = await api.appointments.update(apt.id, { status: 'COMPLETED' });
      if (res.success && res.data) {
        setAppointments((prev) =>
          prev.map((a) => (a.id === apt.id ? res.data! : a))
        );
        showToast('Appointment marked as Completed!');
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to update appointment';
      showToast(msg, 'error');
    }
  };

  // Cancel Handler
  const handleCancelConfirm = async () => {
    if (!cancellingAppointment) return;

    try {
      setCancelLoading(true);
      const res = await api.appointments.cancel(cancellingAppointment.id);
      if (res.success && res.data) {
        setAppointments((prev) =>
          prev.map((a) => (a.id === cancellingAppointment.id ? res.data! : a))
        );
        showToast('Appointment cancelled and slot released.');
      }
      setCancellingAppointment(null);
    } catch (err) {
      console.error('Appointment cancellation error:', err);
      const msg = err instanceof ApiError ? err.message : 'Failed to cancel appointment';
      showToast(msg, 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <DashboardLayout title="Appointments" businessSelector={<BusinessSelector />}>
      <div className="space-y-6">
        {/* Page Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Calendar className="w-4 h-4" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Appointment Scheduling & Bookings
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              {selectedBusiness ? (
                <>
                  Managing booking calendar for{' '}
                  <span className="text-slate-200 font-semibold">{selectedBusiness.name}</span>.
                </>
              ) : (
                'Schedule client bookings and manage specialist availability.'
              )}
            </p>
          </div>

          {selectedBusinessId && (
            <button
              onClick={() => loadData()}
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors disabled:opacity-50 self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Refresh</span>
            </button>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => loadData()}
              className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-medium transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State: No Business Selected */}
        {!loadingBiz && !selectedBusinessId && (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center space-y-3">
            <Building2 className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">Select a Business</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Please select an active business from the header dropdown to view and manage its appointment schedule.
            </p>
          </div>
        )}

        {/* Filters and Action Bar */}
        {selectedBusinessId && (
          <AppointmentFilters
            statusFilter={statusFilter}
            staffFilter={staffFilter}
            staffList={staffList}
            totalCount={appointments.length}
            onStatusChange={setStatusFilter}
            onStaffChange={setStaffFilter}
            onReset={() => {
              setStatusFilter('ALL');
              setStaffFilter('ALL');
            }}
            onAdd={() => {
              setEditingAppointment(null);
              setModalError(null);
              setIsModalOpen(true);
            }}
          />
        )}

        {/* Appointment Table */}
        {selectedBusinessId && (
          <AppointmentTable
            appointments={appointments}
            loading={loading}
            onAdd={() => {
              setEditingAppointment(null);
              setModalError(null);
              setIsModalOpen(true);
            }}
            onEdit={(appointment) => {
              setEditingAppointment(appointment);
              setModalError(null);
              setIsModalOpen(true);
            }}
            onCancel={(appointment) => setCancellingAppointment(appointment)}
            onComplete={handleComplete}
          />
        )}

        {/* Book / Reschedule Modal */}
        <AppointmentModal
          isOpen={isModalOpen}
          appointment={editingAppointment}
          businessId={selectedBusinessId || ''}
          customers={customers}
          staffList={staffList}
          services={services}
          loading={modalLoading}
          error={modalError}
          onClose={() => {
            setIsModalOpen(false);
            setEditingAppointment(null);
            setModalError(null);
          }}
          onSubmit={handleModalSubmit}
        />

        {/* Cancel Confirmation Dialog */}
        <ConfirmDialog
          isOpen={!!cancellingAppointment}
          title="Cancel Scheduled Appointment"
          message={`Are you sure you want to cancel the appointment with "${cancellingAppointment?.customer?.name}" on ${
            cancellingAppointment ? new Date(cancellingAppointment.startTime).toLocaleDateString() : ''
          }? The time slot will be released for other bookings.`}
          confirmLabel="Cancel Appointment"
          isDestructive={true}
          loading={cancelLoading}
          onConfirm={handleCancelConfirm}
          onCancel={() => setCancellingAppointment(null)}
        />

        {/* Toast Feedback */}
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      </div>
    </DashboardLayout>
  );
}
