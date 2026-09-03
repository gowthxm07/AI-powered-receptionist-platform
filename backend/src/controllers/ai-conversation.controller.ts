import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { aiReceptionistService } from '../modules/ai/services/ai-receptionist.service';
import { sessionStore } from '../modules/ai/conversation/in-memory-session-store';
import { BookingConversationStep } from '../modules/ai/conversation/conversation-session.types';
import { AIConversationRequestInput } from '../validation/ai-conversation.validation';

export class AIConversationController {
  /**
   * Primary conversation endpoint for interacting with the AI receptionist engine.
   * Handles session resolution, tenant security guardrails, performance tracking, and response formatting.
   */
  public static async processConversation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const apiStartTime = performance.now();

    try {
      const input = req.body as AIConversationRequestInput;
      const { businessId, message, context } = input;

      // 1. Verify business existence in PostgreSQL
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { id: true, name: true, phone: true, address: true },
      });

      if (!business) {
        res.status(404).json({
          success: false,
          error: {
            code: 'BUSINESS_NOT_FOUND',
            message: `Business with ID '${businessId}' does not exist.`,
          },
        });
        return;
      }

      // 2. Verify customer ownership/tenant isolation if customerId is provided
      if (context?.customerId) {
        const customer = await prisma.customer.findFirst({
          where: { id: context.customerId, businessId },
          select: { id: true, name: true },
        });

        if (!customer) {
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_CUSTOMER_BUSINESS_MISMATCH',
              message: `Customer with ID '${context.customerId}' does not belong to business '${businessId}'.`,
            },
          });
          return;
        }
      }

      // 3. Resolve or validate session
      let sessionId: string;

      if (input.sessionId) {
        sessionId = input.sessionId;
        const existingSession = await sessionStore.getSession(sessionId);

        // If the client passed a sessionId that is no longer active / has expired
        if (!existingSession) {
          res.status(410).json({
            success: false,
            error: {
              code: 'SESSION_EXPIRED',
              message: 'The requested conversation session has expired or does not exist. Please start a new conversation.',
            },
          });
          return;
        }

        // Multi-tenant business isolation: verify session belongs to the requested business
        if (existingSession.businessId !== businessId) {
          res.status(403).json({
            success: false,
            error: {
              code: 'SESSION_BUSINESS_MISMATCH',
              message: 'Forbidden: The provided session does not belong to the requested business tenant.',
            },
          });
          return;
        }
      } else {
        // Generate secure unique session identifier for new conversation
        sessionId = `sess_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
        const now = new Date();
        await sessionStore.setSession({
          sessionId,
          businessId,
          step: BookingConversationStep.IDLE,
          customerId: context?.customerId || undefined,
          createdAt: now,
          updatedAt: now,
          expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
        });
      }

      // 4. Execute Conversation Engine
      const engineStartTime = performance.now();
      const engineResult = await aiReceptionistService.processMessage({
        message,
        context: {
          businessId,
          sessionId,
          customerId: context?.customerId || null,
          channel: context?.channel || 'WEB',
          metadata: {
            businessName: business.name,
            ...(context?.metadata || {}),
          },
        },
      });
      const engineDurationMs = performance.now() - engineStartTime;

      // 5. Fetch updated session state for public metadata summary
      const updatedSession = await sessionStore.getSession(sessionId);
      const totalApiLatencyMs = performance.now() - apiStartTime;

      // 6. Safe Structured Performance Logging
      console.log(
        `[Conversation API] sessionId=${sessionId} businessId=${businessId} source=${engineResult.source} engineLatency=${engineResult.latencyMs?.toFixed(2) ?? engineDurationMs.toFixed(2)}ms totalApiLatency=${totalApiLatencyMs.toFixed(2)}ms`
      );

      // 7. Structured Client Response
      res.status(200).json({
        success: engineResult.success,
        data: {
          sessionId,
          response: engineResult.response,
          source: engineResult.source,
          action: engineResult.action,
          intent: engineResult.intent,
          latencyMs: Number((engineResult.latencyMs ?? engineDurationMs).toFixed(2)),
          totalLatencyMs: Number(totalApiLatencyMs.toFixed(2)),
          metadata: {
            conversationStep: updatedSession?.step || 'IDLE',
            serviceName: updatedSession?.selectedServiceName || null,
            staffName: updatedSession?.selectedStaffName || null,
            date: updatedSession?.selectedDate || null,
            time: updatedSession?.availableSlots?.find((s) => s.startTime === updatedSession?.selectedStartTime)?.timeLabel || null,
          },
        },
        error: engineResult.error || undefined,
      });
    } catch (err) {
      next(err);
    }
  }
}
