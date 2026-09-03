'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';
import { BusinessSelector } from '../../../components/dashboard/BusinessSelector';
import { CustomerTable } from '../../../components/management/CustomerTable';
import { CustomerModal } from '../../../components/management/CustomerModal';
import { ConfirmDialog } from '../../../components/management/ConfirmDialog';
import { Toast } from '../../../components/management/Toast';
import { useBusiness } from '../../../context/BusinessContext';
import { Customer, CreateCustomerInput, UpdateCustomerInput } from '../../../types/dashboard';
import { api, ApiError } from '../../../lib/api';
import { Users, AlertCircle, RefreshCw, Building2 } from 'lucide-react';

export default function CustomersPage() {
  const { selectedBusiness, selectedBusinessId, loading: loadingBiz } = useBusiness();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal & Dialog states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
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

  const loadCustomers = useCallback(async () => {
    if (loadingBiz) return;

    if (!selectedBusinessId) {
      setCustomers([]);
      setLoading(false);
      return;
    }

    const currentReq = ++activeRequestId.current;
    setLoading(true);
    setError(null);
    setCustomers([]); // Clear stale data from previous business

    try {
      const res = await api.customers.getAll(selectedBusinessId);
      if (currentReq === activeRequestId.current) {
        if (res.success && Array.isArray(res.data)) {
          setCustomers(res.data);
        } else {
          setCustomers([]);
        }
      }
    } catch (err) {
      if (currentReq === activeRequestId.current) {
        console.error('Failed to load customers:', err);
        const msg = err instanceof ApiError ? err.message : 'Unable to load customers';
        setError(msg);
        setCustomers([]);
      }
    } finally {
      if (currentReq === activeRequestId.current) {
        setLoading(false);
      }
    }
  }, [selectedBusinessId, loadingBiz]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Create or Edit Handler
  const handleModalSubmit = async (data: CreateCustomerInput | UpdateCustomerInput) => {
    try {
      setModalLoading(true);
      setModalError(null);

      if (editingCustomer) {
        // Update Customer
        const res = await api.customers.update(editingCustomer.id, data as UpdateCustomerInput);
        if (res.success && res.data) {
          setCustomers((prev) =>
            prev.map((c) => (c.id === editingCustomer.id ? res.data! : c))
          );
          setIsModalOpen(false);
          setEditingCustomer(null);
          showToast(`Customer "${res.data.name}" updated successfully!`);
        }
      } else {
        // Create Customer
        const createData = data as CreateCustomerInput;
        const res = await api.customers.create({
          name: createData.name,
          phone: createData.phone,
          email: createData.email,
          businessId: selectedBusinessId || undefined,
        });
        if (res.success && res.data) {
          setCustomers((prev) => [res.data!, ...prev]);
          setIsModalOpen(false);
          showToast(`Customer "${res.data.name}" registered successfully!`);
        }
      }
    } catch (err) {
      console.error('Customer save error:', err);
      const msg = err instanceof ApiError ? err.message : 'Failed to save customer';
      setModalError(msg);
    } finally {
      setModalLoading(false);
    }
  };

  // Delete Handler
  const handleDeleteConfirm = async () => {
    if (!deletingCustomer) return;

    try {
      setDeleteLoading(true);
      await api.customers.delete(deletingCustomer.id);
      setCustomers((prev) => prev.filter((c) => c.id !== deletingCustomer.id));
      showToast(`Customer "${deletingCustomer.name}" deleted successfully.`);
      setDeletingCustomer(null);
    } catch (err) {
      console.error('Customer delete error:', err);
      const msg = err instanceof ApiError ? err.message : 'Failed to delete customer';
      showToast(msg, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <DashboardLayout title="Customers" businessSelector={<BusinessSelector />}>
      <div className="space-y-6">
        {/* Page Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Users className="w-4 h-4" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Customer Management
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              {selectedBusiness ? (
                <>
                  Viewing client records for{' '}
                  <span className="text-slate-200 font-semibold">{selectedBusiness.name}</span>.
                </>
              ) : (
                'Manage client records and caller identification profiles.'
              )}
            </p>
          </div>

          {selectedBusinessId && (
            <button
              onClick={() => loadCustomers()}
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
              onClick={() => loadCustomers()}
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
              Please select an active business from the header dropdown to view and manage its customer directory.
            </p>
          </div>
        )}

        {/* Customer Table */}
        {selectedBusinessId && (
          <CustomerTable
            customers={customers}
            loading={loading}
            onAdd={() => {
              setEditingCustomer(null);
              setModalError(null);
              setIsModalOpen(true);
            }}
            onEdit={(customer) => {
              setEditingCustomer(customer);
              setModalError(null);
              setIsModalOpen(true);
            }}
            onDelete={(customer) => setDeletingCustomer(customer)}
          />
        )}

        {/* Create / Edit Modal */}
        <CustomerModal
          isOpen={isModalOpen}
          customer={editingCustomer}
          businessId={selectedBusinessId || ''}
          loading={modalLoading}
          error={modalError}
          onClose={() => {
            setIsModalOpen(false);
            setEditingCustomer(null);
            setModalError(null);
          }}
          onSubmit={handleModalSubmit}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={!!deletingCustomer}
          title="Delete Customer Record"
          message={`Are you sure you want to delete customer "${deletingCustomer?.name}" (${deletingCustomer?.phone})? This action cannot be undone.`}
          confirmLabel="Delete Customer"
          isDestructive={true}
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingCustomer(null)}
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
