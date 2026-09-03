'use client';

import React, { useState, useEffect } from 'react';
import { Service, CreateServiceInput, UpdateServiceInput } from '../../types/dashboard';
import { X, Briefcase, Clock, FileText, Loader2, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';

interface ServiceModalProps {
  isOpen: boolean;
  service?: Service | null; // If provided, Edit mode; if null, Create mode
  businessId: string;
  loading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (data: CreateServiceInput | UpdateServiceInput) => Promise<void>;
}

export const ServiceModal: React.FC<ServiceModalProps> = ({
  isOpen,
  service,
  businessId,
  loading,
  error,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [isActive, setIsActive] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  const isEdit = !!service;

  useEffect(() => {
    if (service) {
      setName(service.name || '');
      setDescription(service.description || '');
      setDurationMinutes(service.durationMinutes || 30);
      setIsActive(service.isActive ?? true);
    } else {
      setName('');
      setDescription('');
      setDurationMinutes(30);
      setIsActive(true);
    }
    setFieldErrors({});
  }, [service, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errors: { [key: string]: string } = {};
    if (!name.trim()) {
      errors.name = 'Service name is required';
    }
    if (!durationMinutes || isNaN(durationMinutes) || durationMinutes < 1) {
      errors.durationMinutes = 'Duration must be at least 1 minute';
    } else if (durationMinutes > 1440) {
      errors.durationMinutes = 'Duration cannot exceed 24 hours (1440 mins)';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      businessId,
      name: name.trim(),
      description: description.trim() || undefined,
      durationMinutes: Number(durationMinutes),
      isActive,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={loading ? undefined : onClose}
      />

      <div className="relative z-10 max-w-lg w-full rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                {isEdit ? 'Edit Service Offering' : 'Create Bookable Service'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEdit ? 'Update appointment duration and details' : 'Add an appointment type to your business catalog'}
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

        {/* Global Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Service Name *</span>
              {fieldErrors.name && (
                <span className="text-rose-400 text-[11px]">{fieldErrors.name}</span>
              )}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Briefcase className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Comprehensive Dental Intake & X-Ray"
                className={`w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/80 border text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition-colors ${
                  fieldErrors.name
                    ? 'border-rose-500/50 focus:ring-rose-500'
                    : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500'
                }`}
              />
            </div>
          </div>

          {/* Duration in Minutes Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Duration (Minutes) *</span>
              {fieldErrors.durationMinutes && (
                <span className="text-rose-400 text-[11px]">{fieldErrors.durationMinutes}</span>
              )}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Clock className="w-4 h-4" />
              </div>
              <input
                type="number"
                min="1"
                max="1440"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 0)}
                placeholder="e.g. 45"
                className={`w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/80 border text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 transition-colors ${
                  fieldErrors.durationMinutes
                    ? 'border-rose-500/50 focus:ring-rose-500'
                    : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500'
                }`}
              />
            </div>
            <p className="text-[10px] text-slate-500">
              The AI receptionist calculates appointment slots and schedule buffers based on this duration.
            </p>
          </div>

          {/* Description Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Description (Optional)
            </label>
            <div className="relative">
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Initial diagnostic consultation with digital imaging and specialist review."
                className="w-full p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
              />
            </div>
          </div>

          {/* Active Catalog Availability Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div>
              <p className="text-xs font-semibold text-slate-200">Catalog Availability</p>
              <p className="text-[11px] text-slate-400">
                Active services are offered by the AI receptionist during calls
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`p-1 rounded-lg transition-colors ${
                isActive ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              {isActive ? (
                <ToggleRight className="w-7 h-7" />
              ) : (
                <ToggleLeft className="w-7 h-7" />
              )}
            </button>
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
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEdit ? 'Update Service' : 'Create Service'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
