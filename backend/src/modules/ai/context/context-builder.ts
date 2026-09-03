import crypto from 'crypto';
import { prisma } from '../../../lib/prisma';
import { AIConversationContext, BuildAIContextInput } from '../types/context.types';

export class AIContextBuilder {
  /**
   * Constructs a minimal, lightweight conversation context for the AI receptionist.
   *
   * LOW-LATENCY STRATEGY:
   * Does NOT load all customers, appointments, or staff into context memory.
   * Only resolves essential metadata and verifies tenant validity.
   */
  public static async buildContext(input: BuildAIContextInput): Promise<AIConversationContext> {
    if (!input.businessId) {
      throw new Error('businessId is required to construct AI conversation context');
    }

    // Verify target business exists
    const business = await prisma.business.findUnique({
      where: { id: input.businessId },
      select: { id: true, name: true },
    });

    if (!business) {
      throw new Error(`Business with ID '${input.businessId}' does not exist.`);
    }

    // If customerId is provided, verify it belongs to this business
    let verifiedCustomerId: string | null = null;
    if (input.customerId) {
      const customer = await prisma.customer.findFirst({
        where: {
          id: input.customerId,
          businessId: input.businessId,
        },
        select: { id: true },
      });
      if (customer) {
        verifiedCustomerId = customer.id;
      }
    }

    const sessionId = input.sessionId || `session_${crypto.randomUUID()}`;

    return {
      businessId: input.businessId,
      sessionId,
      customerId: verifiedCustomerId,
      channel: input.channel || 'WEB',
      userId: input.userId,
      metadata: {
        businessName: business.name,
        ...(input.metadata || {}),
      },
    };
  }
}
