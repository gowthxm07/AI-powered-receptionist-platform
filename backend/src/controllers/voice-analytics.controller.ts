import { Request, Response, NextFunction } from 'express';
import { voiceAnalyticsService } from '../modules/speech/analytics';
import { voiceTransportSessionManager } from '../modules/speech/transport/services/voice-transport-session-manager';
import { OwnershipService } from '../services/ownership.service';
import { VoiceSessionStatusType } from '../modules/speech/analytics/types/voice-analytics.types';

export class VoiceAnalyticsController {
  /**
   * GET /api/analytics/voice
   * Retrieve aggregate voice receptionist metrics for a business tenant.
   */
  public static async getAggregateAnalytics(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const businessId = req.query.businessId as string;

      if (!businessId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_BUSINESS_ID',
            message: 'businessId query parameter is required.',
          },
        });
        return;
      }

      // Enforce multi-tenant isolation
      await OwnershipService.verifyBusinessOwnership(
        businessId,
        req.user!.userId,
        req.user!.role
      );

      const data = await voiceAnalyticsService.getBusinessVoiceAnalytics(businessId);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/analytics/voice/sessions
   * Retrieve paginated historical voice session logs for a business tenant.
   */
  public static async getSessionHistory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const businessId = req.query.businessId as string;

      if (!businessId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_BUSINESS_ID',
            message: 'businessId query parameter is required.',
          },
        });
        return;
      }

      // Enforce multi-tenant isolation
      await OwnershipService.verifyBusinessOwnership(
        businessId,
        req.user!.userId,
        req.user!.role
      );

      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const status = req.query.status as VoiceSessionStatusType | undefined;

      const result = await voiceAnalyticsService.getVoiceSessionHistory(businessId, {
        page,
        limit,
        status,
      });

      res.status(200).json({
        success: true,
        data: result.sessions,
        pagination: result.pagination,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/analytics/voice/active
   * Retrieve currently active in-memory voice transport sessions for a business tenant.
   */
  public static async getActiveSessions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const businessId = req.query.businessId as string;

      if (!businessId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_BUSINESS_ID',
            message: 'businessId query parameter is required.',
          },
        });
        return;
      }

      // Enforce multi-tenant isolation
      await OwnershipService.verifyBusinessOwnership(
        businessId,
        req.user!.userId,
        req.user!.role
      );

      const activeSessions = voiceTransportSessionManager.getActiveSessionsForBusiness(businessId);

      res.status(200).json({
        success: true,
        data: activeSessions,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/analytics/voice/sessions/:id
   * Retrieve single voice session detail with ownership check.
   */
  public static async getSessionById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const businessId = req.query.businessId as string;

      if (!businessId) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_BUSINESS_ID',
            message: 'businessId query parameter is required.',
          },
        });
        return;
      }

      // Enforce multi-tenant isolation
      await OwnershipService.verifyBusinessOwnership(
        businessId,
        req.user!.userId,
        req.user!.role
      );

      const session = await voiceAnalyticsService.getSessionById(id, businessId);

      if (!session) {
        res.status(404).json({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: `Voice session analytics record '${id}' not found.`,
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
}
