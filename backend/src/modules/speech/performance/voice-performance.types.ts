/**
 * Voice Pipeline Performance Metric Types
 * Phase 8.1: End-to-End Voice Pipeline Performance Benchmarking
 *
 * In-memory performance metric models capturing high-resolution latency across
 * each subsystem in the voice pipeline.
 *
 * PRIVACY GUARANTEE:
 * Contains ZERO raw audio buffers, audio base64 data, or speech transcript text.
 */

export type AIExecutionSource = 'deterministic' | 'tool' | 'llm';

export interface VoiceStageLatencies {
  /** 1. Request Handling Latency: from request arrival to processing initialization */
  requestHandlingMs: number;

  /** 2. Audio Validation Latency: file existence, boundary, and MIME checks */
  audioValidationMs: number;

  /** 3. Audio Normalization Latency: FFmpeg conversion to 16kHz mono WAV (0 if already 16kHz WAV) */
  audioNormalizationMs: number;

  /** 4. Whisper STT Latency: whisper-cli execution time */
  sttMs: number;

  /** 5. AI Receptionist Latency: complete conversation engine processing */
  aiMs: number;

  /** 5a. Intent Classification Sub-Latency (optional) */
  intentClassificationMs?: number;

  /** 5b. Conversation State Machine Sub-Latency (optional) */
  conversationStateMs?: number;

  /** 5c. Tool Execution Sub-Latency (optional) */
  toolExecutionMs?: number;

  /** 5d. Local Ollama LLM Inference Sub-Latency (optional) */
  llmInferenceMs?: number;

  /** 6. Database Latency: aggregated database operations (service, staff, booking, customer) */
  databaseMs?: number;

  /** 7. Piper Neural TTS Latency: text to WAV synthesis */
  ttsMs: number;

  /** 8. Response Preparation Latency: audio registration, temp file handling, response packaging */
  responsePreparationMs: number;

  /** 9. Total Backend Pipeline Latency: composite sum without double-counting */
  totalBackendPipelineMs: number;
}

export interface VoiceOperationalMetadata {
  /** Execution source of the AI turn */
  source: AIExecutionSource;

  /** Whether speech transcription succeeded */
  sttSuccess: boolean;

  /** Whether transcription resulted in empty string or failure */
  sttEmptyOrFailed: boolean;

  /** Audio input format (e.g. 'wav', 'webm', 'ogg') */
  inputAudioFormat?: string;

  /** Number of characters in the transcribed input */
  sttCharacterCount: number;

  /** Number of characters in the spoken response text */
  responseCharacterCount: number;

  /** Synthesized audio duration in milliseconds (if available) */
  audioDurationMs?: number;

  /** Generated audio size in bytes (if available) */
  generatedAudioSizeBytes?: number;
}

export interface VoiceTurnPerformanceMetric extends VoiceStageLatencies, VoiceOperationalMetadata {
  /** Unique session identifier */
  sessionId: string;

  /** Turn index within the conversation */
  turnNumber: number;

  /** Timestamp when the turn request started */
  timestamp: number;
}

export interface ScenarioStatisticalSummary {
  scenarioName: string;
  source: AIExecutionSource;
  turnType: 'Cold' | 'Warm';
  runCount: number;

  stt: LatencyStatistics;
  ai: LatencyStatistics;
  database: LatencyStatistics;
  tts: LatencyStatistics;
  totalPipeline: LatencyStatistics;

  subLatencies?: {
    intentClassification?: LatencyStatistics;
    conversationState?: LatencyStatistics;
    toolExecution?: LatencyStatistics;
    llmInference?: LatencyStatistics;
  };
}

export interface LatencyStatistics {
  avg: number;
  min: number;
  max: number;
  median: number;
}
