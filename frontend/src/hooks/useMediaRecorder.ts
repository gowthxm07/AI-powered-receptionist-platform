import { useState, useRef, useCallback, useEffect } from 'react';
import { MicrophonePermissionState } from '../types/voice';

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

export interface UseMediaRecorderOptions {
  onAudioReady?: (blob: Blob, mimeType: string) => void;
  onError?: (err: Error) => void;
}

export function useMediaRecorder(options: UseMediaRecorderOptions = {}) {
  const { onAudioReady, onError } = options;

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDurationSec, setRecordingDurationSec] = useState<number>(0);
  const [permissionState, setPermissionState] = useState<MicrophonePermissionState>('prompt');
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mimeTypeRef = useRef<string>('audio/webm');

  // Check browser API compatibility
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
      if (!hasMediaDevices || !hasMediaRecorder) {
        setIsSupported(false);
        setPermissionState('unsupported');
        setErrorMessage('Your browser does not support audio recording. Please use Chrome, Safari, or Firefox.');
      } else {
        mimeTypeRef.current = getSupportedMimeType() || 'audio/webm';
      }
    }
  }, []);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  /**
   * Request microphone permission and acquire audio stream.
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setErrorMessage('Audio recording is not supported in this browser.');
      return false;
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
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        setErrorMessage('Microphone access was denied. Please allow microphone permission in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionState('unsupported');
        setErrorMessage('No microphone device found on this system.');
      } else {
        setPermissionState('denied');
        setErrorMessage(err.message || 'Unable to access microphone.');
      }
      onError?.(err);
      return false;
    }
  }, [isSupported, onError]);

  /**
   * Start recording audio turn.
   */
  const startRecording = useCallback(async (): Promise<boolean> => {
    setErrorMessage(null);

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
        if (onAudioReady && audioBlob.size > 0) {
          onAudioReady(audioBlob, finalMime);
        }
      };

      recorder.start(100); // 100ms timeslice
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDurationSec(0);

      // Start duration timer
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
  }, [requestPermission, onAudioReady, onError]);

  /**
   * Stop recording audio turn.
   */
  const stopRecording = useCallback((): void => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    setIsRecording(false);
  }, []);

  /**
   * Stop all media tracks and release microphone.
   */
  const releaseMicrophone = useCallback((): void => {
    stopRecording();
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setRecordingDurationSec(0);
  }, [stopRecording]);

  return {
    isRecording,
    recordingDurationSec,
    permissionState,
    isSupported,
    errorMessage,
    requestPermission,
    startRecording,
    stopRecording,
    releaseMicrophone,
  };
}
