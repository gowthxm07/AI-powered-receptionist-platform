export type VoiceSessionStatus =
  | 'CREATED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'ENDED_BY_USER'
  | 'ERROR'
  | 'EXPIRED';

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

export interface VoiceSessionRecord {
  id: string;
  transportSessionId: string;
  conversationSessionId: string;
  customerId: string | null;
  customerName: string | null;
  channel: string;
  status: VoiceSessionStatus;
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

export interface ActiveVoiceSession {
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

export interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
