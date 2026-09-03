import {
  AIModelRequest,
  DEFAULT_KEEP_ALIVE,
  DEFAULT_OUTPUT_MAX_TOKENS,
  DEFAULT_RECEPTIONIST_SYSTEM_PROMPT,
  DEFAULT_TEMPERATURE,
  MAX_MESSAGE_CONTENT_CHARS,
  MAX_MESSAGE_HISTORY,
} from './model.types';

export class ModelValidator {
  /**
   * Sanitizes and enforces defensive guardrails on incoming AI model requests:
   * 1. Limits conversation history length to prevent context bloat
   * 2. Truncates individual message strings to avoid massive prompt payloads
   * 3. Bounds maxTokens and temperature to realistic receptionist ranges
   * 4. Applies sensible keep-alive and default system prompt
   */
  public static sanitizeRequest(request: AIModelRequest): AIModelRequest {
    // 1. Sanitize system prompt
    const systemPrompt = request.systemPrompt
      ? request.systemPrompt.slice(0, MAX_MESSAGE_CONTENT_CHARS)
      : DEFAULT_RECEPTIONIST_SYSTEM_PROMPT;

    // 2. Sanitize direct prompt if provided
    const prompt = request.prompt
      ? request.prompt.slice(0, MAX_MESSAGE_CONTENT_CHARS)
      : undefined;

    // 3. Sanitize and bound conversation messages
    let messages = request.messages;
    if (messages && messages.length > 0) {
      // Keep only last N messages
      const boundedMessages = messages.slice(-MAX_MESSAGE_HISTORY);
      messages = boundedMessages.map((m) => ({
        role: m.role,
        content: m.content.slice(0, MAX_MESSAGE_CONTENT_CHARS),
      }));
    }

    // 4. Bound sampling temperature (0.0 to 1.0)
    let temperature = request.temperature ?? DEFAULT_TEMPERATURE;
    if (isNaN(temperature) || temperature < 0) temperature = 0.0;
    if (temperature > 1.0) temperature = 1.0;

    // 5. Bound token limit (5 to 512 tokens)
    let maxTokens = request.maxTokens ?? DEFAULT_OUTPUT_MAX_TOKENS;
    if (isNaN(maxTokens) || maxTokens < 5) maxTokens = 5;
    if (maxTokens > 512) maxTokens = 512;

    // 6. Keep-alive default
    const keepAlive = request.keepAlive || DEFAULT_KEEP_ALIVE;

    return {
      ...request,
      prompt,
      messages,
      systemPrompt,
      temperature,
      maxTokens,
      keepAlive,
    };
  }
}
