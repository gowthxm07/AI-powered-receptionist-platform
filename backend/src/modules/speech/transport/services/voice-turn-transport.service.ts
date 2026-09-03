import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  VoiceAudioTurnInput,
  VoiceTurnTransportResult,
  IVoiceTransportSession,
} from '../types/voice-transport.types';
import {
  voiceTransportSessionManager,
  VoiceTransportSessionManager,
} from './voice-transport-session-manager';
import {
  voiceConversationOrchestrator,
  VoiceConversationOrchestrator,
} from '../../services/voice-orchestrator.service';
import { AudioStorageService } from '../../services/audio-storage.service';
import { speechConfig } from '../../speech.config';

export const SUPPORTED_AUDIO_MIME_TYPES = [
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/aac',
];

export class VoiceTurnTransportService {
  private sessionManager: VoiceTransportSessionManager;
  private orchestrator: VoiceConversationOrchestrator;

  constructor(options?: {
    sessionManager?: VoiceTransportSessionManager;
    orchestrator?: VoiceConversationOrchestrator;
  }) {
    this.sessionManager = options?.sessionManager || voiceTransportSessionManager;
    this.orchestrator = options?.orchestrator || voiceConversationOrchestrator;
  }

  /**
   * Process an inbound real-time voice turn from a mobile/web client.
   */
  public async processVoiceTurn(input: VoiceAudioTurnInput): Promise<VoiceTurnTransportResult> {
    const pipelineStartTime = performance.now();
    const {
      transportSessionId,
      businessId,
      customerId,
      clientChannel = 'MOBILE_WEB',
      metadata,
    } = input;

    let session: IVoiceTransportSession | null = null;
    let tempAudioPath: string | null = null;
    let shouldCleanupTemp = false;

    try {
      // -------------------------------------------------------------
      // STAGE 1: Transport Session Resolution & Validation
      // -------------------------------------------------------------
      const sessionSetupStart = performance.now();

      if (transportSessionId) {
        session = await this.sessionManager.getTransportSession(transportSessionId);

        if (!session) {
          const totalMs = Number((performance.now() - pipelineStartTime).toFixed(2));
          return {
            success: false,
            transportSessionId: transportSessionId || '',
            conversationSessionId: '',
            businessId,
            transcript: '',
            responseText: '',
            source: 'deterministic',
            audio: null,
            metrics: {
              transportOverheadMs: totalMs,
              audioValidationMs: 0,
              sttMs: 0,
              conversationMs: 0,
              ttsMs: 0,
              totalMs,
            },
            error: {
              code: 'SESSION_EXPIRED',
              message: 'The voice transport session has expired or does not exist.',
            },
          };
        }

        if (session.businessId !== businessId) {
          const totalMs = Number((performance.now() - pipelineStartTime).toFixed(2));
          return {
            success: false,
            transportSessionId,
            conversationSessionId: session.conversationSessionId,
            businessId,
            transcript: '',
            responseText: '',
            source: 'deterministic',
            audio: null,
            metrics: {
              transportOverheadMs: totalMs,
              audioValidationMs: 0,
              sttMs: 0,
              conversationMs: 0,
              ttsMs: 0,
              totalMs,
            },
            error: {
              code: 'SESSION_BUSINESS_MISMATCH',
              message: 'Forbidden: The provided voice transport session does not belong to the requested business.',
            },
          };
        }
      } else {
        // Automatically provision transport session
        const createResult = await this.sessionManager.createTransportSession({
          businessId,
          customerId,
          conversationSessionId: input.conversationSessionId,
          channel: clientChannel,
        });

        if (!createResult.success || !createResult.session) {
          const totalMs = Number((performance.now() - pipelineStartTime).toFixed(2));
          return {
            success: false,
            transportSessionId: '',
            conversationSessionId: '',
            businessId,
            transcript: '',
            responseText: '',
            source: 'deterministic',
            audio: null,
            metrics: {
              transportOverheadMs: totalMs,
              audioValidationMs: 0,
              sttMs: 0,
              conversationMs: 0,
              ttsMs: 0,
              totalMs,
            },
            error: createResult.error || {
              code: 'SESSION_CREATION_FAILED',
              message: 'Failed to create voice transport session.',
            },
          };
        }
        session = createResult.session;
      }

      await this.sessionManager.updateTransportSession(session.transportSessionId, {
        state: 'PROCESSING_TURN',
      });

      // -------------------------------------------------------------
      // STAGE 2: Audio Payload Extraction & MIME Validation
      // -------------------------------------------------------------
      const audioValidationStart = performance.now();
      AudioStorageService.ensureDirectories();

      if (input.audioFilePath) {
        tempAudioPath = input.audioFilePath;
        shouldCleanupTemp = false;
      } else if (input.audioBuffer) {
        const uniqueUploadName = `vturn_${Date.now()}_${crypto.randomBytes(8).toString('hex')}.wav`;
        tempAudioPath = path.resolve(speechConfig.storage.uploadDir, uniqueUploadName);
        fs.writeFileSync(tempAudioPath, input.audioBuffer);
        shouldCleanupTemp = true;
      } else if (input.audioBase64) {
        const base64Clean = input.audioBase64.replace(/^data:audio\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Clean, 'base64');
        const uniqueUploadName = `vturn_${Date.now()}_${crypto.randomBytes(8).toString('hex')}.wav`;
        tempAudioPath = path.resolve(speechConfig.storage.uploadDir, uniqueUploadName);
        fs.writeFileSync(tempAudioPath, buffer);
        shouldCleanupTemp = true;
      }

      if (!tempAudioPath) {
        const audioValidationMs = Number((performance.now() - audioValidationStart).toFixed(2));
        const totalMs = Number((performance.now() - pipelineStartTime).toFixed(2));
        return {
          success: false,
          transportSessionId: session.transportSessionId,
          conversationSessionId: session.conversationSessionId,
          businessId,
          transcript: '',
          responseText: '',
          source: 'deterministic',
          audio: null,
          metrics: {
            transportOverheadMs: Number((performance.now() - sessionSetupStart - audioValidationMs).toFixed(2)),
            audioValidationMs,
            sttMs: 0,
            conversationMs: 0,
            ttsMs: 0,
            totalMs,
          },
          error: {
            code: 'MISSING_AUDIO_PAYLOAD',
            message: 'Audio turn requires a valid audio file, buffer, or base64 stream.',
          },
        };
      }

      // Check audio size boundary if file exists
      if (fs.existsSync(tempAudioPath)) {
        const fileStat = fs.statSync(tempAudioPath);
        if (fileStat.size > speechConfig.stt.maxAudioSizeBytes) {
          const audioValidationMs = Number((performance.now() - audioValidationStart).toFixed(2));
          const totalMs = Number((performance.now() - pipelineStartTime).toFixed(2));
          return {
            success: false,
            transportSessionId: session.transportSessionId,
            conversationSessionId: session.conversationSessionId,
            businessId,
            transcript: '',
            responseText: '',
            source: 'deterministic',
            audio: null,
            metrics: {
              transportOverheadMs: 0,
              audioValidationMs,
              sttMs: 0,
              conversationMs: 0,
              ttsMs: 0,
              totalMs,
            },
            error: {
              code: 'AUDIO_PAYLOAD_TOO_LARGE',
              message: `Audio payload exceeds the ${speechConfig.stt.maxAudioSizeBytes / 1024 / 1024} MB size limit.`,
            },
          };
        }
      }

      const audioValidationMs = Number((performance.now() - audioValidationStart).toFixed(2));
      const transportPreOverheadMs = Number((performance.now() - sessionSetupStart - audioValidationMs).toFixed(2));

      // -------------------------------------------------------------
      // STAGE 3: Invoke Existing VoiceConversationOrchestrator
      // -------------------------------------------------------------
      const orchestratorResult = await this.orchestrator.orchestrateVoiceTurn({
        audioFilePath: tempAudioPath,
        businessId,
        sessionId: session.conversationSessionId,
        customerId: session.customerId || customerId,
        channel: clientChannel === 'MOBILE_WEB' ? 'VOICE' : 'VOICE',
        metadata: {
          transportSessionId: session.transportSessionId,
          ...(metadata || {}),
        },
      });

      // -------------------------------------------------------------
      // STAGE 4: Update Transport Session Lifecycle & Metrics
      // -------------------------------------------------------------
      await this.sessionManager.recordTurn(session.transportSessionId, 'READY');

      const totalPipelineMs = Number((performance.now() - pipelineStartTime).toFixed(2));
      const transportOverheadMs = Number(
        Math.max(
          0,
          totalPipelineMs -
            orchestratorResult.metrics.sttLatencyMs -
            orchestratorResult.metrics.conversationLatencyMs -
            orchestratorResult.metrics.ttsLatencyMs
        ).toFixed(2)
      );

      const responseAudioRef = orchestratorResult.audio
        ? {
            audioId: orchestratorResult.audio.id,
            url: `/api/ai/voice/audio/${orchestratorResult.audio.id}`,
            fileName: orchestratorResult.audio.fileName,
            mimeType: 'audio/wav',
            durationSec: orchestratorResult.audio.durationSec,
          }
        : null;

      // Safe structured transport logging
      console.log(
        `[Voice Transport] transportSessionId=${session.transportSessionId} convSessionId=${session.conversationSessionId} source=${orchestratorResult.source} overhead=${transportOverheadMs}ms sttMs=${orchestratorResult.metrics.sttLatencyMs}ms convMs=${orchestratorResult.metrics.conversationLatencyMs}ms ttsMs=${orchestratorResult.metrics.ttsLatencyMs}ms total=${totalPipelineMs}ms`
      );

      return {
        success: orchestratorResult.success,
        transportSessionId: session.transportSessionId,
        conversationSessionId: session.conversationSessionId,
        businessId,
        transcript: orchestratorResult.transcript,
        responseText: orchestratorResult.response,
        source: orchestratorResult.source,
        action: orchestratorResult.action,
        intent: orchestratorResult.intent,
        audio: responseAudioRef,
        metrics: {
          transportOverheadMs,
          audioValidationMs,
          sttMs: orchestratorResult.metrics.sttLatencyMs,
          conversationMs: orchestratorResult.metrics.conversationLatencyMs,
          ttsMs: orchestratorResult.metrics.ttsLatencyMs,
          totalMs: totalPipelineMs,
        },
        metadata: orchestratorResult.metadata,
        error: orchestratorResult.error,
      };
    } finally {
      if (shouldCleanupTemp && tempAudioPath && fs.existsSync(tempAudioPath)) {
        try {
          fs.unlinkSync(tempAudioPath);
        } catch {}
      }
    }
  }
}

export const voiceTurnTransportService = new VoiceTurnTransportService();
