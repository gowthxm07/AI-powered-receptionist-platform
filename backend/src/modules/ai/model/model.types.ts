export type AIModelRole = 'system' | 'user' | 'assistant';

export interface AIModelMessage {
  role: AIModelRole;
  content: string;
}

export interface AIModelRequest {
  /**
   * Raw prompt string (used for direct generate endpoints)
   */
  prompt?: string;

  /**
   * Structured conversation messages
   */
  messages?: AIModelMessage[];

  /**
   * System persona / instruction. Overrides or prepends to prompt
   */
  systemPrompt?: string;

  /**
   * Sampling temperature (0.0 to 1.0). Default is 0.2 for concise predictability
   */
  temperature?: number;

  /**
   * Maximum generated tokens. Default is 60 for short receptionist responses
   */
  maxTokens?: number;

  /**
   * Model keep-alive in RAM (e.g. '5m', '10m', '0s'). Default is '5m'
   */
  keepAlive?: string;

  /**
   * Per-request timeout in milliseconds
   */
  timeoutMs?: number;

  /**
   * Abort signal for cancelling inflight generation
   */
  signal?: AbortSignal;
}

export interface AIModelMetrics {
  totalDurationMs: number;
  loadDurationMs?: number;
  promptEvalDurationMs?: number;
  evalDurationMs?: number;
  evalCount?: number;
  promptEvalCount?: number;
  tokensPerSecond?: number;
}

export interface AIModelResponse {
  text: string;
  model: string;
  metrics: AIModelMetrics;
  success: boolean;
  error?: string;
}

export interface AIModelStreamChunk {
  type: 'text' | 'done' | 'error';
  text?: string;
  metrics?: AIModelMetrics;
  error?: string;
}

export interface AIModel {
  readonly name: string;
  readonly modelId: string;

  /**
   * Complete non-streaming generation
   */
  generate(request: AIModelRequest): Promise<AIModelResponse>;

  /**
   * Progressive streaming generation yielding text chunks
   */
  generateStream(request: AIModelRequest): AsyncIterable<AIModelStreamChunk>;

  /**
   * Checks if model runtime is reachable and model is loaded/ready
   */
  isAvailable(): Promise<boolean>;
}

// Sensible receptionist defaults optimized for low latency on CPU
export const DEFAULT_OUTPUT_MAX_TOKENS = 60;
export const DEFAULT_TEMPERATURE = 0.2;
export const DEFAULT_KEEP_ALIVE = '5m';
export const MAX_MESSAGE_HISTORY = 10;
export const MAX_MESSAGE_CONTENT_CHARS = 2000;

export const DEFAULT_RECEPTIONIST_SYSTEM_PROMPT =
  'You are a professional AI receptionist. Be polite, concise, and natural. Respond in 1 to 2 sentences. Do not invent business information; if specific business information is needed, state that you will look it up.';
