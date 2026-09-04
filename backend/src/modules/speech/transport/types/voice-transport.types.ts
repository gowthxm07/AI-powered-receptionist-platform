export type VoiceTransportState =
  | 'INITIALIZING'
  | 'READY'
  | 'PROCESSING_TURN'
  | 'STREAMING_RESPONSE'
  | 'IDLE'
  | 'TERMINATED';

export type VoiceClientChannel = 'MOBILE_WEB' | 'WEB_VOICE' | 'DESKTOP' | 'API';

export interface IVoiceTransportSession {
  transportSessionId: string;
  conversationSessionId: string;
  businessId: string;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  channel: VoiceClientChannel;
  state: VoiceTransportState;
  turnCount: number;
  clientMetadata?: {
    userAgent?: string;
    clientIp?: string;
    deviceType?: string;
    [key: string]: any;
  };
  lastTurnAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export type VoiceSignalingType =
  | 'VOICE_SESSION_START'
  | 'VOICE_SESSION_READY'
  | 'AUDIO_TURN_START'
  | 'AUDIO_TURN_END'
  | 'VOICE_RESPONSE_READY'
  | 'VOICE_SESSION_END'
  | 'ERROR'
  | 'PING'
  | 'PONG';

export interface VoiceSignalingMessage<T = unknown> {
  type: VoiceSignalingType;
  transportSessionId?: string;
  conversationSessionId?: string;
  businessId?: string;
  payload?: T;
  timestamp: number;
}

export interface VoiceAudioTurnInput {
  transportSessionId?: string;
  conversationSessionId?: string;
  businessId: string;
  customerId?: string;
  audioFilePath?: string;
  audioBuffer?: Buffer;
  audioBase64?: string;
  mimeType?: string;
  sequenceNumber?: number;
  clientChannel?: VoiceClientChannel;
  metadata?: Record<string, any>;
}

export interface VoiceTransportMetrics {
  transportOverheadMs: number;
  audioValidationMs: number;
  audioConversionMs?: number;
  sttMs: number;
  conversationMs: number;
  responseOptimizationMs?: number;
  ttsMs: number;
  totalMs: number;
  recordingDurationMs?: number;
  audioBlobSizeBytes?: number;
  speechDetected?: boolean;
  speechActivityDurationMs?: number;
  trailingSilenceMs?: number;
  uploadDispatchMs?: number;
  autoStopTriggered?: boolean;
  vadOverheadMs?: number;
}

export interface VoiceAudioResponseRef {
  audioId: string;
  url: string;
  fileName: string;
  mimeType: string;
  durationSec?: number;
}

export interface VoiceTurnTransportResult {
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
  metrics: VoiceTransportMetrics;
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

export interface CreateTransportSessionInput {
  businessId: string;
  customerId?: string;
  conversationSessionId?: string;
  channel?: VoiceClientChannel;
  clientMetadata?: Record<string, any>;
}
