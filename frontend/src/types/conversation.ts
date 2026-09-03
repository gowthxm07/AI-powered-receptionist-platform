export interface ConversationRequestInput {
  sessionId?: string;
  businessId: string;
  message: string;
  context?: {
    customerId?: string;
    channel?: 'WEB' | 'VOICE' | 'PHONE';
    metadata?: Record<string, unknown>;
  };
}

export interface ConversationMetadata {
  conversationStep?: string;
  serviceName?: string | null;
  staffName?: string | null;
  date?: string | null;
  time?: string | null;
}

export type ResponseSource = 'deterministic' | 'tool' | 'llm' | 'fallback';

export interface ConversationResponseData {
  sessionId: string;
  response: string;
  source: ResponseSource;
  action: string;
  intent: string;
  latencyMs: number;
  totalLatencyMs: number;
  metadata: ConversationMetadata;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  source?: ResponseSource;
  latencyMs?: number;
  totalLatencyMs?: number;
  intent?: string;
  action?: string;
  metadata?: ConversationMetadata;
}
