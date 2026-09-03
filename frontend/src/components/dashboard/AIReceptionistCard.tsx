'use client';

import React from 'react';
import Link from 'next/link';
import { Bot, Sparkles, Cpu, Mic, Volume2, ArrowRight } from 'lucide-react';

export const AIReceptionistCard: React.FC = () => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/20 p-5 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">AI Receptionist</h3>
            <p className="text-xs text-slate-400">Autonomous voice & dialogue assistant</p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-semibold text-amber-400">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
          <span>Offline / Unconfigured</span>
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        Autonomous AI receptionist engine with natural dialogue handling, slot booking tool calls, and caller memory. Built completely with 100% free, local AI technologies.
      </p>

      {/* Local AI Tech Stack Preview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
          <div className="flex items-center space-x-1.5 text-indigo-400 font-semibold text-[11px]">
            <Cpu className="w-3.5 h-3.5" />
            <span>Local LLM</span>
          </div>
          <p className="text-[10px] text-slate-400">Ollama (Llama 3 / Mistral)</p>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
          <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold text-[11px]">
            <Mic className="w-3.5 h-3.5" />
            <span>Speech-to-Text</span>
          </div>
          <p className="text-[10px] text-slate-400">OpenAI Whisper (Local)</p>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
          <div className="flex items-center space-x-1.5 text-purple-400 font-semibold text-[11px]">
            <Volume2 className="w-3.5 h-3.5" />
            <span>Voice Synthesizer</span>
          </div>
          <p className="text-[10px] text-slate-400">Piper Neural TTS (Local)</p>
        </div>
      </div>

      <div className="pt-1 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          Zero paid API subscriptions
        </span>

        <Link
          href="/dashboard/ai-receptionist"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <span>Explore AI Roadmap</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
};
