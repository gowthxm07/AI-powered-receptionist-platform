import React, { useState } from 'react';
import { VoiceTransportSession, VoiceTurnMetrics } from '../../types/voice';
import { ChevronDown, ChevronUp, Cpu, Gauge, Layers, ShieldCheck, Mic } from 'lucide-react';

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
    <div className="w-full rounded-2xl bg-slate-900/90 border border-slate-800 text-xs overflow-hidden shadow-md">
      {/* Accordion Header */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full px-4 py-3 flex items-center justify-between text-slate-300 hover:text-white transition-colors"
      >
        <div className="flex items-center gap-2 font-medium">
          <Layers className="w-4 h-4 text-indigo-400" />
          <span>Active Session Telemetry</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400">
            Turns: {session.turnCount}
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="px-4 pb-4 space-y-3 pt-1 border-t border-slate-800/80">
          {/* Tenant & Session Mapping */}
          <div className="space-y-1 text-slate-400">
            <div className="flex justify-between">
              <span>Transport Session:</span>
              <span className="font-mono text-slate-200">{maskId(session.transportSessionId)}</span>
            </div>
            <div className="flex justify-between">
              <span>Conversation Session:</span>
              <span className="font-mono text-slate-200">{maskId(session.conversationSessionId)}</span>
            </div>
            <div className="flex justify-between">
              <span>Channel:</span>
              <span className="text-emerald-400 font-semibold">{session.channel}</span>
            </div>
            <div className="flex justify-between">
              <span>Tenant Business:</span>
              <span className="font-mono text-slate-300">{maskId(session.businessId)}</span>
            </div>
            {activeStep && (
              <div className="flex justify-between">
                <span>Active Dialogue Step:</span>
                <span className="text-indigo-300 font-mono font-semibold">{activeStep}</span>
              </div>
            )}
          </div>

          {/* Client Voice Turn Detection Telemetry */}
          {metrics && metrics.recordingDurationMs !== undefined && (
            <div className="pt-2 border-t border-slate-800 space-y-1 text-[11px] font-mono">
              <div className="flex items-center gap-1 text-[10px] text-teal-400 uppercase font-bold tracking-wider mb-1">
                <Mic className="w-3 h-3" />
                <span>Turn Audio Detection</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Recording Duration:</span>
                <span className="text-slate-300">{metrics.recordingDurationMs.toFixed(1)} ms</span>
              </div>
              {metrics.audioBlobSizeBytes !== undefined && (
                <div className="flex justify-between text-slate-400">
                  <span>Audio Payload Size:</span>
                  <span className="text-slate-300">{(metrics.audioBlobSizeBytes / 1024).toFixed(1)} KB ({metrics.audioBlobSizeBytes} B)</span>
                </div>
              )}
              <div className="flex justify-between text-slate-400">
                <span>Speech Detected:</span>
                <span className={metrics.speechDetected ? 'text-emerald-400' : 'text-amber-400'}>
                  {metrics.speechDetected ? 'Yes' : 'No'}
                </span>
              </div>
              {metrics.trailingSilenceMs !== undefined && metrics.trailingSilenceMs > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Trailing Silence:</span>
                  <span className="text-slate-300">{metrics.trailingSilenceMs.toFixed(1)} ms</span>
                </div>
              )}
              {metrics.autoStopTriggered !== undefined && (
                <div className="flex justify-between text-slate-400">
                  <span>Auto-Stop Triggered:</span>
                  <span className={metrics.autoStopTriggered ? 'text-teal-300 font-semibold' : 'text-slate-500'}>
                    {metrics.autoStopTriggered ? 'Yes (Silence)' : 'No (Manual)'}
                  </span>
                </div>
              )}
              {metrics.uploadDispatchMs !== undefined && (
                <div className="flex justify-between text-slate-400">
                  <span>Upload Dispatch Delay:</span>
                  <span className="text-indigo-300">{metrics.uploadDispatchMs.toFixed(1)} ms</span>
                </div>
              )}
              {metrics.vadOverheadMs !== undefined && (
                <div className="flex justify-between text-slate-400">
                  <span>VAD Overhead / cycle:</span>
                  <span className="text-slate-300">{metrics.vadOverheadMs.toFixed(2)} ms</span>
                </div>
              )}
            </div>
          )}

          {/* 8-Stage Real-Time Pipeline Latency Breakdown */}
          {metrics && (
            <div className="pt-2 border-t border-slate-800 space-y-1 text-[11px] font-mono">
              <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider mb-1">
                <div className="flex items-center gap-1 text-indigo-400">
                  <Gauge className="w-3 h-3" />
                  <span>8-Stage Voice Latency Breakdown</span>
                </div>
                {metrics.endToEndVoiceLatencyMs !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      metrics.endToEndVoiceLatencyMs < 2000
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : metrics.endToEndVoiceLatencyMs < 3500
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    Total: {metrics.endToEndVoiceLatencyMs.toFixed(0)} ms
                  </span>
                )}
              </div>

              {metrics.stageBreakdown ? (
                <>
                  <div className="flex justify-between text-slate-400">
                    <span>1. Audio Finalization:</span>
                    <span className="text-slate-300">{metrics.stageBreakdown.stage1FinalizeMs.toFixed(1)} ms</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>2. Audio Upload & Net:</span>
                    <span className="text-slate-300">{metrics.stageBreakdown.stage2UploadMs.toFixed(1)} ms</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>3. Whisper STT:</span>
                    <span className="text-slate-300">{metrics.stageBreakdown.stage3SttMs.toFixed(1)} ms</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>4. AI Conversation Engine:</span>
                    <span className="text-slate-300">{metrics.stageBreakdown.stage4AiConvMs.toFixed(1)} ms</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>5. Database / Tool Execution:</span>
                    <span className="text-slate-300">{metrics.stageBreakdown.stage5DbMs.toFixed(1)} ms</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>6. Piper Neural TTS:</span>
                    <span className="text-slate-300">{metrics.stageBreakdown.stage6TtsMs.toFixed(1)} ms</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>7. Response Delivery:</span>
                    <span className="text-slate-300">{metrics.stageBreakdown.stage7DeliveryMs.toFixed(1)} ms</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>8. Mobile Playback Start:</span>
                    <span className="text-slate-300">{metrics.stageBreakdown.stage8PlaybackMs.toFixed(1)} ms</span>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}

              {/* Composite Latencies */}
              {metrics.speechToTranscriptionMs !== undefined && (
                <div className="pt-1 border-t border-slate-800/40 text-[10px] text-slate-400 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Speech → Transcription:</span>
                    <span className="text-slate-300">{metrics.speechToTranscriptionMs.toFixed(1)} ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Transcription → Response:</span>
                    <span className="text-slate-300">{metrics.transcriptionToResponseMs?.toFixed(1)} ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Response → Playback:</span>
                    <span className="text-slate-300">{metrics.responseToPlaybackMs?.toFixed(1)} ms</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between text-emerald-400 font-bold pt-1 border-t border-slate-800/60">
                <span>Total Response Latency:</span>
                <span>
                  {metrics.endToEndVoiceLatencyMs !== undefined
                    ? `${metrics.endToEndVoiceLatencyMs.toFixed(1)} ms (~${(metrics.endToEndVoiceLatencyMs / 1000).toFixed(2)}s)`
                    : `${metrics.totalMs.toFixed(1)} ms (~${(metrics.totalMs / 1000).toFixed(2)}s)`}
                </span>
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
