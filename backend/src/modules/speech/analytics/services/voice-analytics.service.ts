import { prisma } from '../../../../lib/prisma';
import {
  CreateVoiceSessionAnalyticsInput,
  RecordVoiceTurnAnalyticsInput,
  VoiceAnalyticsSummary,
  VoiceSessionHistoryItem,
  VoiceSessionStatusType,
} from '../types/voice-analytics.types';

export class VoiceAnalyticsService {
  /**
   * Record a new voice session in the database upon creation.
   */
  public async createSession(input: CreateVoiceSessionAnalyticsInput): Promise<any> {
    try {
      const now = input.startedAt || new Date();
      return await prisma.voiceSessionAnalytics.create({
        data: {
          businessId: input.businessId,
          transportSessionId: input.transportSessionId,
          conversationSessionId: input.conversationSessionId,
          customerId: input.customerId || null,
          channel: input.channel || 'MOBILE_WEB',
          status: 'CREATED',
          startedAt: now,
        },
      });
    } catch (err) {
      console.error(`[Voice Analytics] Failed to create session analytics record:`, err);
      return null;
    }
  }

  /**
   * Record turn progression, transcription outcome, latencies, and appointment conversions.
   */
  public async recordTurn(input: RecordVoiceTurnAnalyticsInput): Promise<any> {
    try {
      const existing = await prisma.voiceSessionAnalytics.findUnique({
        where: { transportSessionId: input.transportSessionId },
      });

      if (!existing) {
        return null;
      }

      const prevTurns = existing.turnCount;
      const newTurns = prevTurns + 1;

      // Calculate running average latencies
      const calcAvg = (prevAvg: number | null, newVal: number) => {
        if (prevAvg === null || prevTurns === 0) return Number(newVal.toFixed(2));
        return Number(((prevAvg * prevTurns + newVal) / newTurns).toFixed(2));
      };

      const newAvgStt = calcAvg(existing.averageSttLatencyMs, input.sttLatencyMs);
      const newAvgConv = calcAvg(existing.averageConversationLatencyMs, input.conversationLatencyMs);
      const newAvgTts = calcAvg(existing.averageTtsLatencyMs, input.ttsLatencyMs);
      const newTotal = calcAvg(existing.totalLatencyMs, input.totalLatencyMs);

      return await prisma.voiceSessionAnalytics.update({
        where: { transportSessionId: input.transportSessionId },
        data: {
          turnCount: newTurns,
          status: 'ACTIVE',
          successfulTranscriptionCount: input.sttSuccess
            ? existing.successfulTranscriptionCount + 1
            : existing.successfulTranscriptionCount,
          failedTranscriptionCount: !input.sttSuccess
            ? existing.failedTranscriptionCount + 1
            : existing.failedTranscriptionCount,
          appointmentBooked: input.appointmentBooked || existing.appointmentBooked || Boolean(input.appointmentId),
          appointmentId: input.appointmentId || existing.appointmentId,
          averageSttLatencyMs: newAvgStt,
          averageConversationLatencyMs: newAvgConv,
          averageTtsLatencyMs: newAvgTts,
          totalLatencyMs: newTotal,
        },
      });
    } catch (err) {
      console.error(`[Voice Analytics] Failed to record turn analytics:`, err);
      return null;
    }
  }

  /**
   * Mark a session as completed or ended by user, computing duration.
   */
  public async completeSession(
    transportSessionId: string,
    status: VoiceSessionStatusType = 'COMPLETED'
  ): Promise<any> {
    try {
      const existing = await prisma.voiceSessionAnalytics.findUnique({
        where: { transportSessionId },
      });

      if (!existing) return null;

      const endedAt = new Date();
      const durationMs = Math.max(0, endedAt.getTime() - existing.startedAt.getTime());

      // If an appointment was booked, default outcome is COMPLETED even if user clicked end
      const finalStatus: VoiceSessionStatusType =
        existing.appointmentBooked ? 'COMPLETED' : status;

      return await prisma.voiceSessionAnalytics.update({
        where: { transportSessionId },
        data: {
          status: finalStatus,
          endedAt,
          durationMs,
        },
      });
    } catch (err) {
      console.error(`[Voice Analytics] Failed to complete session analytics:`, err);
      return null;
    }
  }

  /**
   * Mark a session as failed with ERROR status.
   */
  public async failSession(
    transportSessionId: string,
    _errorMessage?: string
  ): Promise<any> {
    try {
      const existing = await prisma.voiceSessionAnalytics.findUnique({
        where: { transportSessionId },
      });

      if (!existing) return null;

      const endedAt = new Date();
      const durationMs = Math.max(0, endedAt.getTime() - existing.startedAt.getTime());

      return await prisma.voiceSessionAnalytics.update({
        where: { transportSessionId },
        data: {
          status: 'ERROR',
          endedAt,
          durationMs,
        },
      });
    } catch (err) {
      console.error(`[Voice Analytics] Failed to fail session analytics:`, err);
      return null;
    }
  }

  /**
   * Compute aggregate business-level analytics metrics.
   */
  public async getBusinessVoiceAnalytics(businessId: string): Promise<VoiceAnalyticsSummary> {
    const sessions = await prisma.voiceSessionAnalytics.findMany({
      where: { businessId },
      select: {
        status: true,
        durationMs: true,
        turnCount: true,
        appointmentBooked: true,
        averageSttLatencyMs: true,
        averageConversationLatencyMs: true,
        averageTtsLatencyMs: true,
      },
    });

    const totalVoiceSessions = sessions.length;
    let completedSessions = 0;
    let activeSessions = 0;
    let errorSessions = 0;
    let totalVoiceTurns = 0;
    let appointmentsBooked = 0;

    let sumDurationMs = 0;
    let countDuration = 0;

    let sumStt = 0;
    let countStt = 0;
    let sumConv = 0;
    let countConv = 0;
    let sumTts = 0;
    let countTts = 0;

    for (const s of sessions) {
      totalVoiceTurns += s.turnCount;

      if (s.appointmentBooked) {
        appointmentsBooked += 1;
      }

      if (s.status === 'COMPLETED' || s.status === 'ENDED_BY_USER') {
        completedSessions += 1;
      } else if (s.status === 'ACTIVE' || s.status === 'CREATED') {
        activeSessions += 1;
      } else if (s.status === 'ERROR') {
        errorSessions += 1;
      }

      if (s.durationMs !== null && s.durationMs !== undefined) {
        sumDurationMs += s.durationMs;
        countDuration += 1;
      }

      if (s.averageSttLatencyMs !== null) {
        sumStt += s.averageSttLatencyMs;
        countStt += 1;
      }
      if (s.averageConversationLatencyMs !== null) {
        sumConv += s.averageConversationLatencyMs;
        countConv += 1;
      }
      if (s.averageTtsLatencyMs !== null) {
        sumTts += s.averageTtsLatencyMs;
        countTts += 1;
      }
    }

    // Formula per Phase 7.4.2 specifications:
    // (Appointments Booked / Completed Voice Sessions) * 100
    // If no completed sessions, conversion rate is 0.0%
    const bookingConversionRate =
      completedSessions > 0
        ? Number(((appointmentsBooked / completedSessions) * 100).toFixed(1))
        : 0.0;

    const averageSessionDurationMs =
      countDuration > 0 ? Math.round(sumDurationMs / countDuration) : 0;

    const averageTurnsPerSession =
      totalVoiceSessions > 0
        ? Number((totalVoiceTurns / totalVoiceSessions).toFixed(1))
        : 0;

    const averageSttLatencyMs = countStt > 0 ? Number((sumStt / countStt).toFixed(1)) : 0;
    const averageConversationLatencyMs = countConv > 0 ? Number((sumConv / countConv).toFixed(1)) : 0;
    const averageTtsLatencyMs = countTts > 0 ? Number((sumTts / countTts).toFixed(1)) : 0;

    return {
      totalVoiceSessions,
      completedSessions,
      activeSessions,
      errorSessions,
      totalVoiceTurns,
      appointmentsBooked,
      bookingConversionRate,
      averageSessionDurationMs,
      averageTurnsPerSession,
      averageSttLatencyMs,
      averageConversationLatencyMs,
      averageTtsLatencyMs,
    };
  }

  /**
   * Retrieve paginated historical voice sessions for a specific business tenant.
   */
  public async getVoiceSessionHistory(
    businessId: string,
    options?: { page?: number; limit?: number; status?: VoiceSessionStatusType }
  ): Promise<{
    sessions: VoiceSessionHistoryItem[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const page = Math.max(1, options?.page || 1);
    const limit = Math.min(100, Math.max(1, options?.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { businessId };
    if (options?.status) {
      where.status = options.status;
    }

    const [total, records] = await Promise.all([
      prisma.voiceSessionAnalytics.count({ where }),
      prisma.voiceSessionAnalytics.findMany({
        where,
        include: {
          customer: { select: { name: true } },
        },
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const sessions: VoiceSessionHistoryItem[] = records.map((r) => ({
      id: r.id,
      transportSessionId: r.transportSessionId,
      conversationSessionId: r.conversationSessionId,
      customerId: r.customerId,
      customerName: r.customer?.name || null,
      channel: r.channel,
      status: r.status as VoiceSessionStatusType,
      startedAt: r.startedAt.toISOString(),
      endedAt: r.endedAt?.toISOString() || null,
      durationMs: r.durationMs,
      turnCount: r.turnCount,
      successfulTranscriptionCount: r.successfulTranscriptionCount,
      failedTranscriptionCount: r.failedTranscriptionCount,
      appointmentBooked: r.appointmentBooked,
      appointmentId: r.appointmentId,
      averageSttLatencyMs: r.averageSttLatencyMs,
      averageConversationLatencyMs: r.averageConversationLatencyMs,
      averageTtsLatencyMs: r.averageTtsLatencyMs,
      totalLatencyMs: r.totalLatencyMs,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      sessions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieve a single voice session record verifying business ownership.
   */
  public async getSessionById(
    id: string,
    businessId: string
  ): Promise<VoiceSessionHistoryItem | null> {
    const record = await prisma.voiceSessionAnalytics.findFirst({
      where: { id, businessId },
      include: {
        customer: { select: { name: true } },
      },
    });

    if (!record) return null;

    return {
      id: record.id,
      transportSessionId: record.transportSessionId,
      conversationSessionId: record.conversationSessionId,
      customerId: record.customerId,
      customerName: record.customer?.name || null,
      channel: record.channel,
      status: record.status as VoiceSessionStatusType,
      startedAt: record.startedAt.toISOString(),
      endedAt: record.endedAt?.toISOString() || null,
      durationMs: record.durationMs,
      turnCount: record.turnCount,
      successfulTranscriptionCount: record.successfulTranscriptionCount,
      failedTranscriptionCount: record.failedTranscriptionCount,
      appointmentBooked: record.appointmentBooked,
      appointmentId: record.appointmentId,
      averageSttLatencyMs: record.averageSttLatencyMs,
      averageConversationLatencyMs: record.averageConversationLatencyMs,
      averageTtsLatencyMs: record.averageTtsLatencyMs,
      totalLatencyMs: record.totalLatencyMs,
      createdAt: record.createdAt.toISOString(),
    };
  }
}

export const voiceAnalyticsService = new VoiceAnalyticsService();
