import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../../lib/prisma';
import { aiReceptionistService, AIReceptionistService } from '../../ai/services/ai-receptionist.service';
import { sessionStore, InMemorySessionStore } from '../../ai/conversation/in-memory-session-store';
import { BookingConversationStep } from '../../ai/conversation/conversation-session.types';
import { WhisperCppProvider } from '../providers/whisper-cpp.provider';
import { PiperProvider } from '../providers/piper.provider';
import { audioConverterService, AudioConverterService } from './audio-converter.service';
import { voiceResponseOptimizer, VoiceResponseOptimizer } from './voice-response-optimizer.service';
import {
  SpeechToTextProvider,
  TextToSpeechProvider,
  SpeechPipelineInput,
  SpeechPipelineResult,
  SpeechToTextResult,
  SpeechPipelineAudioResponse,
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
    return voiceResponseOptimizer.optimizeForVoice(text, { channel: 'VOICE' }).text;
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
          audioConversionMs: 0,
          sttLatencyMs: 0,
          conversationLatencyMs: 0,
          responseOptimizationMs: 0,
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
          audioConversionMs: 0,
          sttLatencyMs: 0,
          conversationLatencyMs: 0,
          responseOptimizationMs: 0,
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
            audioConversionMs: 0,
            sttLatencyMs: 0,
            conversationLatencyMs: 0,
            responseOptimizationMs: 0,
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
            audioConversionMs: 0,
            sttLatencyMs: 0,
            conversationLatencyMs: 0,
            responseOptimizationMs: 0,
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
            audioConversionMs: 0,
            sttLatencyMs: 0,
            conversationLatencyMs: 0,
            responseOptimizationMs: 0,
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
    // STAGE 2: Audio Conversion & Speech-to-Text Transcription
    // ---------------------------------------------------------
    const sttStageStart = performance.now();
    let audioConversionMs = 0;
    let convertedAudioPath: string | null = null;
    let sttResult: SpeechToTextResult;

    try {
      // 2A: Convert audio to 16kHz mono PCM WAV if required (e.g. WebM, Opus, Ogg, MP4)
      const convResult = await audioConverterService.convertTo16kMonoWav(audioFilePath);
      audioConversionMs = convResult.latencyMs;
      const effectiveAudioPath = convResult.outputPath;
      if (convResult.converted) {
        convertedAudioPath = convResult.outputPath;
      }

      // 2B: Transcribe using Whisper
      sttResult = await this.sttProvider.transcribe(effectiveAudioPath, {
        timeoutMs: input.options?.sttTimeoutMs,
      });
    } finally {
      // Clean up converted temporary WAV file
      if (convertedAudioPath) {
        AudioConverterService.safeUnlink(convertedAudioPath);
      }
    }
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
          audioConversionMs,
          sttLatencyMs,
          conversationLatencyMs: 0,
          responseOptimizationMs: 0,
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
      const optClarify = voiceResponseOptimizer.optimizeForVoice(
        "I'm sorry, I didn't catch that. Could you please repeat what you said?",
        { channel, enableConciseFormatting: input.options?.enableConciseVoiceFormatting }
      );
      const clarifyResponse = optClarify.text;
      const turnKey = input.metadata?.transportSessionId
        ? `${input.metadata.transportSessionId}_clarify`
        : `${sessionId}_clarify_${Date.now()}`;

      const ttsDecision = voiceResponseOptimizer.evaluateTtsDecision(
        clarifyResponse,
        turnKey,
        { synthesizeSpeech: input.options?.synthesizeSpeech }
      );

      let clarifyAudio: SpeechPipelineAudioResponse | null = null;
      let ttsLatencyMs = 0;

      if (ttsDecision.shouldSynthesize) {
        const ttsStart = performance.now();
        const ttsRes = await this.ttsProvider.synthesize(clarifyResponse);
        ttsLatencyMs = Number((performance.now() - ttsStart).toFixed(2));
        if (ttsRes.success) {
          clarifyAudio = {
            id: ttsRes.audioId,
            fileName: ttsRes.audioFileName,
            durationSec: ttsRes.durationSec,
          };
          voiceResponseOptimizer.recordTurnSynthesis(turnKey, clarifyResponse, clarifyAudio);
        }
      } else if (ttsDecision.cachedAudio) {
        clarifyAudio = ttsDecision.cachedAudio;
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
          audioConversionMs,
          sttLatencyMs,
          conversationLatencyMs: 0,
          responseOptimizationMs: optClarify.latencyMs,
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

    // Determine database tool vs Ollama vs deterministic conversation latencies
    let databaseToolLatencyMs = 0;
    let ollamaLatencyMs = 0;

    if (engineResult.source === 'tool' || engineResult.toolUsed) {
      databaseToolLatencyMs = Number((engineResult.latencyMs || conversationLatencyMs).toFixed(2));
    } else if (engineResult.source === 'llm') {
      ollamaLatencyMs = Number((engineResult.latencyMs || conversationLatencyMs).toFixed(2));
    } else if (
      engineResult.action &&
      ['CREATE_APPOINTMENT', 'CHECK_AVAILABILITY', 'GET_SERVICES', 'GET_STAFF', 'SEARCH_CUSTOMER', 'GET_APPOINTMENTS'].includes(
        engineResult.action
      )
    ) {
      // Deterministic state machine executed Prisma database queries
      databaseToolLatencyMs = Number(Math.max(1, conversationLatencyMs - 1.5).toFixed(2));
    }

    // ---------------------------------------------------------
    // STAGE 4: Voice Response Optimization & Neural TTS
    // ---------------------------------------------------------
    const optRes = voiceResponseOptimizer.optimizeForVoice(
      engineResult.response,
      {
        channel,
        enableConciseFormatting: input.options?.enableConciseVoiceFormatting,
      }
    );
    const responseOptimizationMs = optRes.latencyMs;
    const spokenText = optRes.text;

    let ttsLatencyMs = 0;
    let responseAudioPreparationMs = 0;
    let audioResponse: SpeechPipelineAudioResponse | null = null;
    const turnKey = input.metadata?.transportSessionId
      ? `${input.metadata.transportSessionId}_turn_${input.metadata.turnCount || 0}`
      : `${sessionId}_turn_${Date.now()}`;

    const ttsDecision = voiceResponseOptimizer.evaluateTtsDecision(
      spokenText,
      turnKey,
      { synthesizeSpeech: input.options?.synthesizeSpeech }
    );

    if (ttsDecision.shouldSynthesize) {
      const ttsStageStart = performance.now();
      const ttsResult = await this.ttsProvider.synthesize(spokenText, {
        timeoutMs: input.options?.ttsTimeoutMs,
      });
      ttsLatencyMs = Number((performance.now() - ttsStageStart).toFixed(2));

      if (ttsResult.success) {
        const prepStart = performance.now();
        audioResponse = {
          id: ttsResult.audioId,
          fileName: ttsResult.audioFileName,
          durationSec: ttsResult.durationSec,
        };
        voiceResponseOptimizer.recordTurnSynthesis(turnKey, spokenText, audioResponse);
        responseAudioPreparationMs = Number((performance.now() - prepStart).toFixed(2));
      } else {
        console.warn(`[Voice Orchestrator] TTS synthesis warning: ${ttsResult.error?.message}`);
      }
    } else if (ttsDecision.cachedAudio) {
      audioResponse = ttsDecision.cachedAudio;
    }

    // ---------------------------------------------------------
    // STAGE 5: Performance Metric Assembly & Logging
    // ---------------------------------------------------------
    const totalPipelineLatencyMs = Number((performance.now() - pipelineStartTime).toFixed(2));
    const updatedSession = await this.sessions.getSession(sessionId);

    // Safe Structured Logging (no PII, no audio buffers)
    console.log(
      `[Voice Orchestrator] sessionId=${sessionId} businessId=${businessId} source=${engineResult.source} inputMs=${audioInputProcessingMs}ms convAudioMs=${audioConversionMs}ms sttMs=${sttLatencyMs}ms convMs=${conversationLatencyMs}ms (dbMs=${databaseToolLatencyMs}ms llmMs=${ollamaLatencyMs}ms) optMs=${responseOptimizationMs}ms ttsMs=${ttsLatencyMs}ms totalMs=${totalPipelineLatencyMs}ms`
    );

    return {
      success: engineResult.success,
      sessionId,
      transcript: sttResult.transcript,
      response: spokenText,
      source: engineResult.source || 'deterministic',
      action: engineResult.action,
      intent: engineResult.intent,
      audio: audioResponse,
      metrics: {
        audioInputProcessingMs,
        audioConversionMs,
        sttLatencyMs,
        whisperLatencyMs: sttLatencyMs,
        conversationLatencyMs,
        databaseToolLatencyMs,
        ollamaLatencyMs,
        responseOptimizationMs,
        ttsLatencyMs,
        piperTtsLatencyMs: ttsLatencyMs,
        responseAudioPreparationMs,
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
        appointmentId: (engineResult.data as any)?.id || (engineResult.data as any)?.appointment?.id || null,
      },
      error: engineResult.error || undefined,
    };
  }
}

export const voiceConversationOrchestrator = new VoiceConversationOrchestrator();
