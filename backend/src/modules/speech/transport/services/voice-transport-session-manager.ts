import crypto from 'crypto';
import { prisma } from '../../../../lib/prisma';
import { sessionStore, InMemorySessionStore } from '../../../ai/conversation/in-memory-session-store';
import { BookingConversationStep } from '../../../ai/conversation/conversation-session.types';
import {
  IVoiceTransportSession,
  CreateTransportSessionInput,
  VoiceTransportState,
} from '../types/voice-transport.types';

export const DEFAULT_TRANSPORT_SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes

export class VoiceTransportSessionManager {
  private transportSessions = new Map<string, IVoiceTransportSession>();
  private conversationStore: InMemorySessionStore;
  private readonly defaultTtlMs: number;

  constructor(options?: {
    conversationStore?: InMemorySessionStore;
    defaultTtlMs?: number;
  }) {
    this.conversationStore = options?.conversationStore || sessionStore;
    this.defaultTtlMs = options?.defaultTtlMs || DEFAULT_TRANSPORT_SESSION_TTL_MS;
  }

  /**
   * Create a new voice transport session and bind it to an AI conversation session.
   */
  public async createTransportSession(
    input: CreateTransportSessionInput
  ): Promise<{
    success: boolean;
    session?: IVoiceTransportSession;
    error?: { code: string; message: string };
  }> {
    const { businessId, customerId, conversationSessionId, channel = 'MOBILE_WEB', clientMetadata } = input;

    // 1. Validate Business existence
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true },
    });

    if (!business) {
      return {
        success: false,
        error: {
          code: 'BUSINESS_NOT_FOUND',
          message: `Business with ID '${businessId}' does not exist.`,
        },
      };
    }

    // 2. Validate Customer tenant scoping if provided
    let customerRecord: { id: string; name: string; phone: string | null } | null = null;
    if (customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, businessId },
        select: { id: true, name: true, phone: true },
      });

      if (!customer) {
        return {
          success: false,
          error: {
            code: 'INVALID_CUSTOMER_BUSINESS_MISMATCH',
            message: `Customer with ID '${customerId}' does not belong to business '${businessId}'.`,
          },
        };
      }
      customerRecord = customer;
    }

    // 3. Resolve or create AI conversation session
    let convSessionId = conversationSessionId;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.defaultTtlMs);

    if (convSessionId) {
      const existingConv = await this.conversationStore.getSession(convSessionId);
      if (existingConv && existingConv.businessId !== businessId) {
        return {
          success: false,
          error: {
            code: 'SESSION_BUSINESS_MISMATCH',
            message: 'Forbidden: The provided conversation session does not belong to the requested business.',
          },
        };
      }
      if (!existingConv) {
        // Initialize conversation session
        await this.conversationStore.setSession({
          sessionId: convSessionId,
          businessId,
          step: BookingConversationStep.IDLE,
          customerId: customerRecord?.id,
          customerName: customerRecord?.name,
          customerPhone: customerRecord?.phone || undefined,
          createdAt: now,
          updatedAt: now,
          expiresAt,
        });
      }
    } else {
      convSessionId = `sess_voice_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      await this.conversationStore.setSession({
        sessionId: convSessionId,
        businessId,
        step: BookingConversationStep.IDLE,
        customerId: customerRecord?.id,
        customerName: customerRecord?.name,
        customerPhone: customerRecord?.phone || undefined,
        createdAt: now,
        updatedAt: now,
        expiresAt,
      });
    }

    // 4. Generate unique transport session ID
    const transportSessionId = `vtr_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

    const session: IVoiceTransportSession = {
      transportSessionId,
      conversationSessionId: convSessionId,
      businessId,
      customerId: customerRecord?.id || null,
      customerName: customerRecord?.name || null,
      customerPhone: customerRecord?.phone || null,
      channel,
      state: 'READY',
      turnCount: 0,
      clientMetadata,
      createdAt: now,
      updatedAt: now,
      expiresAt,
    };

    this.transportSessions.set(transportSessionId, session);

    return {
      success: true,
      session,
    };
  }

  /**
   * Retrieve an active voice transport session with lazy TTL expiration.
   */
  public async getTransportSession(
    transportSessionId: string
  ): Promise<IVoiceTransportSession | null> {
    if (!transportSessionId) return null;

    const session = this.transportSessions.get(transportSessionId);
    if (!session) return null;

    const now = new Date();
    if (session.expiresAt && now > session.expiresAt) {
      this.transportSessions.delete(transportSessionId);
      return null;
    }

    return session;
  }

  /**
   * Update transport session state or metadata.
   */
  public async updateTransportSession(
    transportSessionId: string,
    patch: Partial<Omit<IVoiceTransportSession, 'transportSessionId' | 'businessId' | 'createdAt'>>
  ): Promise<IVoiceTransportSession | null> {
    const session = await this.getTransportSession(transportSessionId);
    if (!session) return null;

    const now = new Date();
    const updated: IVoiceTransportSession = {
      ...session,
      ...patch,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + this.defaultTtlMs),
    };

    this.transportSessions.set(transportSessionId, updated);
    return updated;
  }

  /**
   * Increment the turn count for an active transport session.
   */
  public async recordTurn(
    transportSessionId: string,
    state: VoiceTransportState = 'READY'
  ): Promise<IVoiceTransportSession | null> {
    const session = await this.getTransportSession(transportSessionId);
    if (!session) return null;

    const now = new Date();
    const updated: IVoiceTransportSession = {
      ...session,
      turnCount: session.turnCount + 1,
      lastTurnAt: now,
      state,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + this.defaultTtlMs),
    };

    this.transportSessions.set(transportSessionId, updated);
    return updated;
  }

  /**
   * Terminate and delete an active voice transport session.
   */
  public async terminateTransportSession(
    transportSessionId: string
  ): Promise<boolean> {
    const session = this.transportSessions.get(transportSessionId);
    if (!session) return false;

    session.state = 'TERMINATED';
    this.transportSessions.delete(transportSessionId);
    return true;
  }

  /**
   * Get total count of active in-memory transport sessions.
   */
  public getActiveSessionCount(): number {
    return this.transportSessions.size;
  }

  /**
   * Clear all sessions (for testing only).
   */
  public clearAllSessions(): void {
    this.transportSessions.clear();
  }
}

export const voiceTransportSessionManager = new VoiceTransportSessionManager();
