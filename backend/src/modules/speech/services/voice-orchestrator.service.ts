import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
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

export class VoiceConversationOrchestrator {
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
   * Optimize conversational text for natural and low-latency voice synthesis:
   * Strips markdown symbols, asterisks, bullet points, and keeps sentences concise.
   */
  public normalizeVoiceResponse(text: string): string {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // remove bold
      .replace(/\*(.*?)\*/g, '$1')     // remove italics
      .replace(/`(.*?)`/g, '$1')       // remove inline code
      .replace(/^\s*[-•*]\s+/gm, '')   // remove bullet points
      .replace(/\n+/g, ' ')           // collapse newlines to single spaces
      .replace(/\s{2,}/g, ' ')         // collapse multiple spaces
      .trim();
  }

  /**
   * Orchestrate a complete interactive voice conversation turn with stage-by-stage latency instrumentation.
   */
  public async orchestrateVoiceTurn(input: SpeechPipelineInput): Promise<SpeechPipelineResult> {
    const pipelineStartTime = performance.now();
    const { audioFilePath, businessId, customerId, channel = 'VOICE' } = input;

    // ---------------------------------------------------------
    // STAGE 1: Audio Input Validation & Tenant Resolution
    // ---------------------------------------------------------
    const inputStageStart = performance.now();

    if (!audioFilePath || audioFilePath.trim().length === 0) {
      const audioInputMs = Number((performance.now() - inputStageStart).toFixed(2));
      const totalMs = Number((performance.now() - pipelineStartTime).toFixed(2));
      return {
        success: false,
        sessionId: input.sessionId || '',
        transcript: '',
        response: '',
        source: 'deterministic',
        audio: null,
        metrics: {
          audioInputProcessingMs: audioInputMs,
          sttLatencyMs: 0,
          conversationLatencyMs: 0,
          ttsLatencyMs: 0,
          totalPipelineLatencyMs: totalMs,
          sttMs: 0,
          conversationMs: 0,
          ttsMs: 0,
          totalMs,
        },
        error: {
          code: 'INVALID_AUDIO_INPUT',
          message: 'Audio input file path is required.',
        },
      };
    }

    // Verify business existence in PostgreSQL
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, phone: true },
    });

    if (!business) {
      const audioInputMs = Number((performance.now() - inputStageStart).toFixed(2));
      const totalMs = Number((performance.now() - pipelineStartTime).toFixed(2));
      return {
        success: false,
        sessionId: input.sessionId || '',
        transcript: '',
        response: '',
        source: 'deterministic',
        audio: null,
        metrics: {
          audioInputProcessingMs: audioInputMs,
          sttLatencyMs: 0,
          conversationLatencyMs: 0,
          ttsLatencyMs: 0,
          totalPipelineLatencyMs: totalMs,
          sttMs: 0,
          conversationMs: 0,
          ttsMs: 0,
          totalMs,
        },
        error: {
          code: 'BUSINESS_NOT_FOUND',
          message: `Business with ID '${businessId}' does not exist.`,
        },
      };
    }

    // Verify customer tenant isolation and resolve customer details if customerId is provided
    let customerRecord: { id: string; name: string; phone: string | null } | null = null;
    if (customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, businessId },
        select: { id: true, name: true, phone: true },
      });

      if (!customer) {
        const audioInputMs = Number((performance.now() - inputStageStart).toFixed(2));
        const totalMs = Number((performance.now() - pipelineStartTime).toFixed(2));
        return {
          success: false,
          sessionId: input.sessionId || '',
          transcript: '',
          response: '',
          source: 'deterministic',
          audio: null,
          metrics: {
            audioInputProcessingMs: audioInputMs,
            sttLatencyMs: 0,
            conversationLatencyMs: 0,
            ttsLatencyMs: 0,
            totalPipelineLatencyMs: totalMs,
            sttMs: 0,
            conversationMs: 0,
            ttsMs: 0,
            totalMs,
          },
          error: {
            code: 'INVALID_CUSTOMER_BUSINESS_MISMATCH',
            message: `Customer with ID '${customerId}' does not belong to business '${businessId}'.`,
          },
        };
      }
      customerRecord = customer;
    }

    // Resolve or continue conversation session
    let sessionId: string;

    if (input.sessionId) {
      sessionId = input.sessionId;
      const existingSession = await this.sessions.getSession(sessionId);

      if (!existingSession) {
        const audioInputMs = Number((performance.now() - inputStageStart).toFixed(2));
        const totalMs = Number((performance.now() - pipelineStartTime).toFixed(2));
        return {
          success: false,
          sessionId,
          transcript: '',
          response: '',
          source: 'deterministic',
          audio: null,
          metrics: {
            audioInputProcessingMs: audioInputMs,
            sttLatencyMs: 0,
            conversationLatencyMs: 0,
            ttsLatencyMs: 0,
            totalPipelineLatencyMs: totalMs,
            sttMs: 0,
            conversationMs: 0,
            ttsMs: 0,
            totalMs,
          },
          error: {
            code: 'SESSION_EXPIRED',
            message: 'The requested conversation session has expired or does not exist.',
          },
        };
      }

      if (existingSession.businessId !== businessId) {
        const audioInputMs = Number((performance.now() - inputStageStart).toFixed(2));
        const totalMs = Number((performance.now() - pipelineStartTime).toFixed(2));
        return {
          success: false,
          sessionId,
          transcript: '',
          response: '',
          source: 'deterministic',
          audio: null,
          metrics: {
            audioInputProcessingMs: audioInputMs,
            sttLatencyMs: 0,
            conversationLatencyMs: 0,
            ttsLatencyMs: 0,
            totalPipelineLatencyMs: totalMs,
            sttMs: 0,
            conversationMs: 0,
            ttsMs: 0,
            totalMs,
          },
          error: {
            code: 'SESSION_BUSINESS_MISMATCH',
            message: 'Forbidden: The provided session does not belong to the requested business tenant.',
          },
        };
      }

      // Attach customer identity to existing session if identified mid-conversation
      if (customerRecord && !existingSession.customerId) {
        existingSession.customerId = customerRecord.id;
        existingSession.customerName = customerRecord.name;
        existingSession.customerPhone = customerRecord.phone || undefined;
        await this.sessions.setSession(existingSession);
      }
    } else {
      sessionId = `sess_voice_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      const now = new Date();
      await this.sessions.setSession({
        sessionId,
        businessId,
        step: BookingConversationStep.IDLE,
        customerId: customerRecord?.id,
        customerName: customerRecord?.name,
        customerPhone: customerRecord?.phone || undefined,
        createdAt: now,
        updatedAt: now,
        expiresAt: new Date(now.getTime() + 15 * 60 * 1000), // 15 min TTL
      });
    }

    const audioInputProcessingMs = Number((performance.now() - inputStageStart).toFixed(2));

    // ---------------------------------------------------------
    // STAGE 2: Speech-to-Text Transcription (Whisper)
    // ---------------------------------------------------------
    const sttStageStart = performance.now();
    const sttResult = await this.sttProvider.transcribe(audioFilePath, {
      timeoutMs: input.options?.sttTimeoutMs,
    });
    const sttLatencyMs = Number((performance.now() - sttStageStart).toFixed(2));

    // Handle STT Failures
    if (!sttResult.success) {
      const totalPipelineLatencyMs = Number((performance.now() - pipelineStartTime).toFixed(2));
      return {
        success: false,
        sessionId,
        transcript: '',
        response: '',
        source: 'deterministic',
        audio: null,
        metrics: {
          audioInputProcessingMs,
          sttLatencyMs,
          conversationLatencyMs: 0,
          ttsLatencyMs: 0,
          totalPipelineLatencyMs,
          sttMs: sttLatencyMs,
          conversationMs: 0,
          ttsMs: 0,
          totalMs: totalPipelineLatencyMs,
        },
        error: sttResult.error || {
          code: 'STT_TRANSCRIPTION_FAILED',
          message: 'Failed to transcribe audio speech.',
        },
      };
    }

    // Handle Empty Transcription (Clarification Prompt)
    if (!sttResult.transcript || sttResult.transcript.trim().length === 0) {
      const clarifyResponse = "I'm sorry, I didn't catch that. Could you please repeat what you said?";
      let clarifyAudio = null;
      let ttsLatencyMs = 0;

      if (input.options?.synthesizeSpeech !== false) {
        const ttsStart = performance.now();
        const ttsRes = await this.ttsProvider.synthesize(clarifyResponse);
        ttsLatencyMs = Number((performance.now() - ttsStart).toFixed(2));
        if (ttsRes.success) {
          clarifyAudio = {
            id: ttsRes.audioId,
            fileName: ttsRes.audioFileName,
            durationSec: ttsRes.durationSec,
          };
        }
      }

      const totalPipelineLatencyMs = Number((performance.now() - pipelineStartTime).toFixed(2));
      return {
        success: true,
        sessionId,
        transcript: '',
        response: clarifyResponse,
        source: 'deterministic',
        action: 'PROMPT_CLARIFICATION',
        intent: 'UNKNOWN',
        audio: clarifyAudio,
        metrics: {
          audioInputProcessingMs,
          sttLatencyMs,
          conversationLatencyMs: 0,
          ttsLatencyMs,
          totalPipelineLatencyMs,
          sttMs: sttLatencyMs,
          conversationMs: 0,
          ttsMs: ttsLatencyMs,
          totalMs: totalPipelineLatencyMs,
        },
      };
    }

    // ---------------------------------------------------------
    // STAGE 3: AI Receptionist Conversation Engine
    // ---------------------------------------------------------
    const convStageStart = performance.now();
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
    const conversationLatencyMs = Number((performance.now() - convStageStart).toFixed(2));

    // ---------------------------------------------------------
    // STAGE 4: Voice Response Normalization & Neural TTS
    // ---------------------------------------------------------
    const normalizedText = input.options?.enableConciseVoiceFormatting !== false
      ? this.normalizeVoiceResponse(engineResult.response)
      : engineResult.response;

    let ttsLatencyMs = 0;
    let audioResponse = null;

    if (input.options?.synthesizeSpeech !== false && normalizedText.length > 0) {
      const ttsStageStart = performance.now();
      const ttsResult = await this.ttsProvider.synthesize(normalizedText, {
        timeoutMs: input.options?.ttsTimeoutMs,
      });
      ttsLatencyMs = Number((performance.now() - ttsStageStart).toFixed(2));

      if (ttsResult.success) {
        audioResponse = {
          id: ttsResult.audioId,
          fileName: ttsResult.audioFileName,
          durationSec: ttsResult.durationSec,
        };
      } else {
        console.warn(`[Voice Orchestrator] TTS synthesis warning: ${ttsResult.error?.message}`);
      }
    }

    // ---------------------------------------------------------
    // STAGE 5: Performance Metric Assembly & Logging
    // ---------------------------------------------------------
    const totalPipelineLatencyMs = Number((performance.now() - pipelineStartTime).toFixed(2));
    const updatedSession = await this.sessions.getSession(sessionId);

    // Safe Structured Logging
    console.log(
      `[Voice Orchestrator] sessionId=${sessionId} businessId=${businessId} source=${engineResult.source} inputMs=${audioInputProcessingMs}ms sttMs=${sttLatencyMs}ms convMs=${conversationLatencyMs}ms ttsMs=${ttsLatencyMs}ms totalMs=${totalPipelineLatencyMs}ms`
    );

    return {
      success: engineResult.success,
      sessionId,
      transcript: sttResult.transcript,
      response: normalizedText,
      source: engineResult.source || 'deterministic',
      action: engineResult.action,
      intent: engineResult.intent,
      audio: audioResponse,
      metrics: {
        audioInputProcessingMs,
        sttLatencyMs,
        conversationLatencyMs,
        ttsLatencyMs,
        totalPipelineLatencyMs,
        sttMs: sttLatencyMs,
        conversationMs: conversationLatencyMs,
        ttsMs: ttsLatencyMs,
        totalMs: totalPipelineLatencyMs,
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

export const voiceConversationOrchestrator = new VoiceConversationOrchestrator();
