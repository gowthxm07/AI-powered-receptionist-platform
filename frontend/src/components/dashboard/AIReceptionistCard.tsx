'use client';

import React from 'react';
import Link from 'next/link';
import { Bot, CheckCircle2, Mic, ArrowRight, Sparkles } from 'lucide-react';

export const AIReceptionistCard: React.FC = () => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/20 p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">AI Receptionist</h3>
            <p className="text-xs text-slate-400">Virtual Front-Desk Assistant</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-semibold text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Online</span>
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        Your virtual AI receptionist is online and actively handling customer inquiries, booking requests, and calendar slots.
      </p>

      {/* Feature Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center space-x-2 text-slate-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="text-[11px] font-medium">Natural Dialogue</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center space-x-2 text-slate-300">
          <Mic className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
          <span className="text-[11px] font-medium">Voice Booking Active</span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center space-x-2 text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
          <span className="text-[11px] font-medium">Conflict Prevention</span>
        </div>
      </div>

      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80">
        <Link
          href="/voice"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all"
        >
          <Mic className="w-3.5 h-3.5 text-indigo-400" />
          <span>Launch Voice Reception</span>
        </Link>

        <Link
          href="/dashboard/ai-receptionist"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
        >
          <span>Test Assistant</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        </Link>
      </div>
    </div>
  );
};
