import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { voiceConversationOrchestrator } from '../modules/speech/services/voice-orchestrator.service';
import { AudioStorageService } from '../modules/speech/services/audio-storage.service';
import { SpeechDetectorService } from '../modules/speech/speech-detector.service';
import { speechConfig } from '../modules/speech/speech.config';
import { AIVoiceConversationRequestInput } from '../validation/ai-voice.validation';

export class AIVoiceController {
  /**
   * Primary voice conversation endpoint.
   * Handles audio file upload (multipart / base64 / path), speech transcription,
   * deterministic conversation engine routing, neural TTS synthesis, and telemetry.
   */
  public static async processVoiceConversation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const apiStartTime = performance.now();
    let tempAudioPath: string | null = null;
    let shouldCleanupTemp = false;

    try {
      const body = req.body as AIVoiceConversationRequestInput;
      const { businessId, sessionId, customerId, channel, metadata } = body;

      // 1. Resolve input audio file from multipart file upload, base64 payload, or file path
      if (req.file) {
        tempAudioPath = req.file.path;
        shouldCleanupTemp = true;
      } else if (body.audioBase64) {
        AudioStorageService.ensureDirectories();
        const base64Clean = body.audioBase64.replace(/^data:audio\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Clean, 'base64');
        const uploadFileName = `upload_${Date.now()}_${crypto.randomBytes(8).toString('hex')}.wav`;
        tempAudioPath = path.resolve(speechConfig.storage.uploadDir, uploadFileName);
        fs.writeFileSync(tempAudioPath, buffer);
        shouldCleanupTemp = true;
      } else if (body.audioFilePath) {
        tempAudioPath = path.resolve(speechConfig.paths.baseDir, body.audioFilePath);
        shouldCleanupTemp = false;
      }

      if (!tempAudioPath || !fs.existsSync(tempAudioPath)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_AUDIO_PAYLOAD',
            message: 'Audio input is required. Provide a multipart file upload, audioBase64 string, or valid audioFilePath.',
          },
        });
        return;
      }

      // 2. Execute end-to-end voice orchestrator pipeline
      const pipelineResult = await voiceConversationOrchestrator.orchestrateVoiceTurn({
        audioFilePath: tempAudioPath,
        businessId,
        sessionId,
        customerId: customerId || undefined,
        channel: (channel as any) || 'VOICE',
        metadata,
      });

      // 3. Map pipeline errors to appropriate HTTP status codes
      if (!pipelineResult.success && pipelineResult.error) {
        const { code } = pipelineResult.error;

        if (code === 'BUSINESS_NOT_FOUND') {
          res.status(404).json(pipelineResult);
          return;
        }
        if (code === 'INVALID_CUSTOMER_BUSINESS_MISMATCH') {
          res.status(400).json(pipelineResult);
          return;
        }
        if (code === 'SESSION_EXPIRED') {
          res.status(410).json(pipelineResult);
          return;
        }
        if (code === 'SESSION_BUSINESS_MISMATCH') {
          res.status(403).json(pipelineResult);
          return;
        }
      }

      const totalApiMs = Number((performance.now() - apiStartTime).toFixed(2));
      pipelineResult.metrics.totalMs = totalApiMs;

      // 4. Return structured response with relative audio retrieval URL
      const responseData: any = {
        ...pipelineResult,
        data: {
          sessionId: pipelineResult.sessionId,
          transcript: pipelineResult.transcript,
          response: pipelineResult.response,
          source: pipelineResult.source,
          action: pipelineResult.action,
          intent: pipelineResult.intent,
          audio: pipelineResult.audio
            ? {
                ...pipelineResult.audio,
                url: `/api/ai/voice/audio/${pipelineResult.audio.id}`,
              }
            : null,
          metrics: pipelineResult.metrics,
          metadata: pipelineResult.metadata,
        },
      };

      res.status(200).json(responseData);
    } catch (err) {
      next(err);
    } finally {
      // Clean up temporary upload file if generated
      if (shouldCleanupTemp && tempAudioPath && fs.existsSync(tempAudioPath)) {
        try {
          fs.unlinkSync(tempAudioPath);
        } catch {}
      }
    }
  }

  /**
   * Safe audio streaming endpoint for synthesized voice responses.
   * Path traversal resistant and returns correct audio/wav headers.
   */
  public static async getAudioById(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    try {
      const { audioId } = req.params;
      const resolution = AudioStorageService.getAudioPathById(audioId);

      if (!resolution.exists || !resolution.fullPath) {
        const statusCode = resolution.error?.includes('Access denied') ? 403 : 404;
        res.status(statusCode).json({
          success: false,
          error: {
            code: statusCode === 403 ? 'ACCESS_DENIED' : 'AUDIO_NOT_FOUND',
            message: resolution.error || 'Audio file not found.',
          },
        });
        return;
      }

      const stat = fs.statSync(resolution.fullPath);
      res.writeHead(200, {
        'Content-Type': 'audio/wav',
        'Content-Length': stat.size,
        'Cache-Control': 'public, max-age=3600',
        'Accept-Ranges': 'bytes',
      });

      const readStream = fs.createReadStream(resolution.fullPath);
      readStream.pipe(res);
    } catch (err) {
      res.status(500).json({
        success: false,
        error: {
          code: 'AUDIO_STREAM_ERROR',
          message: 'An error occurred while streaming the requested audio file.',
        },
      });
    }
  }

  /**
   * Public health and status check for speech runtime engines (Whisper & Piper).
   */
  public static async getVoiceStatus(
    _req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    const status = SpeechDetectorService.checkAvailability();
    res.status(200).json({
      success: true,
      data: {
        stt: {
          provider: status.stt.provider,
          available: status.stt.available,
          modelFound: status.stt.modelFound,
          binaryFound: status.stt.binaryFound,
        },
        tts: {
          provider: status.tts.provider,
          available: status.tts.available,
          modelFound: status.tts.modelFound,
          binaryFound: status.tts.binaryFound,
        },
        runtime: {
          threads: speechConfig.stt.threads,
          maxAudioSizeMB: speechConfig.stt.maxAudioSizeBytes / 1024 / 1024,
          maxTextLength: speechConfig.tts.maxTextLength,
        },
      },
    });
  }
}
