import { VoiceActivityConfig, VoiceRecordingMetrics } from '../types/voice';

export const DEFAULT_VAD_CONFIG: VoiceActivityConfig = {
  speechThresholdRms: 0.040,      // Baseline ambient room noise ~0.01-0.03; speech ~0.08-0.35
  minSpeechDurationMs: 300,       // Requires 300ms of sustained speech energy
  silenceThresholdMs: 1500,       // 1.5 seconds of sustained post-speech silence
  minRecordingDurationMs: 300,    // Recordings < 300ms are accidental taps
  minBlobSizeBytes: 500,          // Valid WebM/WAV header + frame requires > 500 bytes
  autoStopEnabled: true,          // Active by default for optimal perceived latency
};

export interface VoiceActivityDetectorCallbacks {
  onVolumeChange?: (volumePercent: number) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onAutoStop?: (metrics: VoiceRecordingMetrics) => void;
}

export class VoiceActivityDetector {
  private config: VoiceActivityConfig;
  private callbacks: VoiceActivityDetectorCallbacks;

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private animationFrameId: number | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  private recordingStartTime: number = 0;
  private speechDetected: boolean = false;
  private speechStartTime: number | null = null;
  private speechActivityDurationMs: number = 0;
  private consecutiveSpeechFrames: number = 0;
  private silenceStartTime: number | null = null;
  private trailingSilenceMs: number = 0;
  private isCurrentlySpeaking: boolean = false;
  private autoStopTriggered: boolean = false;
  private vadOverheadSumMs: number = 0;
  private vadOverheadCycles: number = 0;

  constructor(
    callbacks: VoiceActivityDetectorCallbacks = {},
    configPartial?: Partial<VoiceActivityConfig>
  ) {
    this.callbacks = callbacks;
    this.config = { ...DEFAULT_VAD_CONFIG, ...configPartial };
  }

  public updateConfig(newConfig: Partial<VoiceActivityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  public getConfig(): VoiceActivityConfig {
    return { ...this.config };
  }

  /**
   * Start voice activity analysis on an active microphone MediaStream.
   */
  public start(stream: MediaStream): boolean {
    this.cleanup();

    if (typeof window === 'undefined') return false;

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return false;

      this.audioContext = new AudioCtxClass();
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(() => {});
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256; // 128 bins, ultra-low memory & latency (< 0.05ms)
      this.analyser.smoothingTimeConstant = 0.25;

      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.sourceNode.connect(this.analyser);
      // NOTE: Do NOT connect to destination to avoid acoustic feedback echo!

      this.recordingStartTime = performance.now();
      this.speechDetected = false;
      this.speechStartTime = null;
      this.speechActivityDurationMs = 0;
      this.consecutiveSpeechFrames = 0;
      this.silenceStartTime = null;
      this.trailingSilenceMs = 0;
      this.isCurrentlySpeaking = false;
      this.autoStopTriggered = false;
      this.vadOverheadSumMs = 0;
      this.vadOverheadCycles = 0;

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Run analysis loop at ~50ms intervals
      this.intervalId = setInterval(() => {
        if (!this.analyser || this.autoStopTriggered) return;

        const cycleStart = performance.now();
        this.analyser.getByteTimeDomainData(dataArray);

        // 1. Calculate RMS Amplitude
        let sumSquares = 0;
        for (let i = 0; i < bufferLength; i++) {
          const normalized = (dataArray[i] - 128) / 128; // Normalize around 128
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / bufferLength);

        // 2. Normalized volume percentage for visual feedback (0 - 100%)
        const volumePercent = Math.min(100, Math.round((rms / 0.35) * 100));
        this.callbacks.onVolumeChange?.(volumePercent);

        const now = performance.now();
        const isSpeaking = rms >= this.config.speechThresholdRms;

        if (isSpeaking) {
          this.consecutiveSpeechFrames++;
          this.silenceStartTime = null;
          this.trailingSilenceMs = 0;

          const estimatedSpeechDuration = this.consecutiveSpeechFrames * 50;
          if (estimatedSpeechDuration >= this.config.minSpeechDurationMs) {
            if (!this.speechDetected) {
              this.speechDetected = true;
              this.speechStartTime = now - estimatedSpeechDuration;
              this.callbacks.onSpeechStart?.();
            }
          }

          if (this.speechStartTime !== null) {
            this.speechActivityDurationMs = now - this.speechStartTime;
          }

          if (!this.isCurrentlySpeaking) {
            this.isCurrentlySpeaking = true;
          }
        } else {
          this.consecutiveSpeechFrames = 0;

          if (this.isCurrentlySpeaking) {
            this.isCurrentlySpeaking = false;
            this.callbacks.onSpeechEnd?.();
          }

          if (this.speechDetected) {
            if (this.silenceStartTime === null) {
              this.silenceStartTime = now;
            }
            this.trailingSilenceMs = now - this.silenceStartTime;

            // Trigger auto-stop on sustained silence
            if (
              this.config.autoStopEnabled &&
              !this.autoStopTriggered &&
              this.trailingSilenceMs >= this.config.silenceThresholdMs
            ) {
              this.autoStopTriggered = true;
              const metrics = this.getMetrics();
              metrics.autoStopTriggered = true;
              this.callbacks.onAutoStop?.(metrics);
            }
          }
        }

        const cycleDuration = performance.now() - cycleStart;
        this.vadOverheadSumMs += cycleDuration;
        this.vadOverheadCycles++;
      }, 50);

      return true;
    } catch (err) {
      console.warn('[VAD] Failed to initialize Web Audio API analyzer:', err);
      return false;
    }
  }

  /**
   * Stop analysis and capture final telemetry metrics.
   */
  public stop(audioBlobSize: number = 0): VoiceRecordingMetrics {
    const metrics = this.getMetrics(audioBlobSize);
    this.cleanup();
    return metrics;
  }

  /**
   * Snapshot current metrics without stopping.
   */
  public getMetrics(audioBlobSize: number = 0): VoiceRecordingMetrics {
    const duration = this.recordingStartTime > 0 ? performance.now() - this.recordingStartTime : 0;
    const avgVadOverhead =
      this.vadOverheadCycles > 0
        ? Number((this.vadOverheadSumMs / this.vadOverheadCycles).toFixed(3))
        : 0.02;

    return {
      recordingDurationMs: Number(duration.toFixed(1)),
      audioBlobSizeBytes: audioBlobSize,
      speechDetected: this.speechDetected,
      speechActivityDurationMs: Number(this.speechActivityDurationMs.toFixed(1)),
      trailingSilenceMs: Number(this.trailingSilenceMs.toFixed(1)),
      autoStopTriggered: this.autoStopTriggered,
      vadOverheadMs: avgVadOverhead,
    };
  }

  public isSpeaking(): boolean {
    return this.isCurrentlySpeaking;
  }

  public hasDetectedSpeech(): boolean {
    return this.speechDetected;
  }

  /**
   * Release and cleanly disconnect all Web Audio nodes and Context.
   */
  public cleanup(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.animationFrameId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }

    if (this.analyser) {
      try {
        this.analyser.disconnect();
      } catch {}
      this.analyser = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close().catch(() => {});
      } catch {}
      this.audioContext = null;
    }
  }
}
