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
        const turnResult = await voiceTransportClient.submitAudioTurn({
          transportSessionId: currentSession.transportSessionId,
          businessId: currentSession.businessId,
          customerId: currentSession.customerId || undefined,
          audioBlob: blob,
          channel: 'MOBILE_WEB',
        });

        // Merge backend transport metrics with client recording telemetry
        const mergedMetrics: VoiceTurnMetrics = {
          ...turnResult.metrics,
          ...(recordingMetrics || {}),
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
          const audioUrl = turnResult.audio?.url
            ? voiceTransportClient.getAudioStreamUrl(turnResult.audio.audioId)
            : undefined;

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

          // Play audio response if available
          if (audioUrl) {
            setUiState('PLAYING');
            if (audioPlayerRef.current) {
              audioPlayerRef.current.pause();
            }

            const player = new Audio(audioUrl);
            audioPlayerRef.current = player;

            player.onended = () => {
              setUiState('READY');
            };
            player.onerror = () => {
              setUiState('READY');
            };

            await player.play().catch(() => {
              // Browser autoplay policy might require manual interaction
              setUiState('READY');
            });
          } else {
            setUiState('READY');
          }
        } else {
          setUiState('READY');
        }

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
