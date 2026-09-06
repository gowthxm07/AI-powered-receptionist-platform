'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';
import { BusinessSelector } from '../../../components/dashboard/BusinessSelector';
import { StaffTable } from '../../../components/management/StaffTable';
import { StaffModal } from '../../../components/management/StaffModal';
import { ConfirmDialog } from '../../../components/management/ConfirmDialog';
import { Toast } from '../../../components/management/Toast';
import { useBusiness } from '../../../context/BusinessContext';
import { Staff, CreateStaffInput, UpdateStaffInput } from '../../../types/dashboard';
import { api, ApiError } from '../../../lib/api';
import { UserCheck, AlertCircle, RefreshCw, Building2 } from 'lucide-react';

export default function StaffPage() {
  const { selectedBusiness, selectedBusinessId, loading: loadingBiz } = useBusiness();

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal & Dialog states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  const loadStaff = useCallback(async () => {
    if (loadingBiz) return;

    if (!selectedBusinessId) {
      setStaffList([]);
      setLoading(false);
      return;
    }

    const currentReq = ++activeRequestId.current;
    setLoading(true);
    setError(null);
    setStaffList([]); // Clear stale data from previous business

    try {
      const res = await api.staff.getAll(selectedBusinessId);
      if (currentReq === activeRequestId.current) {
        if (res.success && Array.isArray(res.data)) {
          setStaffList(res.data);
        } else {
          setStaffList([]);
        }
      }
    } catch (err) {
      if (currentReq === activeRequestId.current) {
        console.error('Failed to load staff:', err);
        const msg = err instanceof ApiError ? err.message : 'Unable to load staff roster';
        setError(msg);
        setStaffList([]);
      }
    } finally {
      if (currentReq === activeRequestId.current) {
        setLoading(false);
      }
    }
  }, [selectedBusinessId, loadingBiz]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  // Create or Edit Handler
  const handleModalSubmit = async (data: CreateStaffInput | UpdateStaffInput) => {
    if (!selectedBusinessId) return;

    try {
      setModalLoading(true);
      setModalError(null);

      if (editingStaff) {
        // Update Staff
        const res = await api.staff.update(editingStaff.id, data as UpdateStaffInput);
        if (res.success && res.data) {
          setStaffList((prev) =>
            prev.map((s) => (s.id === editingStaff.id ? res.data! : s))
          );
          setIsModalOpen(false);
          setEditingStaff(null);
          showToast(`Specialist "${res.data.name}" updated successfully!`);
        }
      } else {
        // Create Staff
        const createData = data as CreateStaffInput;
        const res = await api.staff.create({
          businessId: selectedBusinessId,
          name: createData.name,
          email: createData.email,
          phone: createData.phone,
          role: createData.role,
          isActive: createData.isActive ?? true,
        });
        if (res.success && res.data) {
          setStaffList((prev) => [res.data!, ...prev]);
          setIsModalOpen(false);
          showToast(`Specialist "${res.data.name}" onboarded successfully!`);
        }
      }
    } catch (err) {
      console.error('Staff save error:', err);
      const msg = err instanceof ApiError ? err.message : 'Failed to save staff specialist';
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  // Delete Handler
  const handleDeleteConfirm = async () => {
    if (!deletingStaff) return;

    try {
      setDeleteLoading(true);
      await api.staff.delete(deletingStaff.id);
      setStaffList((prev) => prev.filter((s) => s.id !== deletingStaff.id));
      showToast(`Specialist "${deletingStaff.name}" removed from roster.`);
      setDeletingStaff(null);
    } catch (err) {
      console.error('Staff delete error:', err);
      const msg = err instanceof ApiError ? err.message : 'Failed to remove specialist';
      showToast(msg, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <DashboardLayout title="Staff Roster" businessSelector={<BusinessSelector />}>
      <div className="space-y-6">
        {/* Page Header Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-blue-950/30 via-slate-900/60 to-slate-900 border border-blue-500/20 p-6 sm:p-7 backdrop-blur-xl shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Team Roster</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Staff & Specialist Roster
              </h1>
              <p className="text-xs sm:text-sm text-slate-300">
                {selectedBusiness ? (
                  <>
                    Manage active specialists and availability schedules for{' '}
                    <span className="text-white font-medium">{selectedBusiness.name}</span>.
                  </>
                ) : (
                  'Configure operating staff and availability parameters.'
                )}
              </p>
            </div>

            {selectedBusinessId && (
              <button
                onClick={() => loadStaff()}
                disabled={loading}
                className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900/90 hover:bg-slate-850 text-slate-200 border border-slate-700/80 hover:border-slate-600 transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
                <span>Refresh Roster</span>
              </button>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => loadStaff()}
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
              Please select an active business from the header dropdown to view and manage its staff specialists.
            </p>
          </div>
        )}

        {/* Staff Table */}
        {selectedBusinessId && (
          <StaffTable
            staff={staffList}
            loading={loading}
            onAdd={() => {
              setEditingStaff(null);
              setModalError(null);
              setIsModalOpen(true);
            }}
            onEdit={(member) => {
              setEditingStaff(member);
              setModalError(null);
              setIsModalOpen(true);
            }}
            onDelete={(member) => setDeletingStaff(member)}
          />
        )}

        {/* Create / Edit Modal */}
        <StaffModal
          isOpen={isModalOpen}
          staff={editingStaff}
          businessId={selectedBusinessId || ''}
          loading={modalLoading}
          error={modalError}
          onClose={() => {
            setIsModalOpen(false);
            setEditingStaff(null);
            setModalError(null);
          }}
          onSubmit={handleModalSubmit}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={!!deletingStaff}
          title="Remove Specialist from Roster"
          message={`Are you sure you want to remove "${deletingStaff?.name}" (${deletingStaff?.role}) from the staff roster?`}
          confirmLabel="Remove Specialist"
          isDestructive={true}
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingStaff(null)}
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
