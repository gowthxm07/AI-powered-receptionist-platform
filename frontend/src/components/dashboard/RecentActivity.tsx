'use client';

import React from 'react';
import { Activity, Clock, PhoneCall, Calendar, UserPlus } from 'lucide-react';

export const RecentActivity: React.FC = () => {
  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Recent Activity</h3>
            <p className="text-xs text-slate-400">Real-time audit log of business operations</p>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700/60 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Live Log Engine
        </span>
      </div>

      {/* Activity State */}
      <div className="rounded-xl border border-dashed border-slate-800/90 bg-slate-950/40 p-6 text-center space-y-2">
        <p className="text-xs font-medium text-slate-300">
          No activity records generated yet.
        </p>
        <p className="text-[11px] text-slate-500 max-w-md mx-auto leading-relaxed">
          Activity telemetry streams real-time events as the AI receptionist handles voice calls, books appointments, and updates customer records.
        </p>
      </div>

      {/* Event Schemas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px]">
        <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-slate-400">
          <PhoneCall className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <span className="truncate">AI Voice Calls</span>
        </div>
        <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-slate-400">
          <Calendar className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="truncate">Calendar Bookings</span>
        </div>
        <div className="flex items-center space-x-2 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-slate-400">
          <UserPlus className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
          <span className="truncate">Customer Intakes</span>
        </div>
      </div>
    </div>
  );
};
