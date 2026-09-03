export type AIChannel = 'WEB' | 'VOICE' | 'PHONE';

export interface AIConversationContext {
  /** The tenant business ID whose context and catalog are active */
  businessId: string;
  /** Unique session / dialogue identifier */
  sessionId: string;
  /** Caller/Customer ID if already identified from phone or auth */
  customerId?: string | null;
  /** Inbound communication channel */
  channel?: AIChannel;
  /** Authenticated user/owner ID if operating in dashboard simulator */
  userId?: string;
  /** Additional dialogue metadata */
  metadata?: Record<string, unknown>;
}

export interface BuildAIContextInput {
  businessId: string;
  sessionId?: string;
  customerId?: string | null;
  channel?: AIChannel;
  userId?: string;
  metadata?: Record<string, unknown>;
}
