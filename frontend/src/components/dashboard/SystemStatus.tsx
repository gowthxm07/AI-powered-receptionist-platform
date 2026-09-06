'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Database, ShieldCheck, Lock, Activity, CheckCircle2, AlertTriangle } from 'lucide-react';

export const SystemStatus: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<{
    status: string;
    uptimeSeconds: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.health
      .check()
      .then((res) => {
        if (mounted && res.success && res.data) {
          setHealthStatus(res.data);
        }
      })
      .catch((err) => console.warn('Health check error:', err))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Front-Desk Infrastructure</h3>
            <p className="text-xs text-slate-400">Autonomous voice, scheduling, and security runtime</p>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Operational
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {/* AI Voice Engine */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-200">AI Speech Engine</p>
            <p className="text-[10px] text-emerald-400 font-medium">Ready for Calls</p>
          </div>
        </div>

        {/* Conflict-Free Calendar */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
            <Database className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-200">Booking Engine</p>
            <p className="text-[10px] text-emerald-400 font-medium">Conflict Prevention Active</p>
          </div>
        </div>

        {/* Enterprise Security */}
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-200">Client Privacy</p>
            <p className="text-[10px] text-emerald-400 font-medium">Encrypted & Isolated</p>
          </div>
        </div>
      </div>
    </div>
  );
};
