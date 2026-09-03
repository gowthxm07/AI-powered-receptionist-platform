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

export interface VoiceTurnMetrics {
  transportOverheadMs: number;
  audioValidationMs: number;
  sttMs: number;
  conversationMs: number;
  ttsMs: number;
  totalMs: number;
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
