import crypto from 'crypto';
import { prisma } from '../../../lib/prisma';
import { aiReceptionistService, AIReceptionistService } from '../../ai/services/ai-receptionist.service';
import { sessionStore, InMemorySessionStore } from '../../ai/conversation/in-memory-session-store';
import { BookingConversationStep } from '../../ai/conversation/conversation-session.types';
import { WhisperCppProvider } from '../providers/whisper-cpp.provider';
import { PiperProvider } from '../providers/piper.provider';
import {
  SpeechToTextProvider,
  TextToSpeechProvider,
  SpeechPipelineInput,
  SpeechPipelineResult,
} from '../types/speech.types';

export class SpeechPipelineService {
  private sttProvider: SpeechToTextProvider;
  private ttsProvider: TextToSpeechProvider;
  private aiService: AIReceptionistService;
  private sessions: InMemorySessionStore;

  constructor(options?: {
    sttProvider?: SpeechToTextProvider;
    ttsProvider?: TextToSpeechProvider;
    aiService?: AIReceptionistService;
    sessionStore?: InMemorySessionStore;
  }) {
    this.sttProvider = options?.sttProvider || new WhisperCppProvider();
    this.ttsProvider = options?.ttsProvider || new PiperProvider();
    this.aiService = options?.aiService || aiReceptionistService;
    this.sessions = options?.sessionStore || sessionStore;
  }

  /**
   * Process a complete conversational speech turn:
   * Audio Input -> STT -> AI Conversation Engine -> Text Response -> TTS -> Audio Output
   */
  public async processVoiceTurn(input: SpeechPipelineInput): Promise<SpeechPipelineResult> {
    const pipelineStartTime = performance.now();
    const { audioFilePath, businessId, customerId, channel = 'VOICE' } = input;

    // 1. Verify business existence in PostgreSQL
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, phone: true },
    });

    if (!business) {
      const totalMs = Number((performance.now() - pipelineStartTime).toFixed(2));
      return {
        success: false,
        sessionId: input.sessionId || '',
        transcript: '',
        response: '',
        source: 'deterministic',
        audio: null,
        metrics: { sttMs: 0, conversationMs: 0, ttsMs: 0, totalMs },
        error: {
          code: 'BUSINESS_NOT_FOUND',
          message: `Business with ID '${businessId}' does not exist.`,
        },
      };
    }

    // 2. Verify customer tenant isolation if customerId is provided
    if (customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, businessId },
        select: { id: true, name: true },
      });

      if (!customer) {
        const totalMs = Number((performance.now() - pipelineStartTime).toFixed(2));
        return {
          success: false,
          sessionId: input.sessionId || '',
          transcript: '',
          response: '',
          source: 'deterministic',
          audio: null,
          metrics: { sttMs: 0, conversationMs: 0, ttsMs: 0, totalMs },
          error: {
            code: 'INVALID_CUSTOMER_BUSINESS_MISMATCH',
            message: `Customer with ID '${customerId}' does not belong to business '${businessId}'.`,
          },
        };
      }
    }

    // 3. Resolve or validate conversation session
    let sessionId: string;

    if (input.sessionId) {
      sessionId = input.sessionId;
      const existingSession = await this.sessions.getSession(sessionId);

      if (!existingSession) {
        const totalMs = Number((performance.now() - pipelineStartTime).toFixed(2));
        return {
          success: false,
          sessionId,
          transcript: '',
          response: '',
          source: 'deterministic',
          audio: null,
          metrics: { sttMs: 0, conversationMs: 0, ttsMs: 0, totalMs },
          error: {
            code: 'SESSION_EXPIRED',
            message: 'The requested conversation session has expired or does not exist.',
          },
        };
      }

      if (existingSession.businessId !== businessId) {
        const totalMs = Number((performance.now() - pipelineStartTime).toFixed(2));
        return {
          success: false,
          sessionId,
          transcript: '',
          response: '',
          source: 'deterministic',
          audio: null,
          metrics: { sttMs: 0, conversationMs: 0, ttsMs: 0, totalMs },
          error: {
            code: 'SESSION_BUSINESS_MISMATCH',
            message: 'Forbidden: The provided session does not belong to the requested business tenant.',
          },
        };
      }
    } else {
      sessionId = `sess_voice_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      const now = new Date();
      await this.sessions.setSession({
        sessionId,
        businessId,
        step: BookingConversationStep.IDLE,
        customerId: customerId || undefined,
        createdAt: now,
        updatedAt: now,
        expiresAt: new Date(now.getTime() + 15 * 60 * 1000), // 15 min TTL
      });
    }

    // 4. STEP 1: Speech-to-Text Transcription
    const sttResult = await this.sttProvider.transcribe(audioFilePath);
    const sttMs = Number(sttResult.latencyMs.toFixed(2));

    if (!sttResult.success || !sttResult.transcript || sttResult.transcript.trim().length === 0) {
      const totalMs = Number((performance.now() - pipelineStartTime).toFixed(2));
      return {
        success: false,
        sessionId,
        transcript: sttResult.transcript || '',
        response: '',
        source: 'deterministic',
        audio: null,
        metrics: { sttMs, conversationMs: 0, ttsMs: 0, totalMs },
        error: sttResult.error || {
          code: 'STT_EMPTY_TRANSCRIPTION',
          message: 'Speech recognition did not detect any intelligible speech in the audio input.',
        },
      };
    }

    // 5. STEP 2: AI Receptionist Conversation Engine
    const convStartTime = performance.now();
    const engineResult = await this.aiService.processMessage({
      message: sttResult.transcript,
      context: {
        businessId,
        sessionId,
        customerId: customerId || null,
        channel: channel || 'VOICE',
        metadata: {
          businessName: business.name,
          ...(input.metadata || {}),
        },
      },
    });
    const conversationMs = Number((performance.now() - convStartTime).toFixed(2));

    // 6. STEP 3: Text-to-Speech Synthesis
    let ttsMs = 0;
    let audioResponse = null;

    if (engineResult.response && engineResult.response.trim().length > 0) {
      const ttsResult = await this.ttsProvider.synthesize(engineResult.response);
      ttsMs = Number(ttsResult.latencyMs.toFixed(2));

      if (ttsResult.success) {
        audioResponse = {
          id: ttsResult.audioId,
          fileName: ttsResult.audioFileName,
          durationSec: ttsResult.durationSec,
        };
      }
    }

    const totalMs = Number((performance.now() - pipelineStartTime).toFixed(2));
    const updatedSession = await this.sessions.getSession(sessionId);

    // 7. Safe Structured Performance Logging
    console.log(
      `[Voice Pipeline] sessionId=${sessionId} businessId=${businessId} source=${engineResult.source} sttMs=${sttMs}ms convMs=${conversationMs}ms ttsMs=${ttsMs}ms totalMs=${totalMs}ms`
    );

    return {
      success: engineResult.success,
      sessionId,
      transcript: sttResult.transcript,
      response: engineResult.response,
      source: engineResult.source || 'deterministic',
      action: engineResult.action,
      intent: engineResult.intent,
      audio: audioResponse,
      metrics: {
        sttMs,
        conversationMs,
        ttsMs,
        totalMs,
      },
      metadata: {
        conversationStep: updatedSession?.step || 'IDLE',
        serviceName: updatedSession?.selectedServiceName || null,
        staffName: updatedSession?.selectedStaffName || null,
        date: updatedSession?.selectedDate || null,
        time: updatedSession?.availableSlots?.find((s) => s.startTime === updatedSession?.selectedStartTime)?.timeLabel || null,
      },
      error: engineResult.error || undefined,
    };
  }
}

export const speechPipelineService = new SpeechPipelineService();
