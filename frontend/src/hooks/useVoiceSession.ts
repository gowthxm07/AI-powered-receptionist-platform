import { useState, useCallback, useRef, useEffect } from 'react';
import {
  VoiceUIState,
  VoiceTransportSession,
  VoiceDialogueTurn,
  VoiceTurnMetrics,
  VoiceRecordingMetrics,
} from '../types/voice';
import { voiceTransportClient } from '../services/voice-transport.client';
import { useMediaRecorder } from './useMediaRecorder';

export function useVoiceSession() {
  const [uiState, setUiState] = useState<VoiceUIState>('IDLE');
  const [session, setSession] = useState<VoiceTransportSession | null>(null);
  const [dialogueTurns, setDialogueTurns] = useState<VoiceDialogueTurn[]>([]);
  const [lastMetrics, setLastMetrics] = useState<VoiceTurnMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<string | null>(null);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const sessionRef = useRef<VoiceTransportSession | null>(null);
  sessionRef.current = session;

  // Handler when recorded audio Blob and metrics are ready from useMediaRecorder
  const handleAudioReady = useCallback(
    async (blob: Blob, mimeType: string, recordingMetrics?: VoiceRecordingMetrics) => {
      const currentSession = sessionRef.current;
      if (!currentSession) {
        setError('Voice session not found. Please restart the call.');
        setUiState('ERROR');
        return;
      }

      // Safe structured client recording telemetry logging (NO audio data, NO PII)
      if (recordingMetrics) {
        console.log(
          `[Voice Recording] duration=${recordingMetrics.recordingDurationMs}ms size=${recordingMetrics.audioBlobSizeBytes}bytes speechDetected=${recordingMetrics.speechDetected} trailingSilence=${recordingMetrics.trailingSilenceMs}ms autoStop=${recordingMetrics.autoStopTriggered} uploadDispatch=${recordingMetrics.uploadDispatchMs}ms`
        );
      }

      setUiState('PROCESSING');
      setError(null);

      try {
        const fetchStart = performance.now();
        const turnResult = await voiceTransportClient.submitAudioTurn({
          transportSessionId: currentSession.transportSessionId,
          businessId: currentSession.businessId,
          customerId: currentSession.customerId || undefined,
          audioBlob: blob,
          channel: 'MOBILE_WEB',
        });
        const uploadNetworkMs = Number((performance.now() - fetchStart).toFixed(2));

        // Prepare audio playback immediately without React render delays
        const audioUrl = turnResult.audio?.url
          ? voiceTransportClient.getAudioStreamUrl(turnResult.audio.audioId)
          : undefined;

        let audioPlaybackPrepMs = 0;
        let audioPlaybackStartMs = 0;

        if (audioUrl) {
          const prepStart = performance.now();
          if (audioPlayerRef.current) {
            audioPlayerRef.current.pause();
          }

          const player = new Audio();
          audioPlayerRef.current = player;
          player.preload = 'auto';
          player.src = audioUrl;
          audioPlaybackPrepMs = Number((performance.now() - prepStart).toFixed(2));

          player.onended = () => {
            setUiState('READY');
          };
          player.onerror = () => {
            setUiState('READY');
          };

          const playStart = performance.now();
          setUiState('PLAYING');

          try {
            await player.play();
            audioPlaybackStartMs = Number((performance.now() - playStart).toFixed(2));
          } catch {
            audioPlaybackStartMs = Number((performance.now() - playStart).toFixed(2));
            setUiState('READY');
          }
        } else {
          setUiState('READY');
        }

        // Calculate 8 distinct pipeline stages
        const stage1FinalizeMs = Number(
          ((recordingMetrics?.mediaRecorderFinalizeMs || 20) + (recordingMetrics?.audioBlobReadyMs || 4)).toFixed(2)
        );
        const stage2UploadMs = uploadNetworkMs;
        const stage3SttMs = Number(
          ((turnResult.metrics.audioConversionMs || 0) + (turnResult.metrics.sttMs || 0)).toFixed(2)
        );
        const convMs = turnResult.metrics.conversationMs || 0;
        const dbMs = turnResult.metrics.databaseToolLatencyMs || 0;
        const llmMs = turnResult.metrics.ollamaLatencyMs || 0;
        const stage4AiConvMs = Number(Math.max(1, convMs - dbMs - llmMs).toFixed(2));
        const stage5DbMs = Number((dbMs + llmMs).toFixed(2));
        const stage6TtsMs = Number((turnResult.metrics.ttsMs || 0).toFixed(2));
        const stage7DeliveryMs = audioPlaybackPrepMs;
        const stage8PlaybackMs = audioPlaybackStartMs;

        // Calculate composite latencies
        const recStopWall = recordingMetrics?.recordingStopTimestamp || Date.now();
        const clientStopTrigger = recordingMetrics?.stopTriggerTime || (fetchStart - (recordingMetrics?.uploadDispatchMs || 25));
        const endToEndVoiceLatencyMs = Number((performance.now() - clientStopTrigger).toFixed(2));
        const speechToTranscriptionMs = Number(
          ((recordingMetrics?.uploadDispatchMs || 20) + (turnResult.metrics.audioValidationMs || 0) + stage3SttMs).toFixed(2)
        );
        const transcriptionToResponseMs = Number(
          (convMs + (turnResult.metrics.responseOptimizationMs || 0) + stage6TtsMs).toFixed(2)
        );
        const responseToPlaybackMs = Number((stage7DeliveryMs + stage8PlaybackMs).toFixed(2));

        // Merge backend transport metrics with client recording telemetry and stage breakdown
        const mergedMetrics: VoiceTurnMetrics = {
          ...turnResult.metrics,
          ...(recordingMetrics || {}),
          recordingStopTimestamp: recStopWall,
          mediaRecorderFinalizeMs: recordingMetrics?.mediaRecorderFinalizeMs,
          audioBlobReadyMs: recordingMetrics?.audioBlobReadyMs,
          uploadNetworkMs,
          audioPlaybackPrepMs,
          audioPlaybackStartMs,
          endToEndVoiceLatencyMs,
          speechToTranscriptionMs,
          transcriptionToResponseMs,
          responseToPlaybackMs,
          stageBreakdown: {
            stage1FinalizeMs,
            stage2UploadMs,
            stage3SttMs,
            stage4AiConvMs,
            stage5DbMs,
            stage6TtsMs,
            stage7DeliveryMs,
            stage8PlaybackMs,
          },
        };

        // Append user turn
        if (turnResult.transcript) {
          setDialogueTurns((prev) => [
            ...prev,
            {
              id: `usr_${Date.now()}`,
              speaker: 'user',
              text: turnResult.transcript,
              timestamp: new Date(),
            },
          ]);
        }

        // Append assistant turn
        if (turnResult.responseText) {
          setDialogueTurns((prev) => [
            ...prev,
            {
              id: `ast_${Date.now()}`,
              speaker: 'assistant',
              text: turnResult.responseText,
              audioUrl,
              timestamp: new Date(),
              source: turnResult.source,
              metrics: mergedMetrics,
            },
          ]);

          if (turnResult.metadata?.conversationStep) {
            setActiveStep(turnResult.metadata.conversationStep);
          }

          setLastMetrics(mergedMetrics);
        }

        // Safe telemetry log (no PII, no audio buffers)
        console.log(
          `[Voice Latency] endToEnd=${endToEndVoiceLatencyMs}ms (finalize=${stage1FinalizeMs}ms upload=${stage2UploadMs}ms stt=${stage3SttMs}ms ai=${stage4AiConvMs}ms db=${stage5DbMs}ms tts=${stage6TtsMs}ms deliv=${stage7DeliveryMs}ms play=${stage8PlaybackMs}ms)`
        );

        // Refresh session turn count
        setSession((prev) => (prev ? { ...prev, turnCount: prev.turnCount + 1 } : null));
      } catch (err: any) {
        setError(err.message || 'Failed to process voice turn.');
        setUiState('READY');
      }
    },
    []
  );

  const {
    isRecording,
    recordingDurationSec,
    permissionState,
    isSupported,
    isSecureContext,
    diagnostics,
    errorMessage: recorderError,
    speechDetected,
    volumeLevel,
    autoStopTriggered,
    autoStopEnabled,
    setAutoStopEnabled,
    silenceThresholdMs,
    setSilenceThresholdMs,
    lastRecordingMetrics,
    requestPermission,
    startRecording,
    stopRecording,
    releaseMicrophone,
  } = useMediaRecorder({
    onAudioReady: handleAudioReady,
    onError: (err) => {
      setError(err.message);
      setUiState('ERROR');
    },
  });

  // Clean up audio player on unmount
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  /**
   * Start and initialize a new voice session.
   */
  const startSession = useCallback(
    async (businessId: string, customerId?: string) => {
      setError(null);
      setUiState('CONNECTING');
      setDialogueTurns([]);
      setLastMetrics(null);
      setActiveStep('IDLE');

      try {
        // 1. Request microphone access first
        const micGranted = await requestPermission();
        if (!micGranted) {
          setUiState('ERROR');
          return false;
        }

        // 2. Create transport session on backend
        const newSession = await voiceTransportClient.createSession({
          businessId,
          customerId,
          channel: 'MOBILE_WEB',
        });

        setSession(newSession);

        // 3. Initial welcome assistant greeting
        setDialogueTurns([
          {
            id: `ast_init_${Date.now()}`,
            speaker: 'assistant',
            text: 'Hello! Welcome to our receptionist. How can I help you today?',
            timestamp: new Date(),
            source: 'deterministic',
          },
        ]);

        setUiState('READY');
        return true;
      } catch (err: any) {
        setError(err.message || 'Unable to connect to the voice receptionist.');
        setUiState('ERROR');
        return false;
      }
    },
    [requestPermission]
  );

  /**
   * Start speaking / recording.
   */
  const startTalking = useCallback(async () => {
    if (uiState !== 'READY' && uiState !== 'PLAYING') return;

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const started = await startRecording();
    if (started) {
      setUiState('RECORDING');
    }
  }, [uiState, startRecording]);

  /**
   * Stop speaking / recording and submit turn (Push-to-Talk manual stop).
   */
  const stopTalking = useCallback(() => {
    if (uiState !== 'RECORDING') return;
    stopRecording();
    // handleAudioReady callback will be triggered via MediaRecorder.onstop
  }, [uiState, stopRecording]);

  /**
   * End and terminate the active voice session.
   */
  const endSession = useCallback(async () => {
    const currentSession = sessionRef.current;
    releaseMicrophone();

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }

    if (currentSession) {
      await voiceTransportClient.terminateSession(currentSession.transportSessionId).catch(() => {});
    }

    setSession(null);
    setUiState('ENDED');
  }, [releaseMicrophone]);

  /**
   * Reset session state back to IDLE.
   */
  const resetSession = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    releaseMicrophone();
    setSession(null);
    setDialogueTurns([]);
    setLastMetrics(null);
    setError(null);
    setActiveStep(null);
    setUiState('IDLE');
  }, [releaseMicrophone]);

  return {
    uiState,
    session,
    dialogueTurns,
    lastMetrics,
    error: error || recorderError,
    activeStep,
    isRecording,
    recordingDurationSec,
    permissionState,
    isSupported,
    isSecureContext,
    diagnostics,
    speechDetected,
    volumeLevel,
    autoStopTriggered,
    autoStopEnabled,
    setAutoStopEnabled,
    silenceThresholdMs,
    setSilenceThresholdMs,
    lastRecordingMetrics,
    startSession,
    startTalking,
    stopTalking,
    endSession,
    resetSession,
  };
}
