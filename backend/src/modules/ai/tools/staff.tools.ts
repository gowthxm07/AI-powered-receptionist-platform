import { z } from 'zod';
import { prisma } from '../../../lib/prisma';
import { AITool, AIToolResult } from '../types/tool.types';
import { AIConversationContext } from '../types/context.types';
import { toolRegistry } from './registry';

// ============================================================================
// 1. Get Staff Tool
// ============================================================================
export const getStaffSchema = z.object({
  isActiveOnly: z.boolean().optional().default(true),
});

export type GetStaffInput = z.infer<typeof getStaffSchema>;

export interface SafeStaffSummary {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string | null;
  isActive: boolean;
}

export const getStaffTool: AITool<GetStaffInput, SafeStaffSummary[]> = {
  name: 'get_staff',
  description: 'Retrieves the roster of staff specialists and practitioners for the active business.',
  schema: getStaffSchema,
  definition: {
    name: 'get_staff',
    description: 'Retrieves the roster of staff specialists and practitioners for the active business.',
    parameters: {
      type: 'object',
      properties: {
        isActiveOnly: {
          type: 'boolean',
          description: 'If true, returns only active staff members (default: true).',
        },
      },
    },
  },
  async execute(input: GetStaffInput, context: AIConversationContext): Promise<AIToolResult<SafeStaffSummary[]>> {
    const staff = await prisma.staff.findMany({
      where: {
        businessId: context.businessId,
        ...(input.isActiveOnly !== false ? { isActive: true } : {}),
      },
      select: {
        id: true,
        name: true,
        role: true,
        email: true,
        phone: true,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      data: staff,
      message: `Retrieved ${staff.length} staff member(s).`,
    };
  },
};

// ============================================================================
// 2. Get Staff Details Tool
// ============================================================================
export const getStaffDetailsSchema = z.object({
  staffId: z.string().min(1, 'Staff ID is required'),
});

export type GetStaffDetailsInput = z.infer<typeof getStaffDetailsSchema>;

export const getStaffDetailsTool: AITool<GetStaffDetailsInput, SafeStaffSummary | null> = {
  name: 'get_staff_details',
  description: 'Retrieves specific details and role information for a single staff specialist.',
  schema: getStaffDetailsSchema,
  definition: {
    name: 'get_staff_details',
    description: 'Retrieves specific details and role information for a single staff specialist.',
    parameters: {
      type: 'object',
      properties: {
        staffId: {
          type: 'string',
          description: 'The unique identifier of the staff member.',
        },
      },
      required: ['staffId'],
    },
  },
  async execute(input: GetStaffDetailsInput, context: AIConversationContext): Promise<AIToolResult<SafeStaffSummary | null>> {
    const staff = await prisma.staff.findFirst({
      where: {
        id: input.staffId,
        businessId: context.businessId,
      },
      select: {
        id: true,
        name: true,
        role: true,
        email: true,
        phone: true,
        isActive: true,
      },
    });

    if (!staff) {
      return {
        success: false,
        data: null,
        error: {
          code: 'STAFF_NOT_FOUND',
          message: `Staff member with ID '${input.staffId}' not found in business '${context.businessId}'.`,
        },
      };
    }

    return {
      success: true,
      data: staff,
      message: `Staff member '${staff.name}' (${staff.role}) retrieved successfully.`,
    };
  },
};

// Register staff tools
toolRegistry.register(getStaffTool);
toolRegistry.register(getStaffDetailsTool);
