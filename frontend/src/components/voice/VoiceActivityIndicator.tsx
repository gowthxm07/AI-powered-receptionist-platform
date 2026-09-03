import React from 'react';
import { VoiceUIState } from '../../types/voice';
import { Bot, Mic, Sparkles, Volume2 } from 'lucide-react';

interface VoiceActivityIndicatorProps {
  state: VoiceUIState;
}

export const VoiceActivityIndicator: React.FC<VoiceActivityIndicatorProps> = ({ state }) => {
  return (
    <div className="relative flex items-center justify-center w-36 h-36 mx-auto">
      {/* Outer ambient glow rings */}
      {state === 'RECORDING' && (
        <>
          <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping" />
          <div className="absolute -inset-2 rounded-full bg-rose-500/10 animate-pulse" />
        </>
      )}

      {state === 'PLAYING' && (
        <>
          <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
          <div className="absolute -inset-2 rounded-full bg-indigo-500/15 animate-pulse" />
        </>
      )}

      {state === 'PROCESSING' && (
        <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-500/50 animate-spin" />
      )}

      {state === 'READY' && (
        <div className="absolute inset-0 rounded-full bg-emerald-500/10 border border-emerald-500/20 animate-pulse" />
      )}

      {/* Center Avatar Container */}
      <div
        className={`relative z-10 w-28 h-28 rounded-3xl flex items-center justify-center shadow-2xl transition-all duration-300 ${
          state === 'RECORDING'
            ? 'bg-gradient-to-tr from-rose-600 to-red-500 shadow-rose-500/30 scale-105'
            : state === 'PLAYING'
            ? 'bg-gradient-to-tr from-indigo-600 to-blue-500 shadow-indigo-500/30 scale-105'
            : state === 'PROCESSING'
            ? 'bg-gradient-to-tr from-amber-600 to-yellow-500 shadow-amber-500/20 scale-95'
            : state === 'READY'
            ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/20'
            : 'bg-slate-800 border border-slate-700 shadow-slate-900/50'
        }`}
      >
        {state === 'RECORDING' ? (
          <Mic className="w-12 h-12 text-white animate-pulse" />
        ) : state === 'PLAYING' ? (
          <div className="flex items-center gap-1">
            <Volume2 className="w-10 h-10 text-white animate-bounce" />
            <div className="flex gap-1 items-end h-8">
              <span className="w-1 bg-white rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-4" />
              <span className="w-1 bg-white rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-8" />
              <span className="w-1 bg-white rounded-full animate-[pulse_0.5s_ease-in-out_infinite] h-6" />
            </div>
          </div>
        ) : state === 'PROCESSING' ? (
          <Sparkles className="w-12 h-12 text-white animate-spin" />
        ) : (
          <Bot className="w-12 h-12 text-white" />
        )}
      </div>
    </div>
  );
};
