import { ZodError } from 'zod';
import { AIToolCall, AIToolResult } from '../types/tool.types';
import { AIToolRegistry, toolRegistry } from './registry';

export class AIToolRouter {
  private registry: AIToolRegistry;

  constructor(registry: AIToolRegistry = toolRegistry) {
    this.registry = registry;
  }

  /**
   * Routes and securely executes a structured tool call.
   * 1. Validates context and businessId isolation.
   * 2. Resolves registered tool.
   * 3. Validates tool inputs with Zod.
   * 4. Executes tool safely without leaking stack traces or raw database errors.
   */
  public async executeTool(toolCall: AIToolCall): Promise<AIToolResult> {
    // 1. Validate Context
    if (!toolCall.context || !toolCall.context.businessId || typeof toolCall.context.businessId !== 'string') {
      return {
        success: false,
        error: {
          code: 'INVALID_CONTEXT',
          message: 'AI Tool execution rejected: Missing or invalid businessId in conversation context.',
        },
      };
    }

    if (!toolCall.context.sessionId || typeof toolCall.context.sessionId !== 'string') {
      return {
        success: false,
        error: {
          code: 'INVALID_CONTEXT',
          message: 'AI Tool execution rejected: Missing or invalid sessionId in conversation context.',
        },
      };
    }

    // 2. Resolve Tool
    const tool = this.registry.getTool(toolCall.tool);
    if (!tool) {
      return {
        success: false,
        error: {
          code: 'UNKNOWN_TOOL',
          message: `Requested tool '${toolCall.tool}' is not registered in the AI tool registry.`,
        },
      };
    }

    // 3. Validate Inputs using Tool's Zod Schema
    let validatedInput: any;
    try {
      validatedInput = await tool.schema.parseAsync(toolCall.input || {});
    } catch (err) {
      if (err instanceof ZodError) {
        const issues = err.errors.map((e) => `${e.path.join('.') || 'input'}: ${e.message}`).join(', ');
        return {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: `Tool input validation failed: ${issues}`,
          },
        };
      }
      return {
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Tool input validation failed.',
        },
      };
    }

    // 4. Execute Tool
    try {
      return await tool.execute(validatedInput, toolCall.context);
    } catch (err: any) {
      // Catch business/application errors and return structured error response
      const errorMessage = err?.message || 'An unexpected error occurred during tool execution.';
      const errorCode = err?.name === 'ConflictError' ? 'SCHEDULING_CONFLICT' : 'EXECUTION_ERROR';

      return {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
        },
      };
    }
  }
}

// Singleton global tool router instance
export const toolRouter = new AIToolRouter();
