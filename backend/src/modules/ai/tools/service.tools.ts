import { z } from 'zod';
import { prisma } from '../../../lib/prisma';
import { AITool, AIToolResult } from '../types/tool.types';
import { AIConversationContext } from '../types/context.types';
import { toolRegistry } from './registry';

// ============================================================================
// 1. Get Services Tool
// ============================================================================
export const getServicesSchema = z.object({
  isActiveOnly: z.boolean().optional().default(true),
});

export type GetServicesInput = z.infer<typeof getServicesSchema>;

export interface SafeServiceSummary {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  isActive: boolean;
}

export const getServicesTool: AITool<GetServicesInput, SafeServiceSummary[]> = {
  name: 'get_services',
  description: 'Retrieves the bookable services catalog and durations for the active business.',
  schema: getServicesSchema,
  definition: {
    name: 'get_services',
    description: 'Retrieves the bookable services catalog and durations for the active business.',
    parameters: {
      type: 'object',
      properties: {
        isActiveOnly: {
          type: 'boolean',
          description: 'If true, returns only active bookable services (default: true).',
        },
      },
    },
  },
  async execute(input: GetServicesInput, context: AIConversationContext): Promise<AIToolResult<SafeServiceSummary[]>> {
    const services = await prisma.service.findMany({
      where: {
        businessId: context.businessId,
        ...(input.isActiveOnly !== false ? { isActive: true } : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      data: services,
      message: `Retrieved ${services.length} available service(s).`,
    };
  },
};

// ============================================================================
// 2. Get Service Details Tool
// ============================================================================
export const getServiceDetailsSchema = z.object({
  serviceId: z.string().min(1, 'Service ID is required'),
});

export type GetServiceDetailsInput = z.infer<typeof getServiceDetailsSchema>;

export const getServiceDetailsTool: AITool<GetServiceDetailsInput, SafeServiceSummary | null> = {
  name: 'get_service_details',
  description: 'Retrieves specific details, requirements, and duration for a given service ID.',
  schema: getServiceDetailsSchema,
  definition: {
    name: 'get_service_details',
    description: 'Retrieves specific details, requirements, and duration for a given service ID.',
    parameters: {
      type: 'object',
      properties: {
        serviceId: {
          type: 'string',
          description: 'The unique identifier of the service.',
        },
      },
      required: ['serviceId'],
    },
  },
  async execute(input: GetServiceDetailsInput, context: AIConversationContext): Promise<AIToolResult<SafeServiceSummary | null>> {
    const service = await prisma.service.findFirst({
      where: {
        id: input.serviceId,
        businessId: context.businessId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
        isActive: true,
      },
    });

    if (!service) {
      return {
        success: false,
        data: null,
        error: {
          code: 'SERVICE_NOT_FOUND',
          message: `Service with ID '${input.serviceId}' not found in business '${context.businessId}'.`,
        },
      };
    }

    return {
      success: true,
      data: service,
      message: `Service '${service.name}' (${service.durationMinutes} mins) retrieved successfully.`,
    };
  },
};

// Register service tools
toolRegistry.register(getServicesTool);
toolRegistry.register(getServiceDetailsTool);
