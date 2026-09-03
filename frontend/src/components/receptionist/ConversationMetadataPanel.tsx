import React, { useState } from 'react';
import {
  Activity,
  Zap,
  Wrench,
  Sparkles,
  ShieldAlert,
  RotateCcw,
  Copy,
  Check,
  Building2,
  Clock,
  Compass,
  CheckCircle2,
  Layers,
  Phone,
  MapPin,
  CalendarDays,
} from 'lucide-react';
import { Business } from '../../types/dashboard';
import { ConversationMetadata, ResponseSource } from '../../types/conversation';

interface ConversationMetadataPanelProps {
  business: Business | null;
  sessionId: string | null;
  lastSource?: ResponseSource;
  lastIntent?: string;
  lastAction?: string;
  lastLatencyMs?: number;
  lastTotalLatencyMs?: number;
  metadata?: ConversationMetadata;
  onResetSession: () => void;
  onSelectPrompt: (prompt: string) => void;
  isLoading: boolean;
}

export const ConversationMetadataPanel: React.FC<ConversationMetadataPanelProps> = ({
  business,
  sessionId,
  lastSource,
  lastIntent,
  lastAction,
  lastLatencyMs,
  lastTotalLatencyMs,
  metadata,
  onResetSession,
  onSelectPrompt,
  isLoading,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopySessionId = () => {
    if (!sessionId) return;
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getSourceDisplay = (source?: ResponseSource) => {
    switch (source) {
      case 'deterministic':
        return {
          label: 'Deterministic Fast Path',
          icon: Zap,
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        };
      case 'tool':
        return {
          label: 'PostgreSQL Tool Execution',
          icon: Wrench,
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
        };
      case 'llm':
        return {
          label: 'Local LLM (llama3.2:3b)',
          icon: Sparkles,
          color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
        };
      case 'fallback':
        return {
          label: 'Safe Fallback Response',
          icon: ShieldAlert,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        };
      default:
        return {
          label: 'Awaiting Dialogue',
          icon: Activity,
          color: 'text-slate-400 bg-slate-800/40 border-slate-700/50',
        };
    }
  };

  const formatLatency = (ms?: number) => {
    if (ms === undefined || ms === null) return '—';
    if (ms < 1000) {
      return `${ms.toFixed(1)} ms`;
    }
    return `${(ms / 1000).toFixed(2)} s`;
  };

  const sourceInfo = getSourceDisplay(lastSource);
  const SourceIcon = sourceInfo.icon;

  const demoPrompts = [
    'I want to book an appointment',
    'What services do you offer?',
    'Who are your staff specialists?',
    'Where is your clinic located?',
  ];

  return (
    <div className="flex flex-col gap-4 text-slate-200">
      {/* 1. Active Enterprise Card */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            Active Enterprise
          </span>
          {business && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Connected
            </span>
          )}
        </div>

        {business ? (
          <div className="space-y-1.5">
            <h4 className="text-sm font-bold text-white tracking-tight">{business.name}</h4>
            {business.address && (
              <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
                <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
                {business.address}
              </p>
            )}
            {business.phone && (
              <p className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
                <Phone className="w-3 h-3 text-slate-500 flex-shrink-0" />
                {business.phone}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">No business selected</p>
        )}
      </div>

      {/* 2. Session Status & Reset */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            Conversation Session
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
              sessionId
                ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {sessionId ? 'Active' : 'New Session'}
          </span>
        </div>

        {sessionId ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800/80 rounded-xl px-3 py-2 text-xs font-mono text-slate-300">
              <span className="truncate max-w-[160px]" title={sessionId}>
                {sessionId}
              </span>
              <button
                onClick={handleCopySessionId}
                aria-label="Copy session ID"
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-2"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              onClick={onResetSession}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold bg-slate-800/90 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/80 transition-all hover:shadow"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
              + New Conversation
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            A secure session will be automatically generated upon sending your first message.
          </p>
        )}
      </div>

      {/* 3. Live Technical Metadata Card */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-sm space-y-3.5">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-indigo-400" />
          Technical Telemetry
        </span>

        {/* Source Badge */}
        <div>
          <span className="text-[10px] text-slate-500 font-medium block mb-1">Response Source</span>
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border ${sourceInfo.color}`}
          >
            <SourceIcon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-semibold">{sourceInfo.label}</span>
          </div>
        </div>

        {/* Intent & Action Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
            <span className="text-[10px] text-slate-500 block mb-0.5">Classified Intent</span>
            <span className="font-mono font-semibold text-indigo-300 truncate block">
              {lastIntent || 'NONE'}
            </span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5">
            <span className="text-[10px] text-slate-500 block mb-0.5">Resolved Action</span>
            <span className="font-mono font-semibold text-blue-300 truncate block">
              {lastAction || 'NONE'}
            </span>
          </div>
        </div>

        {/* Conversation Step */}
        {metadata?.conversationStep && (
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-xs">
            <span className="text-[10px] text-slate-500 block mb-0.5">Booking Step</span>
            <span className="font-mono font-semibold text-emerald-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-emerald-500" />
              {metadata.conversationStep}
            </span>
          </div>
        )}

        {/* Latency Timing Metrics */}
        <div className="pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              Engine Latency:
            </span>
            <span className="font-mono font-bold text-indigo-300">{formatLatency(lastLatencyMs)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-slate-500" />
              Total API Latency:
            </span>
            <span className="font-mono font-bold text-emerald-400">{formatLatency(lastTotalLatencyMs)}</span>
          </div>
        </div>
      </div>

      {/* 4. Quick Demo Scenario Prompts */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-sm">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
          <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
          Suggested Demonstrations
        </span>
        <div className="flex flex-col gap-1.5">
          {demoPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onSelectPrompt(prompt)}
              disabled={isLoading || !business}
              className="text-left text-xs px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300 hover:text-white hover:border-indigo-500/40 hover:bg-indigo-950/20 transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              &ldquo;{prompt}&rdquo;
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
