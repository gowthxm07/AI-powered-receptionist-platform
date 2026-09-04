export type VoiceUIState =
  | 'IDLE'
  | 'CONNECTING'
  | 'READY'
  | 'RECORDING'
  | 'PROCESSING'
  | 'PLAYING'
  | 'ERROR'
  | 'ENDED';

export type VoiceClientChannel = 'MOBILE_WEB' | 'WEB_VOICE' | 'DESKTOP' | 'API';

export type MicrophonePermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported' | 'insecure-context';

export interface MicrophoneDiagnostics {
  isSecureContext: boolean;
  hasMediaDevices: boolean;
  hasGetUserMedia: boolean;
  hasMediaRecorder: boolean;
  supportedMimeType: string;
  protocol: string;
  host: string;
  origin: string;
  apiBaseUrl: string;
  sessionEndpoint: string;
}

export interface VoiceTransportSession {
  transportSessionId: string;
  conversationSessionId: string;
  businessId: string;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  channel: VoiceClientChannel;
  state: string;
  turnCount: number;
  lastTurnAt?: string;
  createdAt: string;
  expiresAt: string;
}

export interface VoiceRecordingMetrics {
  recordingDurationMs: number;
  audioBlobSizeBytes: number;
  speechDetected: boolean;
  speechActivityDurationMs: number;
  trailingSilenceMs: number;
  uploadDispatchMs?: number;
  autoStopTriggered: boolean;
  vadOverheadMs?: number;
  recordingStopTimestamp?: number;
  mediaRecorderFinalizeMs?: number;
  audioBlobReadyMs?: number;
  stopTriggerTime?: number;
}

export interface VoiceActivityConfig {
  speechThresholdRms: number;
  minSpeechDurationMs: number;
  silenceThresholdMs: number;
  minRecordingDurationMs: number;
  minBlobSizeBytes: number;
  autoStopEnabled: boolean;
}

export interface VoiceStageBreakdown {
  stage1FinalizeMs: number;
  stage2UploadMs: number;
  stage3SttMs: number;
  stage4AiConvMs: number;
  stage5DbMs: number;
  stage6TtsMs: number;
  stage7DeliveryMs: number;
  stage8PlaybackMs: number;
}

export interface VoiceTurnMetrics {
  transportOverheadMs: number;
  audioValidationMs: number;
  audioConversionMs?: number;
  sttMs: number;
  whisperLatencyMs?: number;
  conversationMs: number;
  databaseToolLatencyMs?: number;
  ollamaLatencyMs?: number;
  responseOptimizationMs?: number;
  ttsMs: number;
  piperTtsLatencyMs?: number;
  responseAudioPreparationMs?: number;
  totalBackendLatencyMs?: number;
  totalMs: number;
  recordingDurationMs?: number;
  audioBlobSizeBytes?: number;
  speechDetected?: boolean;
  speechActivityDurationMs?: number;
  trailingSilenceMs?: number;
  uploadDispatchMs?: number;
  autoStopTriggered?: boolean;
  vadOverheadMs?: number;
  // Detailed client-side timing marks
  recordingStopTimestamp?: number;
  mediaRecorderFinalizeMs?: number;
  audioBlobReadyMs?: number;
  uploadNetworkMs?: number;
  audioPlaybackPrepMs?: number;
  audioPlaybackStartMs?: number;
  // Composite end-to-end latencies
  endToEndVoiceLatencyMs?: number;
  speechToTranscriptionMs?: number;
  transcriptionToResponseMs?: number;
  responseToPlaybackMs?: number;
  // Stage-by-stage 8-stage breakdown
  stageBreakdown?: VoiceStageBreakdown;
}

export interface VoiceAudioResponseRef {
  audioId: string;
  url: string;
  fileName: string;
  mimeType: string;
  durationSec?: number;
}

export interface VoiceTurnResult {
  success: boolean;
  transportSessionId: string;
  conversationSessionId: string;
  businessId: string;
  transcript: string;
  responseText: string;
  source: 'deterministic' | 'tool' | 'llm' | 'fallback';
  action?: string;
  intent?: string;
  audio: VoiceAudioResponseRef | null;
  metrics: VoiceTurnMetrics;
  metadata?: {
    conversationStep?: string;
    serviceName?: string | null;
    staffName?: string | null;
    date?: string | null;
    time?: string | null;
    customerId?: string | null;
    customerName?: string | null;
    [key: string]: any;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface VoiceDialogueTurn {
  id: string;
  speaker: 'user' | 'assistant';
  text: string;
  audioUrl?: string;
  timestamp: Date;
  source?: string;
  latencyMs?: number;
  metrics?: VoiceTurnMetrics;
}

export interface CreateVoiceSessionInput {
  businessId: string;
  customerId?: string;
  channel?: VoiceClientChannel;
}
