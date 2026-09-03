import { AIConversationContext } from './context.types';
import { AIIntent } from './intent.types';
import { AIAction } from './action.types';

export interface AIReceptionistRequest {
  message: string;
  context: AIConversationContext;
}

export type AIResponseSource = 'deterministic' | 'tool' | 'llm' | 'fallback';

export interface AIReceptionistResponse<T = unknown> {
  success: boolean;
  response: string;
  action: AIAction;
  intent?: AIIntent;
  sessionId: string;
  source?: AIResponseSource;
  toolUsed?: string;
  latencyMs?: number;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
