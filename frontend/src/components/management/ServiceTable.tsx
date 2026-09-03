'use client';

import React, { useState } from 'react';
import { Service } from '../../types/dashboard';
import {
  Search,
  Briefcase,
  Clock,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Plus,
  X,
  FileText,
} from 'lucide-react';

interface ServiceTableProps {
  services: Service[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
}

export const ServiceTable: React.FC<ServiceTableProps> = ({
  services,
  loading,
  onAdd,
  onEdit,
  onDelete,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = services.filter((s) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      s.name.toLowerCase().includes(term) ||
      (s.description && s.description.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-4">
      {/* Search Bar & Actions Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search catalog by service name or description..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            {filtered.length} {filtered.length === 1 ? 'service' : 'services'}
          </span>
          <button
            onClick={onAdd}
            className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-lg shadow-purple-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Service</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-3 animate-pulse">
          <div className="h-10 bg-slate-800/80 rounded-xl"></div>
          <div className="h-14 bg-slate-800/50 rounded-xl"></div>
          <div className="h-14 bg-slate-800/50 rounded-xl"></div>
        </div>
      )}

      {/* Empty State: No Services Configured Yet */}
      {!loading && services.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto">
            <Briefcase className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">No Services in Catalog Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Configure your business&apos;s bookable appointments and durations. The AI receptionist will offer these services during voice dialogues.
            </p>
          </div>
          <button
            onClick={onAdd}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-lg shadow-purple-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Service</span>
          </button>
        </div>
      )}

      {/* Empty State: Search Results Empty */}
      {!loading && services.length > 0 && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center space-y-2">
          <Search className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-xs font-semibold text-slate-300">No matching services</h3>
          <p className="text-xs text-slate-500">
            No catalog services match &quot;{searchTerm}&quot;. Try a different search term.
          </p>
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs text-indigo-400 hover:underline pt-1"
          >
            Clear search filter
          </button>
        </div>
      )}

      {/* Services Table List */}
      {!loading && filtered.length > 0 && (
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 overflow-hidden shadow-sm">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/50 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Service Offering</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Availability</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filtered.map((serv) => (
                  <tr
                    key={serv.id}
                    className="hover:bg-slate-850/50 transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
                          <Briefcase className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate max-w-[200px]">{serv.name}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-indigo-300">
                      <div className="flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{serv.durationMinutes} mins</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      {serv.description ? (
                        <div className="flex items-center space-x-1.5 truncate max-w-[240px]">
                          <FileText className="w-3 h-3 text-slate-500 flex-shrink-0" />
                          <span className="truncate">{serv.description}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 italic">No description</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {serv.isActive ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Catalog Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                          <XCircle className="w-2.5 h-2.5" />
                          <span>Inactive</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => onEdit(serv)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-slate-800 transition-colors"
                        title="Edit service details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(serv)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Remove service"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-slate-800/60">
            {filtered.map((serv) => (
              <div key={serv.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{serv.name}</h4>
                      <p className="text-[11px] text-indigo-400 font-mono flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {serv.durationMinutes} minutes
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {serv.isActive ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Active
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                        Inactive
                      </span>
                    )}
                    <button
                      onClick={() => onEdit(serv)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(serv)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {serv.description && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 pl-1">
                    {serv.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
