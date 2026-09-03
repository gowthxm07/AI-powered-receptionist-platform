import { Request, Response, NextFunction } from 'express';
import { voiceTransportSessionManager } from '../modules/speech/transport/services/voice-transport-session-manager';
import { voiceTurnTransportService } from '../modules/speech/transport/services/voice-turn-transport.service';
import { VoiceAudioTurnInput } from '../modules/speech/transport/types/voice-transport.types';

export class VoiceTransportController {
  /**
   * Create or initialize a voice transport session for a mobile/web client.
   */
  public static async createSession(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { businessId, customerId, conversationSessionId, channel = 'MOBILE_WEB', clientMetadata } = req.body;

      if (!businessId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_BUSINESS_ID',
            message: 'businessId is required to create a voice transport session.',
          },
        });
        return;
      }

      const result = await voiceTransportSessionManager.createTransportSession({
        businessId,
        customerId,
        conversationSessionId,
        channel,
        clientMetadata: {
          userAgent: req.headers['user-agent'],
          clientIp: req.ip,
          ...(clientMetadata || {}),
        },
      });

      if (!result.success || !result.session) {
        const code = result.error?.code;
        const statusCode = code === 'BUSINESS_NOT_FOUND' ? 404 : code === 'SESSION_BUSINESS_MISMATCH' ? 403 : 400;
        res.status(statusCode).json(result);
        return;
      }

      res.status(201).json({
        success: true,
        data: result.session,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Submit an audio turn through the real-time voice transport layer.
   */
  public static async processTurn(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const body = req.body;
      const { transportSessionId, conversationSessionId, businessId, customerId, channel = 'MOBILE_WEB', metadata } = body;

      if (!businessId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_BUSINESS_ID',
            message: 'businessId is required for processing a voice turn.',
          },
        });
        return;
      }

      const turnInput: VoiceAudioTurnInput = {
        transportSessionId,
        conversationSessionId,
        businessId,
        customerId,
        clientChannel: channel,
        metadata,
      };

      if (req.file) {
        turnInput.audioFilePath = req.file.path;
      } else if (body.audioBase64) {
        turnInput.audioBase64 = body.audioBase64;
      } else if (body.audioFilePath) {
        turnInput.audioFilePath = body.audioFilePath;
      }

      const result = await voiceTurnTransportService.processVoiceTurn(turnInput);

      if (!result.success && result.error) {
        const { code } = result.error;
        if (code === 'BUSINESS_NOT_FOUND') {
          res.status(404).json(result);
          return;
        }
        if (code === 'INVALID_CUSTOMER_BUSINESS_MISMATCH' || code === 'MISSING_AUDIO_PAYLOAD' || code === 'AUDIO_PAYLOAD_TOO_LARGE') {
          res.status(400).json(result);
          return;
        }
        if (code === 'SESSION_EXPIRED') {
          res.status(410).json(result);
          return;
        }
        if (code === 'SESSION_BUSINESS_MISMATCH') {
          res.status(403).json(result);
          return;
        }
      }

      res.status(200).json({
        success: result.success,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Inspect the status and metadata of an active voice transport session.
   */
  public static async getSession(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { transportSessionId } = req.params;
      const session = await voiceTransportSessionManager.getTransportSession(transportSessionId);

      if (!session) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: `Voice transport session '${transportSessionId}' not found or has expired.`,
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: session,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Terminate and clean up an active voice transport session.
   */
  public static async terminateSession(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { transportSessionId } = req.params;
      const terminated = await voiceTransportSessionManager.terminateTransportSession(transportSessionId);

      if (!terminated) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: `Voice transport session '${transportSessionId}' not found.`,
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Voice transport session '${transportSessionId}' terminated successfully.`,
      });
    } catch (err) {
      next(err);
    }
  }
}
