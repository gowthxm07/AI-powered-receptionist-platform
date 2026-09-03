import { ZodTypeAny } from 'zod';
import { AIConversationContext } from './context.types';

export interface AIToolParameter {
  type: string;
  description: string;
  required?: boolean;
  enum?: string[];
}

export interface AIToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, AIToolParameter>;
    required?: string[];
  };
}

export interface AIToolCall<TInput = Record<string, unknown>> {
  tool: string;
  input: TInput;
  context: AIConversationContext;
}

export interface AIToolResult<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface AITool<TInput = any, TResult = any> {
  readonly name: string;
  readonly description: string;
  readonly schema: ZodTypeAny;
  readonly definition: AIToolDefinition;
  execute(input: TInput, context: AIConversationContext): Promise<AIToolResult<TResult>>;
}
