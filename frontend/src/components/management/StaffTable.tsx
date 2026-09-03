'use client';

import React, { useState } from 'react';
import { Staff } from '../../types/dashboard';
import {
  Search,
  UserCheck,
  Briefcase,
  Mail,
  Phone,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Plus,
  X,
} from 'lucide-react';

interface StaffTableProps {
  staff: Staff[];
  loading: boolean;
  onAdd: () => void;
  onEdit: (member: Staff) => void;
  onDelete: (member: Staff) => void;
}

export const StaffTable: React.FC<StaffTableProps> = ({
  staff,
  loading,
  onAdd,
  onEdit,
  onDelete,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = staff.filter((s) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      s.name.toLowerCase().includes(term) ||
      s.role.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term) ||
      (s.phone && s.phone.toLowerCase().includes(term))
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
            placeholder="Search staff by name, role, email, or phone..."
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
            {filtered.length} {filtered.length === 1 ? 'specialist' : 'specialists'}
          </span>
          <button
            onClick={onAdd}
            className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Onboard Specialist</span>
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

      {/* Empty State: No Staff Onboarded Yet */}
      {!loading && staff.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mx-auto">
            <UserCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">No Staff Onboarded Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Add your team specialists, doctors, or front-desk operators. The AI receptionist will check their real-time availability for appointments.
            </p>
          </div>
          <button
            onClick={onAdd}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Onboard First Specialist</span>
          </button>
        </div>
      )}

      {/* Empty State: Search Results Empty */}
      {!loading && staff.length > 0 && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center space-y-2">
          <Search className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-xs font-semibold text-slate-300">No matching specialists</h3>
          <p className="text-xs text-slate-500">
            No team members match &quot;{searchTerm}&quot;. Try a different search term.
          </p>
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs text-indigo-400 hover:underline pt-1"
          >
            Clear search filter
          </button>
        </div>
      )}

      {/* Staff Table List */}
      {!loading && filtered.length > 0 && (
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 overflow-hidden shadow-sm">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/50 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Specialist Name</th>
                  <th className="py-3 px-4">Operating Role</th>
                  <th className="py-3 px-4">Email Address</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filtered.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-slate-850/50 transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-semibold text-white">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                          <UserCheck className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate max-w-[180px]">{member.name}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="flex items-center space-x-1.5">
                        <Briefcase className="w-3 h-3 text-slate-500" />
                        <span className="truncate max-w-[160px]">{member.role}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400">
                      <div className="flex items-center space-x-1.5 truncate max-w-[180px]">
                        <Mail className="w-3 h-3 text-slate-500 flex-shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                      {member.phone ? (
                        <div className="flex items-center space-x-1.5">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{member.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 italic">No direct line</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {member.isActive ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Active</span>
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
                        onClick={() => onEdit(member)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-300 hover:bg-slate-800 transition-colors"
                        title="Edit specialist details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(member)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="Remove specialist"
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
            {filtered.map((member) => (
              <div key={member.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{member.name}</h4>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Briefcase className="w-3 h-3 text-slate-500" />
                        {member.role}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {member.isActive ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Active
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                        Inactive
                      </span>
                    )}
                    <button
                      onClick={() => onEdit(member)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(member)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1 pl-1">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-slate-500" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                      <Phone className="w-3 h-3 text-slate-500" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
