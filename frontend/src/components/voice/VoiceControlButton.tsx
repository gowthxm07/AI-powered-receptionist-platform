import React from 'react';
import { VoiceUIState } from '../../types/voice';
import { Phone, Mic, Square, Sparkles, PhoneOff } from 'lucide-react';
import { RecordingTimer } from './RecordingTimer';

interface VoiceControlButtonProps {
  state: VoiceUIState;
  recordingDurationSec: number;
  autoStopEnabled?: boolean;
  speechDetected?: boolean;
  disabled?: boolean;
  onStartSession: () => void;
  onStartTalking: () => void;
  onStopTalking: () => void;
  onEndSession: () => void;
}

export const VoiceControlButton: React.FC<VoiceControlButtonProps> = ({
  state,
  recordingDurationSec,
  autoStopEnabled = true,
  speechDetected = false,
  disabled = false,
  onStartSession,
  onStartTalking,
  onStopTalking,
  onEndSession,
}) => {
  // When not in call
  if (state === 'IDLE' || state === 'ENDED' || state === 'ERROR') {
    return (
      <div className="w-full max-w-xs mx-auto flex flex-col gap-3">
        <button
          onClick={onStartSession}
          disabled={disabled}
          className={`w-full h-14 rounded-2xl font-semibold text-base flex items-center justify-center gap-3 transition-all ${
            disabled
              ? 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/25 active:scale-[0.98]'
          }`}
        >
          <Phone className="w-5 h-5" />
          <span>Start Voice Reception</span>
        </button>
      </div>
    );
  }

  // When connecting
  if (state === 'CONNECTING') {
    return (
      <div className="w-full max-w-xs mx-auto">
        <button
          disabled
          className="w-full h-14 rounded-2xl bg-slate-800 text-slate-400 font-semibold text-base border border-slate-700 flex items-center justify-center gap-3 cursor-not-allowed"
        >
          <Sparkles className="w-5 h-5 animate-spin text-indigo-400" />
          <span>Connecting...</span>
        </button>
      </div>
    );
  }

  // Active call controls
  return (
    <div className="w-full max-w-xs mx-auto flex flex-col items-center gap-4">
      {/* Primary Push-to-Talk / Control Button */}
      {state === 'RECORDING' ? (
        <button
          onClick={onStopTalking}
          className="w-full h-16 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-base shadow-xl shadow-rose-600/30 flex items-center justify-center gap-3 transition-all active:scale-[0.98] animate-pulse"
        >
          <Square className="w-5 h-5 fill-current" />
          <div className="flex flex-col items-start leading-tight">
            <span>Tap to Stop & Send</span>
            <div className="flex items-center gap-2 text-xs text-rose-200">
              <RecordingTimer durationSec={recordingDurationSec} />
              {autoStopEnabled && (
                <span className="text-[10px] bg-rose-700/80 px-1.5 py-0.5 rounded font-mono">
                  {speechDetected ? 'Auto-stop on pause' : 'Auto-stop: On'}
                </span>
              )}
            </div>
          </div>
        </button>
      ) : state === 'PROCESSING' ? (
        <button
          disabled
          className="w-full h-16 rounded-2xl bg-slate-800/90 text-amber-300 font-semibold text-base border border-amber-500/30 flex items-center justify-center gap-3 cursor-not-allowed shadow-md"
        >
          <Sparkles className="w-5 h-5 animate-spin text-amber-400" />
          <span>Processing Turn...</span>
        </button>
      ) : (
        <button
          onClick={onStartTalking}
          className="w-full h-16 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-base shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
        >
          <Mic className="w-6 h-6" />
          <span>Tap to Speak</span>
        </button>
      )}

      {/* Secondary End Call Button */}
      <button
        onClick={onEndSession}
        className="px-4 py-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs font-medium transition-colors flex items-center gap-2"
      >
        <PhoneOff className="w-4 h-4" />
        <span>End Call</span>
      </button>
    </div>
  );
};
