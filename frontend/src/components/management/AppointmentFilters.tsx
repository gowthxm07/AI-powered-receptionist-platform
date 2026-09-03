'use client';

import React from 'react';
import { Staff, AppointmentStatus } from '../../types/dashboard';
import { Filter, UserCheck, Plus, X } from 'lucide-react';

interface AppointmentFiltersProps {
  statusFilter: AppointmentStatus | 'ALL';
  staffFilter: string;
  staffList: Staff[];
  totalCount: number;
  onStatusChange: (status: AppointmentStatus | 'ALL') => void;
  onStaffChange: (staffId: string) => void;
  onReset: () => void;
  onAdd: () => void;
}

export const AppointmentFilters: React.FC<AppointmentFiltersProps> = ({
  statusFilter,
  staffFilter,
  staffList,
  totalCount,
  onStatusChange,
  onStaffChange,
  onReset,
  onAdd,
}) => {
  const isFiltered = statusFilter !== 'ALL' || staffFilter !== 'ALL';

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-2xl border border-slate-800">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Status Filter */}
        <div className="flex items-center space-x-1.5 bg-slate-950/80 px-2.5 py-1.5 rounded-xl border border-slate-800">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value as AppointmentStatus | 'ALL')}
            className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No Show</option>
          </select>
        </div>

        {/* Staff Filter */}
        <div className="flex items-center space-x-1.5 bg-slate-950/80 px-2.5 py-1.5 rounded-xl border border-slate-800">
          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={staffFilter}
            onChange={(e) => onStaffChange(e.target.value)}
            className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Specialists</option>
            {staffList.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.role})
              </option>
            ))}
          </select>
        </div>

        {/* Reset Filter Button */}
        {isFiltered && (
          <button
            onClick={onReset}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-3 h-3" />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      <div className="flex items-center justify-between md:justify-end space-x-3">
        <span className="text-xs text-slate-400 font-mono">
          {totalCount} {totalCount === 1 ? 'booking' : 'bookings'}
        </span>

        <button
          onClick={onAdd}
          className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-all shadow-lg shadow-amber-600/20"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Book Appointment</span>
        </button>
      </div>
    </div>
  );
};
