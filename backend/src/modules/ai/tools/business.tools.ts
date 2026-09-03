import { z } from 'zod';
import { prisma } from '../../../lib/prisma';
import { AITool, AIToolResult } from '../types/tool.types';
import { AIConversationContext } from '../types/context.types';
import { toolRegistry } from './registry';

export const getBusinessInfoSchema = z.object({});

export type GetBusinessInfoInput = z.infer<typeof getBusinessInfoSchema>;

export interface SafeBusinessSummary {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string | null;
  description: string | null;
  timezone: string;
}

export const getBusinessInfoTool: AITool<GetBusinessInfoInput, SafeBusinessSummary | null> = {
  name: 'get_business_info',
  description: 'Retrieves public information, contact details, address, and timezone for the active business.',
  schema: getBusinessInfoSchema,
  definition: {
    name: 'get_business_info',
    description: 'Retrieves public information, contact details, address, and timezone for the active business.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  async execute(_input: GetBusinessInfoInput, context: AIConversationContext): Promise<AIToolResult<SafeBusinessSummary | null>> {
    const business = await prisma.business.findUnique({
      where: {
        id: context.businessId,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        address: true,
        description: true,
        timezone: true,
      },
    });

    if (!business) {
      return {
        success: false,
        data: null,
        error: {
          code: 'BUSINESS_NOT_FOUND',
          message: `Business with ID '${context.businessId}' not found.`,
        },
      };
    }

    return {
      success: true,
      data: business,
      message: `Business information for '${business.name}' retrieved successfully.`,
    };
  },
};

// Register business info tool
toolRegistry.register(getBusinessInfoTool);
