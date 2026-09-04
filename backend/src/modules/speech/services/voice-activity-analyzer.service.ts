export interface VoiceActivityConfig {
  /** Root Mean Square threshold distinguishing speech from ambient noise (0.0 to 1.0) */
  speechThresholdRms: number;
  /** Minimum sustained speech duration in ms required to confirm speech */
  minSpeechDurationMs: number;
  /** Sustained silence duration in ms after confirmed speech before auto-stopping */
  silenceThresholdMs: number;
  /** Minimum duration in ms of a valid recording */
  minRecordingDurationMs: number;
  /** Minimum byte size of a valid recording payload */
  minBlobSizeBytes: number;
  /** Whether auto-stop on sustained silence is enabled */
  autoStopEnabled: boolean;
}

export const DEFAULT_VAD_CONFIG: VoiceActivityConfig = {
  speechThresholdRms: 0.040,      // Baseline ambient room noise ~0.01-0.03; speech ~0.08-0.35
  minSpeechDurationMs: 300,       // Requires 300ms of sustained speech energy
  silenceThresholdMs: 1500,       // 1.5 seconds of sustained post-speech silence
  minRecordingDurationMs: 300,    // Recordings < 300ms are accidental taps
  minBlobSizeBytes: 500,          // Valid WebM/WAV header + frame requires > 500 bytes
  autoStopEnabled: true,          // Active by default for optimal perceived latency
};

export interface VoiceActivityState {
  speechDetected: boolean;
  speechStartTime: number | null;
  speechActivityDurationMs: number;
  consecutiveSpeechFrames: number;
  silenceStartTime: number | null;
  trailingSilenceMs: number;
  lastAnalysisTimestamp: number;
}

export interface VoiceActivityStateTransition {
  isSpeakingNow: boolean;
  speechDetected: boolean;
  speechActivityDurationMs: number;
  trailingSilenceMs: number;
  shouldAutoStop: boolean;
  autoStopReason?: 'SUSTAINED_SILENCE' | 'MAX_DURATION';
  updatedState: VoiceActivityState;
}

export interface AudioRecordingValidationInput {
  durationMs: number;
  sizeBytes: number;
  speechDetected: boolean;
  mimeType?: string;
  config?: Partial<VoiceActivityConfig>;
}

export interface AudioRecordingValidationResult {
  isValid: boolean;
  code?: 'TOO_SHORT' | 'EMPTY_AUDIO' | 'NO_SPEECH_DETECTED' | 'INVALID_MIME';
  userMessage?: string;
}

export class VoiceActivityAnalyzerService {
  /**
   * Calculate normalized Root Mean Square (RMS) from 8-bit Web Audio API time-domain data.
   * In Web Audio API, byte time-domain samples range from 0 to 255 with 128 as the silence center.
   * Target execution time: < 0.05 ms for a 256/512 byte buffer.
   */
  public calculateRmsFromTimeDomain(samples: Uint8Array | number[]): number {
    const len = samples.length;
    if (len === 0) return 0;

    let sumSquares = 0;
    for (let i = 0; i < len; i++) {
      const normalized = (samples[i] - 128) / 128; // Normalize to -1.0 .. +1.0
      sumSquares += normalized * normalized;
    }

    return Math.sqrt(sumSquares / len);
  }

  /**
   * Calculate normalized RMS from linear 16-bit PCM audio samples (Node.js Buffer or Int16Array).
   */
  public calculateRmsFromPcm16(samples: Int16Array | Buffer): number {
    let count: number;
    let sumSquares = 0;

    if (Buffer.isBuffer(samples)) {
      count = Math.floor(samples.length / 2);
      if (count === 0) return 0;
      for (let i = 0; i < count; i++) {
        const sample = samples.readInt16LE(i * 2);
        const normalized = sample / 32768.0;
        sumSquares += normalized * normalized;
      }
    } else {
      count = samples.length;
      if (count === 0) return 0;
      for (let i = 0; i < count; i++) {
        const normalized = samples[i] / 32768.0;
        sumSquares += normalized * normalized;
      }
    }

    return Math.sqrt(sumSquares / count);
  }

  /**
   * Initialize a fresh VoiceActivityState.
   */
  public createInitialState(timestamp: number = Date.now()): VoiceActivityState {
    return {
      speechDetected: false,
      speechStartTime: null,
      speechActivityDurationMs: 0,
      consecutiveSpeechFrames: 0,
      silenceStartTime: null,
      trailingSilenceMs: 0,
      lastAnalysisTimestamp: timestamp,
    };
  }

  /**
   * Deterministic state transition function.
   * Evaluates current audio amplitude against VAD configuration and returns the updated state
   * and auto-stop decision without side effects.
   */
  public evaluateSpeechState(
    currentRms: number,
    state: VoiceActivityState,
    configPartial?: Partial<VoiceActivityConfig>,
    currentTimestamp: number = Date.now()
  ): VoiceActivityStateTransition {
    const config = { ...DEFAULT_VAD_CONFIG, ...configPartial };
    const timeDelta = Math.max(0, currentTimestamp - state.lastAnalysisTimestamp);
    const isSpeakingNow = currentRms >= config.speechThresholdRms;

    let speechDetected = state.speechDetected;
    let speechStartTime = state.speechStartTime;
    let speechActivityDurationMs = state.speechActivityDurationMs;
    let consecutiveSpeechFrames = state.consecutiveSpeechFrames;
    let silenceStartTime = state.silenceStartTime;
    let trailingSilenceMs = state.trailingSilenceMs;
    let shouldAutoStop = false;
    let autoStopReason: 'SUSTAINED_SILENCE' | 'MAX_DURATION' | undefined = undefined;

    if (isSpeakingNow) {
      consecutiveSpeechFrames++;
      // Reset trailing silence immediately when user speaks (handles conversational micro-pauses)
      silenceStartTime = null;
      trailingSilenceMs = 0;

      // Confirm speech once minimum consecutive frames or duration is reached (~150ms-300ms)
      const estimatedSpeechDuration = consecutiveSpeechFrames * Math.max(timeDelta, 50);
      if (estimatedSpeechDuration >= config.minSpeechDurationMs) {
        speechDetected = true;
        if (speechStartTime === null) {
          speechStartTime = currentTimestamp - estimatedSpeechDuration;
        }
      }

      if (speechStartTime !== null) {
        speechActivityDurationMs = Math.max(speechActivityDurationMs, currentTimestamp - speechStartTime);
      }
    } else {
      consecutiveSpeechFrames = 0;

      // If speech was already confirmed, begin tracking sustained trailing silence
      if (speechDetected) {
        if (silenceStartTime === null) {
          silenceStartTime = currentTimestamp;
        }
        trailingSilenceMs = Math.max(0, currentTimestamp - silenceStartTime);

        // Evaluate auto-stop on sustained silence
        if (config.autoStopEnabled && trailingSilenceMs >= config.silenceThresholdMs) {
          shouldAutoStop = true;
          autoStopReason = 'SUSTAINED_SILENCE';
        }
      }
    }

    const updatedState: VoiceActivityState = {
      speechDetected,
      speechStartTime,
      speechActivityDurationMs,
      consecutiveSpeechFrames,
      silenceStartTime,
      trailingSilenceMs,
      lastAnalysisTimestamp: currentTimestamp,
    };

    return {
      isSpeakingNow,
      speechDetected,
      speechActivityDurationMs,
      trailingSilenceMs,
      shouldAutoStop,
      autoStopReason,
      updatedState,
    };
  }

  /**
   * Pre-upload audio recording validation.
   * Rejects empty audio, accidental taps, and silence-only recordings with user-friendly notices.
   */
  public validateAudioRecording(input: AudioRecordingValidationInput): AudioRecordingValidationResult {
    const config = { ...DEFAULT_VAD_CONFIG, ...input.config };

    // 1. Duration check (< 300 ms is an accidental tap)
    if (input.durationMs < config.minRecordingDurationMs) {
      return {
        isValid: false,
        code: 'TOO_SHORT',
        userMessage: 'Recording was too short. Please tap to speak and hold.',
      };
    }

    // 2. Blob size check (< 500 bytes indicates no audio stream frames)
    if (input.sizeBytes < config.minBlobSizeBytes) {
      return {
        isValid: false,
        code: 'EMPTY_AUDIO',
        userMessage: 'Audio was not recorded. Please try again.',
      };
    }

    // 3. Speech activity check (if recorded for >= 1s with zero speech detected)
    if (!input.speechDetected && input.durationMs >= 1000) {
      return {
        isValid: false,
        code: 'NO_SPEECH_DETECTED',
        userMessage: "I couldn't hear anything. Please try speaking again.",
      };
    }

    // 4. MIME type check if supplied
    if (input.mimeType && !input.mimeType.startsWith('audio/')) {
      return {
        isValid: false,
        code: 'INVALID_MIME',
        userMessage: 'Unsupported audio format recorded.',
      };
    }

    return { isValid: true };
  }
}

export const voiceActivityAnalyzerService = new VoiceActivityAnalyzerService();
