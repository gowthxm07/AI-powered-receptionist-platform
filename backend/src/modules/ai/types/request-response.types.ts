import { AIConversationContext } from './context.types';
import { AIIntent } from './intent.types';
import { AIAction } from './action.types';

export interface AIReceptionistRequest {
  message: string;
  context: AIConversationContext;
}

export interface AIReceptionistResponse<T = unknown> {
  success: boolean;
  response: string;
  action: AIAction;
  intent?: AIIntent;
  sessionId: string;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
