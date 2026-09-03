import {
  ConversationSessionData,
} from './conversation-session.types';
import { IConversationSessionStore } from './session-store.interface';

export const DEFAULT_SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes

export class InMemorySessionStore implements IConversationSessionStore {
  private sessions = new Map<string, ConversationSessionData>();
  private readonly defaultTtlMs: number;

  constructor(defaultTtlMs: number = DEFAULT_SESSION_TTL_MS) {
    this.defaultTtlMs = defaultTtlMs;
  }

  public async getSession(sessionId: string): Promise<ConversationSessionData | null> {
    if (!sessionId) return null;
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    // Check expiration lazily
    const now = new Date();
    if (session.expiresAt && now > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  public async setSession(session: ConversationSessionData): Promise<void> {
    const now = new Date();
    const expiresAt = session.expiresAt || new Date(now.getTime() + this.defaultTtlMs);

    this.sessions.set(session.sessionId, {
      ...session,
      updatedAt: now,
      expiresAt,
    });
  }

  public async updateSession(
    sessionId: string,
    patch: Partial<Omit<ConversationSessionData, 'sessionId' | 'createdAt'>>
  ): Promise<ConversationSessionData | null> {
    const existing = await this.getSession(sessionId);
    if (!existing) return null;

    const now = new Date();
    const updated: ConversationSessionData = {
      ...existing,
      ...patch,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + this.defaultTtlMs),
    };

    this.sessions.set(sessionId, updated);
    return updated;
  }

  public async deleteSession(sessionId: string): Promise<boolean> {
    return this.sessions.delete(sessionId);
  }

  public async clearExpiredSessions(): Promise<number> {
    const now = new Date();
    let removed = 0;
    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt && now > session.expiresAt) {
        this.sessions.delete(id);
        removed++;
      }
    }
    return removed;
  }

  public async size(): Promise<number> {
    await this.clearExpiredSessions();
    return this.sessions.size;
  }

  /**
   * For testing purposes only: clears all sessions immediately.
   */
  public clear(): void {
    this.sessions.clear();
  }
}

// Export global singleton instance
export const sessionStore = new InMemorySessionStore();
