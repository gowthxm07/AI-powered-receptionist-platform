import { useState, useRef, useCallback, useEffect } from 'react';
import {
  MicrophonePermissionState,
  MicrophoneDiagnostics,
  VoiceActivityConfig,
  VoiceRecordingMetrics,
} from '../types/voice';
import { getApiBaseUrl } from '../lib/api';
import { VoiceActivityDetector, DEFAULT_VAD_CONFIG } from '../lib/voice-activity-detector';

/**
 * Determine the best browser-supported audio MIME type for MediaRecorder.
 */
export function getSupportedMimeType(): string {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return 'audio/webm';
  }

  const preferredTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
    'audio/aac',
    'audio/wav',
  ];

  for (const type of preferredTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return '';
}

/**
 * Perform safe, client-side runtime capability diagnostics.
 * Does not expose PII, audio buffers, or sensitive credentials.
 */
export function getMicrophoneDiagnostics(): MicrophoneDiagnostics {
  if (typeof window === 'undefined') {
    return {
      isSecureContext: false,
      hasMediaDevices: false,
      hasGetUserMedia: false,
      hasMediaRecorder: false,
      supportedMimeType: '',
      protocol: '',
      host: '',
      origin: '',
      apiBaseUrl: '',
      sessionEndpoint: '/api/ai/voice/transport/session',
    };
  }

  const isSecure = typeof window.isSecureContext === 'boolean'
    ? window.isSecureContext
    : window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
  const hasMediaDev = !!(typeof navigator !== 'undefined' && navigator.mediaDevices);
  const hasGUM = !!(hasMediaDev && typeof navigator.mediaDevices.getUserMedia === 'function');
  const hasMR = typeof MediaRecorder !== 'undefined';
  const supportedMime = getSupportedMimeType();
  const apiBase = getApiBaseUrl();

  return {
    isSecureContext: isSecure,
    hasMediaDevices: hasMediaDev,
    hasGetUserMedia: hasGUM,
    hasMediaRecorder: hasMR,
    supportedMimeType: supportedMime,
    protocol: window.location.protocol || '',
    host: window.location.host || '',
    origin: window.location.origin || `${window.location.protocol}//${window.location.host}`,
    apiBaseUrl: apiBase === '' ? '/api (relative proxy)' : apiBase,
    sessionEndpoint: `${apiBase}/api/ai/voice/transport/session`,
  };
}

export interface UseMediaRecorderOptions {
  onAudioReady?: (blob: Blob, mimeType: string, metrics?: VoiceRecordingMetrics) => void;
  onError?: (err: Error) => void;
  vadConfig?: Partial<VoiceActivityConfig>;
  initialAutoStopEnabled?: boolean;
}

export function useMediaRecorder(options: UseMediaRecorderOptions = {}) {
  const { onAudioReady, onError, vadConfig, initialAutoStopEnabled = true } = options;

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDurationSec, setRecordingDurationSec] = useState<number>(0);
  const [permissionState, setPermissionState] = useState<MicrophonePermissionState>('prompt');
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isSecureContext, setIsSecureContext] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<MicrophoneDiagnostics | null>(null);

  // VAD and silence handling reactive states
  const [speechDetected, setSpeechDetected] = useState<boolean>(false);
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const [autoStopTriggered, setAutoStopTriggered] = useState<boolean>(false);
  const [autoStopEnabled, setAutoStopEnabled] = useState<boolean>(initialAutoStopEnabled);
  const [silenceThresholdMs, setSilenceThresholdMs] = useState<number>(
    vadConfig?.silenceThresholdMs || DEFAULT_VAD_CONFIG.silenceThresholdMs
  );
  const [lastRecordingMetrics, setLastRecordingMetrics] = useState<VoiceRecordingMetrics | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mimeTypeRef = useRef<string>('audio/webm');
  const vadRef = useRef<VoiceActivityDetector | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const stopTriggerTimeRef = useRef<number>(0);
  const pendingVadMetricsRef = useRef<VoiceRecordingMetrics | null>(null);

  // Check browser API compatibility and security context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const diag = getMicrophoneDiagnostics();
      setDiagnostics(diag);
      setIsSecureContext(diag.isSecureContext);

      // Case 1: Insecure HTTP context on a LAN address (e.g. http://11.12.18.229:3000)
      if (!diag.isSecureContext) {
        setIsSupported(false);
        setPermissionState('insecure-context');
        setErrorMessage(
          'Microphone access requires a secure HTTPS connection when accessing over the local network (e.g., https://<IP>:3000/voice).'
        );
        return;
      }

      // Case 2: Secure context but missing genuine browser APIs
      if (!diag.hasGetUserMedia || !diag.hasMediaRecorder) {
        setIsSupported(false);
        setPermissionState('unsupported');
        setErrorMessage(
          'Your browser does not support audio recording APIs (MediaRecorder / getUserMedia). Please use Chrome, Safari, or Firefox.'
        );
        return;
      }

      // Case 3: Fully supported secure context
      setIsSupported(true);
      mimeTypeRef.current = diag.supportedMimeType || 'audio/webm';
    }
  }, []);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (vadRef.current) vadRef.current.cleanup();
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  /**
   * Request microphone permission and acquire audio stream.
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window !== 'undefined') {
      const diag = getMicrophoneDiagnostics();
      setDiagnostics(diag);

      if (!diag.isSecureContext) {
        setPermissionState('insecure-context');
        setErrorMessage(
          'Microphone access requires a secure HTTPS connection when accessing over the local network.'
        );
        return false;
      }

      if (!diag.hasGetUserMedia || !diag.hasMediaRecorder) {
        setPermissionState('unsupported');
        setErrorMessage(
          'Your browser does not support audio recording APIs. Please use Chrome, Safari, or Firefox.'
        );
        return false;
      }
    }

    try {
      setErrorMessage(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      setPermissionState('granted');
      return true;
    } catch (err: any) {
      const errName = err?.name || '';

      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setPermissionState('denied');
        setErrorMessage('Microphone permission was denied. Please allow microphone access in your browser settings.');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setPermissionState('unsupported');
        setErrorMessage('No microphone was detected on this device.');
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setPermissionState('denied');
        setErrorMessage('Microphone is currently in use by another application or unavailable.');
      } else {
        setPermissionState('denied');
        setErrorMessage(err?.message || 'Unable to access microphone.');
      }

      onError?.(err);
      return false;
    }
  }, [onError]);

  /**
   * Forward reference to stopRecording for auto-stop callback.
   */
  const stopRecordingRef = useRef<() => void>(() => {});

  /**
   * Stop recording audio turn.
   */
  const stopRecording = useCallback((): void => {
    stopTriggerTimeRef.current = performance.now();

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    // Stop VAD analysis loop and snapshot metrics
    if (vadRef.current) {
      pendingVadMetricsRef.current = vadRef.current.stop();
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    setIsRecording(false);
    setVolumeLevel(0);
  }, []);

  stopRecordingRef.current = stopRecording;

  /**
   * Start recording audio turn with VAD and auto-stop monitoring.
   */
  const startRecording = useCallback(async (): Promise<boolean> => {
    setErrorMessage(null);
    setSpeechDetected(false);
    setAutoStopTriggered(false);
    setVolumeLevel(0);

    // Acquire or verify stream
    if (!mediaStreamRef.current || !mediaStreamRef.current.active) {
      const granted = await requestPermission();
      if (!granted || !mediaStreamRef.current) return false;
    }

    try {
      audioChunksRef.current = [];
      const selectedMime = getSupportedMimeType() || 'audio/webm';
      mimeTypeRef.current = selectedMime;

      const recorderOptions: MediaRecorderOptions = selectedMime ? { mimeType: selectedMime } : {};
      const recorder = new MediaRecorder(mediaStreamRef.current, recorderOptions);

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalMime = mimeTypeRef.current || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: finalMime });
        const durationMs = Number((performance.now() - recordingStartTimeRef.current).toFixed(1));
        const vadMetrics = pendingVadMetricsRef.current;
        const uploadDispatchMs = Number((performance.now() - stopTriggerTimeRef.current).toFixed(2));

        const hasSpoken = vadMetrics?.speechDetected ?? speechDetected;

        // -------------------------------------------------------------
        // PRE-UPLOAD AUDIO QUALITY VALIDATION
        // -------------------------------------------------------------
        // 1. Accidental short tap (< 300 ms)
        if (durationMs < (vadConfig?.minRecordingDurationMs || DEFAULT_VAD_CONFIG.minRecordingDurationMs)) {
          setErrorMessage('Recording was too short. Please tap to speak and hold.');
          return;
        }

        // 2. Empty audio blob (< 500 bytes)
        if (audioBlob.size < (vadConfig?.minBlobSizeBytes || DEFAULT_VAD_CONFIG.minBlobSizeBytes)) {
          setErrorMessage('Audio was not recorded properly. Please try speaking again.');
          return;
        }

        // 3. Complete silence (1+ seconds without any speech activity)
        if (!hasSpoken && durationMs >= 1000) {
          setErrorMessage("I couldn't hear anything. Please try speaking again.");
          return;
        }

        // -------------------------------------------------------------
        // VALID AUDIO TURN DISPATCH
        // -------------------------------------------------------------
        const finalMetrics: VoiceRecordingMetrics = {
          recordingDurationMs: durationMs,
          audioBlobSizeBytes: audioBlob.size,
          speechDetected: hasSpoken,
          speechActivityDurationMs: vadMetrics?.speechActivityDurationMs || (hasSpoken ? durationMs : 0),
          trailingSilenceMs: vadMetrics?.trailingSilenceMs || 0,
          uploadDispatchMs,
          autoStopTriggered: vadMetrics?.autoStopTriggered || false,
          vadOverheadMs: vadMetrics?.vadOverheadMs || 0.02,
        };

        setLastRecordingMetrics(finalMetrics);

        if (onAudioReady) {
          onAudioReady(audioBlob, finalMime, finalMetrics);
        }
      };

      // Initialize and start Voice Activity Detector
      vadRef.current = new VoiceActivityDetector(
        {
          onVolumeChange: (vol) => setVolumeLevel(vol),
          onSpeechStart: () => setSpeechDetected(true),
          onAutoStop: (metrics) => {
            setAutoStopTriggered(true);
            pendingVadMetricsRef.current = metrics;
            stopRecordingRef.current();
          },
        },
        {
          ...DEFAULT_VAD_CONFIG,
          ...vadConfig,
          autoStopEnabled,
          silenceThresholdMs,
        }
      );
      vadRef.current.start(mediaStreamRef.current);

      recordingStartTimeRef.current = performance.now();
      recorder.start(100); // 100ms timeslices for fast blob creation
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDurationSec(0);

      // Start duration display timer
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setRecordingDurationSec((prev) => prev + 1);
      }, 1000);

      return true;
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start audio recording.');
      setIsRecording(false);
      onError?.(err);
      return false;
    }
  }, [requestPermission, onAudioReady, onError, vadConfig, autoStopEnabled, silenceThresholdMs, speechDetected]);

  /**
   * Stop all media tracks and release microphone.
   */
  const releaseMicrophone = useCallback((): void => {
    stopRecording();
    if (vadRef.current) {
      vadRef.current.cleanup();
      vadRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setRecordingDurationSec(0);
    setVolumeLevel(0);
  }, [stopRecording]);

  return {
    isRecording,
    recordingDurationSec,
    permissionState,
    isSupported,
    isSecureContext,
    errorMessage,
    diagnostics,
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
  };
}
