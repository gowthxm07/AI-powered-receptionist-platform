export type VoiceSessionStatusType =
  | 'CREATED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'ENDED_BY_USER'
  | 'ERROR'
  | 'EXPIRED';

export interface CreateVoiceSessionAnalyticsInput {
  businessId: string;
  transportSessionId: string;
  conversationSessionId: string;
  customerId?: string | null;
  channel?: string;
  startedAt?: Date;
}

export interface RecordVoiceTurnAnalyticsInput {
  transportSessionId: string;
  sttSuccess: boolean;
  sttLatencyMs: number;
  conversationLatencyMs: number;
  ttsLatencyMs: number;
  totalLatencyMs: number;
  appointmentBooked?: boolean;
  appointmentId?: string | null;
}

export interface CompleteVoiceSessionAnalyticsInput {
  transportSessionId: string;
  status?: VoiceSessionStatusType;
  endedAt?: Date;
}

export interface VoiceAnalyticsSummary {
  totalVoiceSessions: number;
  completedSessions: number;
  activeSessions: number;
  errorSessions: number;
  totalVoiceTurns: number;
  appointmentsBooked: number;
  bookingConversionRate: number;
  averageSessionDurationMs: number;
  averageTurnsPerSession: number;
  averageSttLatencyMs: number;
  averageConversationLatencyMs: number;
  averageTtsLatencyMs: number;
}

export interface VoiceSessionHistoryItem {
  id: string;
  transportSessionId: string;
  conversationSessionId: string;
  customerId: string | null;
  customerName: string | null;
  channel: string;
  status: VoiceSessionStatusType;
  startedAt: string;
  endedAt: string | null;
  durationMs: number | null;
  turnCount: number;
  successfulTranscriptionCount: number;
  failedTranscriptionCount: number;
  appointmentBooked: boolean;
  appointmentId: string | null;
  averageSttLatencyMs: number | null;
  averageConversationLatencyMs: number | null;
  averageTtsLatencyMs: number | null;
  totalLatencyMs: number | null;
  createdAt: string;
}

export interface ActiveVoiceSessionInfo {
  transportSessionId: string;
  conversationSessionId: string;
  businessId: string;
  customerName: string | null;
  customerPhone: string | null;
  channel: string;
  state: string;
  turnCount: number;
  startedAt: string;
  lastTurnAt?: string | null;
}
