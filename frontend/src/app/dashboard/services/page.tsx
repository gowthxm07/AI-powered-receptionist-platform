'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';
import { BusinessSelector } from '../../../components/dashboard/BusinessSelector';
import { ServiceTable } from '../../../components/management/ServiceTable';
import { ServiceModal } from '../../../components/management/ServiceModal';
import { ConfirmDialog } from '../../../components/management/ConfirmDialog';
import { Toast } from '../../../components/management/Toast';
import { useBusiness } from '../../../context/BusinessContext';
import { Service, CreateServiceInput, UpdateServiceInput } from '../../../types/dashboard';
import { api, ApiError } from '../../../lib/api';
import { Briefcase, AlertCircle, RefreshCw, Building2 } from 'lucide-react';

export default function ServicesPage() {
  const { selectedBusiness, selectedBusinessId, loading: loadingBiz } = useBusiness();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal & Dialog states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [deletingService, setDeletingService] = useState<Service | null>(null);
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

  const loadServices = useCallback(async () => {
    if (loadingBiz) return;

    if (!selectedBusinessId) {
      setServices([]);
      setLoading(false);
      return;
    }

    const currentReq = ++activeRequestId.current;
    setLoading(true);
    setError(null);
    setServices([]); // Clear stale data from previous business

    try {
      const res = await api.services.getAll(selectedBusinessId);
      if (currentReq === activeRequestId.current) {
        if (res.success && Array.isArray(res.data)) {
          setServices(res.data);
        } else {
          setServices([]);
        }
      }
    } catch (err) {
      if (currentReq === activeRequestId.current) {
        console.error('Failed to load services:', err);
        const msg = err instanceof ApiError ? err.message : 'Unable to load services catalog';
        setError(msg);
        setServices([]);
      }
    } finally {
      if (currentReq === activeRequestId.current) {
        setLoading(false);
      }
    }
  }, [selectedBusinessId, loadingBiz]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  // Create or Edit Handler
  const handleModalSubmit = async (data: CreateServiceInput | UpdateServiceInput) => {
    if (!selectedBusinessId) return;

    try {
      setModalLoading(true);
      setModalError(null);

      if (editingService) {
        // Update Service
        const res = await api.services.update(editingService.id, data as UpdateServiceInput);
        if (res.success && res.data) {
          setServices((prev) =>
            prev.map((s) => (s.id === editingService.id ? res.data! : s))
          );
          setIsModalOpen(false);
          setEditingService(null);
          showToast(`Service "${res.data.name}" updated successfully!`);
        }
      } else {
        // Create Service
        const createData = data as CreateServiceInput;
        const res = await api.services.create({
          businessId: selectedBusinessId,
          name: createData.name,
          description: createData.description,
          durationMinutes: createData.durationMinutes,
          isActive: createData.isActive ?? true,
        });
        if (res.success && res.data) {
          setServices((prev) => [res.data!, ...prev]);
          setIsModalOpen(false);
          showToast(`Service "${res.data.name}" created successfully!`);
        }
      }
    } catch (err) {
      console.error('Service save error:', err);
      const msg = err instanceof ApiError ? err.message : 'Failed to save service';
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  // Delete Handler
  const handleDeleteConfirm = async () => {
    if (!deletingService) return;

    try {
      setDeleteLoading(true);
      await api.services.delete(deletingService.id);
      setServices((prev) => prev.filter((s) => s.id !== deletingService.id));
      showToast(`Service "${deletingService.name}" removed from catalog.`);
      setDeletingService(null);
    } catch (err) {
      console.error('Service delete error:', err);
      const msg = err instanceof ApiError ? err.message : 'Failed to remove service';
      showToast(msg, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <DashboardLayout title="Services Catalog" businessSelector={<BusinessSelector />}>
      <div className="space-y-6">
        {/* Page Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Briefcase className="w-4 h-4" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Bookable Services Catalog
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              {selectedBusiness ? (
                <>
                  Configuring appointment offerings for{' '}
                  <span className="text-slate-200 font-semibold">{selectedBusiness.name}</span>.
                </>
              ) : (
                'Configure service items, appointment durations, and catalog availability.'
              )}
            </p>
          </div>

          {selectedBusinessId && (
            <button
              onClick={() => loadServices()}
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
              onClick={() => loadServices()}
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
              Please select an active business from the header dropdown to view and manage its services catalog.
            </p>
          </div>
        )}

        {/* Services Table */}
        {selectedBusinessId && (
          <ServiceTable
            services={services}
            loading={loading}
            onAdd={() => {
              setEditingService(null);
              setModalError(null);
              setIsModalOpen(true);
            }}
            onEdit={(service) => {
              setEditingService(service);
              setModalError(null);
              setIsModalOpen(true);
            }}
            onDelete={(service) => setDeletingService(service)}
          />
        )}

        {/* Create / Edit Modal */}
        <ServiceModal
          isOpen={isModalOpen}
          service={editingService}
          businessId={selectedBusinessId || ''}
          loading={modalLoading}
          error={modalError}
          onClose={() => {
            setIsModalOpen(false);
            setEditingService(null);
            setModalError(null);
          }}
          onSubmit={handleModalSubmit}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={!!deletingService}
          title="Remove Service from Catalog"
          message={`Are you sure you want to remove "${deletingService?.name}" (${deletingService?.durationMinutes} mins) from the services catalog?`}
          confirmLabel="Remove Service"
          isDestructive={true}
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingService(null)}
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
