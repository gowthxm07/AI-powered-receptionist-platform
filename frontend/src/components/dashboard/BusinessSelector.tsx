'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useBusiness } from '../../context/BusinessContext';
import { Building2, ChevronDown, Check, Loader2, PlusCircle, AlertCircle } from 'lucide-react';

export const BusinessSelector: React.FC = () => {
  const {
    businesses,
    selectedBusiness,
    selectedBusinessId,
    loading,
    error,
    selectBusiness,
    refreshBusinesses,
  } = useBusiness();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 animate-pulse">
        <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
        <span className="text-xs text-slate-400">Loading business...</span>
      </div>
    );
  }

  if (error) {
    return (
      <button
        onClick={() => refreshBusinesses()}
        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs hover:bg-rose-500/20 transition-colors"
        title="Click to retry loading businesses"
      >
        <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
        <span>Failed to load (Retry)</span>
      </button>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
        <Building2 className="w-3.5 h-3.5 text-amber-400" />
        <span>No Business Profile</span>
      </div>
    );
  }

  // Single business (no dropdown needed, just clean display)
  if (businesses.length === 1) {
    return (
      <div className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
        <div className="w-5 h-5 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
          <Building2 className="w-3.5 h-3.5" />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-slate-200 font-semibold truncate max-w-[140px] sm:max-w-[200px]">
            {selectedBusiness?.name}
          </span>
          <span className="text-[10px] text-slate-400 font-mono truncate">
            {selectedBusiness?.phone || 'Primary Clinic'}
          </span>
        </div>
      </div>
    );
  }

  // Multiple businesses (interactive dropdown)
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-xs transition-all shadow-sm group"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="w-5 h-5 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
          <Building2 className="w-3.5 h-3.5" />
        </div>
        <div className="flex flex-col text-left">
          <span className="text-slate-200 font-semibold truncate max-w-[120px] sm:max-w-[180px]">
            {selectedBusiness?.name || 'Select Business'}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {businesses.length} locations available
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-xl">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800/80 mb-1">
            Select Active Business
          </div>

          <div className="max-h-60 overflow-y-auto px-1.5 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
            {businesses.map((biz) => {
              const isSelected = biz.id === selectedBusinessId;
              return (
                <button
                  key={biz.id}
                  onClick={() => {
                    selectBusiness(biz.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-all ${
                    isSelected
                      ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <Building2
                      className={`w-4 h-4 flex-shrink-0 ${
                        isSelected ? 'text-indigo-400' : 'text-slate-400'
                      }`}
                    />
                    <div className="truncate">
                      <p className="font-semibold truncate">{biz.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{biz.phone}</p>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-indigo-400 flex-shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
