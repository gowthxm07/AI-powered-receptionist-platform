import React from 'react';
import {
  RotateCcw,
  Building2,
  CheckCircle2,
  Phone,
  MapPin,
  Bot,
  CalendarPlus,
  HelpCircle,
  Users,
  Info,
  Sparkles,
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
  onResetSession,
  onSelectPrompt,
  isLoading,
}) => {
  const quickActions = [
    {
      label: 'Book an Appointment',
      prompt: 'I want to book an appointment',
      icon: CalendarPlus,
    },
    {
      label: 'Ask About Services',
      prompt: 'What services do you offer?',
      icon: HelpCircle,
    },
    {
      label: 'Ask About Staff',
      prompt: 'Who are your staff specialists?',
      icon: Users,
    },
    {
      label: 'Clinic Information',
      prompt: 'Where is your clinic located and what are your hours?',
      icon: Info,
    },
  ];

  const capabilities = [
    'Answer service & pricing inquiries',
    'Provide clinic location & hours',
    'Identify staff specialists & roles',
    'Schedule multi-turn appointments',
    'Check real-time calendar availability',
  ];

  return (
    <div className="flex flex-col gap-4 text-slate-200">
      {/* 1. Receptionist Status Card */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white tracking-tight">Receptionist Status</h4>
              <p className="text-[10px] text-slate-400">Virtual Assistant</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          AI receptionist is active and ready to assist callers with inquiries, bookings, and clinic information.
        </p>

        {sessionId && (
          <button
            onClick={onResetSession}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-750 border border-slate-700 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
            <span>Reset Conversation</span>
          </button>
        )}
      </div>

      {/* 2. Active Enterprise Card */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            Active Organization
          </span>
          {business && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
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
          <p className="text-xs text-slate-500 italic">No enterprise selected</p>
        )}
      </div>

      {/* 3. Receptionist Capabilities */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-sm space-y-3">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          Assistant Capabilities
        </span>

        <ul className="space-y-2 text-xs text-slate-300">
          {capabilities.map((cap) => (
            <li key={cap} className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{cap}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 4. Quick Action Buttons */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-sm space-y-2.5">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
          Quick Actions
        </span>
        <div className="grid grid-cols-1 gap-2">
          {quickActions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.label}
                onClick={() => onSelectPrompt(act.prompt)}
                disabled={isLoading || !business}
                className="flex items-center gap-2.5 text-xs px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800/90 text-slate-300 hover:text-white hover:border-indigo-500/40 hover:bg-indigo-950/20 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <Icon className="w-3.5 h-3.5 text-indigo-400 group-hover:text-indigo-300 flex-shrink-0" />
                <span className="font-medium">{act.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
