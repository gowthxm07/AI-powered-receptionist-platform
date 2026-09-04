'use client';

import React from 'react';
import { Zap, Gauge, Radio, Clock, ShieldAlert } from 'lucide-react';

export const AIPerformanceCard: React.FC = () => {
  const metrics = [
    {
      name: 'Speech-to-Text (STT)',
      target: '< 250ms target',
      status: 'Awaiting Pipeline',
      icon: Radio,
    },
    {
      name: 'Time to First Token (TTFT)',
      target: '< 200ms target',
      status: 'Awaiting LLM',
      icon: Zap,
    },
    {
      name: 'End-to-End AI Response',
      target: '< 600ms target',
      status: 'Awaiting Integration',
      icon: Clock,
    },
    {
      name: 'Time to First Audio (TTFA)',
      target: '< 350ms target',
      status: 'Awaiting TTS',
      icon: Gauge,
    },
  ];

  return (
    <div className="rounded-2xl bg-slate-900/70 border border-slate-800/80 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">AI Latency Telemetry</h3>
            <p className="text-xs text-slate-400">Sub-second response performance monitoring</p>
          </div>
        </div>

        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          Telemetry Active
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.name}
              className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/70 space-y-1.5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-medium truncate">{m.name}</span>
                <Icon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold text-slate-400">-- ms</span>
                <p className="text-[10px] text-indigo-400/80 font-mono mt-0.5">{m.target}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-start space-x-2 text-[11px] text-slate-400 bg-slate-950/30 p-2.5 rounded-xl border border-slate-800/50">
        <ShieldAlert className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <span>
          Sub-second response latency is automatically measured and optimized across speech recognition, conversational intent resolution, and neural voice synthesis.
        </span>
      </div>
    </div>
  );
};
