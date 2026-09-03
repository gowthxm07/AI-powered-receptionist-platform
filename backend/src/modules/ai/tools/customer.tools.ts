import { z } from 'zod';
import { prisma } from '../../../lib/prisma';
import { AITool, AIToolResult } from '../types/tool.types';
import { AIConversationContext } from '../types/context.types';
import { toolRegistry } from './registry';

// ============================================================================
// 1. Search Customer Tool
// ============================================================================
export const searchCustomerSchema = z.object({
  query: z.string().min(1, 'Search query must be at least 1 character long'),
});

export type SearchCustomerInput = z.infer<typeof searchCustomerSchema>;

export interface SafeCustomerSummary {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

export const searchCustomerTool: AITool<SearchCustomerInput, SafeCustomerSummary[]> = {
  name: 'search_customer',
  description: 'Searches for customers in the active business directory by name or phone number.',
  schema: searchCustomerSchema,
  definition: {
    name: 'search_customer',
    description: 'Searches for customers in the active business directory by name or phone number.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The customer name, partial name, or phone number to look up.',
        },
      },
      required: ['query'],
    },
  },
  async execute(input: SearchCustomerInput, context: AIConversationContext): Promise<AIToolResult<SafeCustomerSummary[]>> {
    const customers = await prisma.customer.findMany({
      where: {
        businessId: context.businessId,
        OR: [
          { name: { contains: input.query, mode: 'insensitive' } },
          { phone: { contains: input.query } },
          { email: { contains: input.query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
      take: 10,
    });

    return {
      success: true,
      data: customers,
      message: `Found ${customers.length} customer(s) matching '${input.query}'.`,
    };
  },
};

// ============================================================================
// 2. Get Customer Tool
// ============================================================================
export const getCustomerSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
});

export type GetCustomerInput = z.infer<typeof getCustomerSchema>;

export const getCustomerTool: AITool<GetCustomerInput, SafeCustomerSummary | null> = {
  name: 'get_customer',
  description: 'Retrieves a single customer profile by ID, scoped strictly to the current business tenant.',
  schema: getCustomerSchema,
  definition: {
    name: 'get_customer',
    description: 'Retrieves a single customer profile by ID, scoped strictly to the current business tenant.',
    parameters: {
      type: 'object',
      properties: {
        customerId: {
          type: 'string',
          description: 'The unique identifier of the customer.',
        },
      },
      required: ['customerId'],
    },
  },
  async execute(input: GetCustomerInput, context: AIConversationContext): Promise<AIToolResult<SafeCustomerSummary | null>> {
    const customer = await prisma.customer.findFirst({
      where: {
        id: input.customerId,
        businessId: context.businessId,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
      },
    });

    if (!customer) {
      return {
        success: false,
        data: null,
        error: {
          code: 'CUSTOMER_NOT_FOUND',
          message: `Customer with ID '${input.customerId}' not found in business '${context.businessId}'.`,
        },
      };
    }

    return {
      success: true,
      data: customer,
      message: `Customer profile '${customer.name}' retrieved successfully.`,
    };
  },
};

// Register customer tools in the global registry
toolRegistry.register(searchCustomerTool);
toolRegistry.register(getCustomerTool);
