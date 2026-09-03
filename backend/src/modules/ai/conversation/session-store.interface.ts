import { ConversationSessionData } from './conversation-session.types';

export interface IConversationSessionStore {
  /**
   * Retrieves an active session by sessionId.
   * Returns null if session does not exist or has expired.
   */
  getSession(sessionId: string): Promise<ConversationSessionData | null>;

  /**
   * Saves or overwrites a conversation session.
   */
  setSession(session: ConversationSessionData): Promise<void>;

  /**
   * Updates an existing session by merging patch fields.
   * Automatically updates updatedAt and recalculates expiration.
   */
  updateSession(
    sessionId: string,
    patch: Partial<Omit<ConversationSessionData, 'sessionId' | 'createdAt'>>
  ): Promise<ConversationSessionData | null>;

  /**
   * Deletes or removes a session.
   */
  deleteSession(sessionId: string): Promise<boolean>;

  /**
   * Removes all sessions that have passed their expiresAt timestamp.
   * Returns the count of removed sessions.
   */
  clearExpiredSessions(): Promise<number>;

  /**
   * Returns total active session count (for telemetry / debugging).
   */
  size(): Promise<number>;
}
