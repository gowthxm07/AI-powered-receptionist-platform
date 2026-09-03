export interface SpeechToTextOptions {
  language?: string;
  threads?: number;
  timeoutMs?: number;
}

export interface SpeechToTextResult {
  success: boolean;
  transcript: string;
  latencyMs: number;
  audioDurationSec?: number;
  error?: {
    code: string;
    message: string;
  };
}

export interface SpeechToTextProvider {
  readonly name: string;
  transcribe(audioFilePath: string, options?: SpeechToTextOptions): Promise<SpeechToTextResult>;
}

export interface TextToSpeechOptions {
  voiceModel?: string;
  timeoutMs?: number;
  outputFileName?: string;
}

export interface TextToSpeechResult {
  success: boolean;
  audioId: string;
  audioPath: string;
  audioFileName: string;
  latencyMs: number;
  durationSec?: number;
  charCount: number;
  error?: {
    code: string;
    message: string;
  };
}

export interface TextToSpeechProvider {
  readonly name: string;
  synthesize(text: string, options?: TextToSpeechOptions): Promise<TextToSpeechResult>;
}

export interface VoiceStageMetrics {
  audioInputProcessingMs: number;
  audioConversionMs?: number;
  sttLatencyMs: number;
  conversationLatencyMs: number;
  responseOptimizationMs?: number;
  ttsLatencyMs: number;
  totalPipelineLatencyMs: number;
}

export interface SpeechPipelineMetrics extends VoiceStageMetrics {
  audioConversionMs?: number;
  sttMs: number;
  conversationMs: number;
  responseOptimizationMs?: number;
  ttsMs: number;
  totalMs: number;
}

export interface VoiceOrchestrationOptions {
  enableConciseVoiceFormatting?: boolean;
  synthesizeSpeech?: boolean;
  sttTimeoutMs?: number;
  ttsTimeoutMs?: number;
}

export interface SpeechPipelineInput {
  audioFilePath: string;
  businessId: string;
  sessionId?: string;
  customerId?: string;
  channel?: 'WEB' | 'VOICE' | 'PHONE';
  metadata?: Record<string, any>;
  options?: VoiceOrchestrationOptions;
}

export interface SpeechPipelineAudioResponse {
  id: string;
  fileName: string;
  durationSec?: number;
}

export interface SpeechPipelineResult {
  success: boolean;
  sessionId: string;
  transcript: string;
  response: string;
  source: 'deterministic' | 'tool' | 'llm' | 'fallback';
  action?: string;
  intent?: string;
  audio: SpeechPipelineAudioResponse | null;
  metrics: SpeechPipelineMetrics;
  metadata?: {
    conversationStep?: string;
    serviceName?: string | null;
    staffName?: string | null;
    date?: string | null;
    time?: string | null;
    [key: string]: any;
  };
  error?: {
    code: string;
    message: string;
  };
}
