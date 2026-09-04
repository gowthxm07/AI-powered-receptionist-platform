import React from 'react';
import { VoiceUIState } from '../../types/voice';
import { Wifi, Mic, Sparkles, Volume2, AlertCircle, PhoneOff } from 'lucide-react';

interface VoiceStatusProps {
  state: VoiceUIState;
  speechDetected?: boolean;
}

export const VoiceStatus: React.FC<VoiceStatusProps> = ({ state, speechDetected }) => {
  switch (state) {
    case 'CONNECTING':
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium animate-pulse">
          <Wifi className="w-3.5 h-3.5 animate-spin" />
          <span>Connecting to AI Receptionist...</span>
        </div>
      );

    case 'READY':
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Online & Ready to Listen</span>
        </div>
      );

    case 'RECORDING':
      return (
        <div
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
            speechDetected
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 animate-pulse'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400 animate-pulse'
          }`}
        >
          <Mic className={`w-3.5 h-3.5 ${speechDetected ? 'text-emerald-400' : 'text-rose-400'}`} />
          <span>{speechDetected ? 'Speech detected • Speaking...' : 'Listening... Speak now'}</span>
        </div>
      );

    case 'PROCESSING':
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400" />
          <span>Processing voice turn...</span>
        </div>
      );

    case 'PLAYING':
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
          <Volume2 className="w-3.5 h-3.5 animate-bounce text-indigo-400" />
          <span>AI is speaking...</span>
        </div>
      );

    case 'ERROR':
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Call Error</span>
        </div>
      );

    case 'ENDED':
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs font-medium">
          <PhoneOff className="w-3.5 h-3.5" />
          <span>Call Ended</span>
        </div>
      );

    case 'IDLE':
    default:
      return (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-slate-600"></span>
          <span>Offline / Idle</span>
        </div>
      );
  }
};
