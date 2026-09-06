'use client';

import React from 'react';
import Link from 'next/link';
import { Bot, CheckCircle2, Mic, ArrowRight, Sparkles } from 'lucide-react';

export const AIReceptionistCard: React.FC = () => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900/90 border border-indigo-500/20 p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">AI Receptionist</h3>
            <p className="text-xs text-slate-400">Autonomous Front-Desk Dialogue</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Online & Ready</span>
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        Your virtual receptionist handles customer calls, answers questions about services and specialists, and schedules conflict-free calendar appointments.
      </p>

      {/* Feature Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center space-x-2 text-slate-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="text-[11px] font-medium">Natural Dialogue</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center space-x-2 text-slate-300">
          <Mic className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
          <span className="text-[11px] font-medium">Voice Reception</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center space-x-2 text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
          <span className="text-[11px] font-medium">Smart Scheduling</span>
        </div>
      </div>

      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80">
        <Link
          href="/voice"
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Launch Voice Call</span>
        </Link>

        <Link
          href="/dashboard/ai-receptionist"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
        >
          <span>Open AI Console</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </Link>
      </div>
    </div>
  );
};
