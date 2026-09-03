import React, { useState } from 'react';
import { VoiceTransportSession, VoiceTurnMetrics } from '../../types/voice';
import { ChevronDown, ChevronUp, Cpu, Gauge, Layers, ShieldCheck } from 'lucide-react';

interface VoiceSessionInfoProps {
  session: VoiceTransportSession | null;
  activeStep: string | null;
  metrics: VoiceTurnMetrics | null;
}

export const VoiceSessionInfo: React.FC<VoiceSessionInfoProps> = ({
  session,
  activeStep,
  metrics,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  if (!session) return null;

  const maskId = (id: string) => {
    if (!id || id.length < 12) return id;
    return `${id.slice(0, 7)}...${id.slice(-4)}`;
  };

  return (
    <div className="w-full max-w-sm mx-auto rounded-2xl bg-slate-900/80 border border-slate-800 text-slate-300 text-xs shadow-md overflow-hidden transition-all">
      {/* Header Accordion Toggle */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-800/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-slate-200">Session & Telemetry</span>
          {metrics && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-medium">
              ~{(metrics.totalMs / 1000).toFixed(2)}s
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="p-4 border-t border-slate-800/80 space-y-3 bg-slate-950/60">
          {/* Session IDs */}
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div>
              <span className="text-slate-500 block text-[10px]">Transport Session</span>
              <span className="text-indigo-300">{maskId(session.transportSessionId)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Conversation ID</span>
              <span className="text-indigo-300">{maskId(session.conversationSessionId)}</span>
            </div>
          </div>

          {/* Conversation State */}
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Step:</span>
            </div>
            <span className="font-mono text-emerald-400 font-semibold">{activeStep || 'IDLE'}</span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Turn Counter:</span>
            <span className="font-mono text-slate-200">{session.turnCount} turns</span>
          </div>

          {/* Real Measured Latency Breakdown */}
          {metrics && (
            <div className="pt-2 border-t border-slate-800 space-y-1 text-[11px] font-mono">
              <div className="flex items-center gap-1 text-[10px] text-indigo-400 uppercase font-bold tracking-wider mb-1">
                <Gauge className="w-3 h-3" />
                <span>Last Turn Latency</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Transport Overhead:</span>
                <span className="text-slate-300">{metrics.transportOverheadMs.toFixed(1)} ms</span>
              </div>
              {metrics.audioConversionMs !== undefined && metrics.audioConversionMs > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Audio Conversion (FFmpeg):</span>
                  <span className="text-indigo-300">{metrics.audioConversionMs.toFixed(1)} ms</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>Speech-to-Text (Whisper):</span>
                <span className="text-slate-300">{metrics.sttMs.toFixed(1)} ms</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Conversation Engine:</span>
                <span className="text-slate-300">{metrics.conversationMs.toFixed(1)} ms</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Neural Voice (Piper):</span>
                <span className="text-slate-300">{metrics.ttsMs.toFixed(1)} ms</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-bold pt-1 border-t border-slate-800/60">
                <span>Total Response Roundtrip:</span>
                <span>{metrics.totalMs.toFixed(1)} ms (~{(metrics.totalMs / 1000).toFixed(2)}s)</span>
              </div>
            </div>
          )}

          {/* Runtime Hardware Profile */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
            <div className="flex items-center gap-1">
              <Cpu className="w-3 h-3" />
              <span>CPU Inference (Alder Lake)</span>
            </div>
            <span>Zero Cloud APIs</span>
          </div>
        </div>
      )}
    </div>
  );
};
