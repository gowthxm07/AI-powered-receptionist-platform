import { config } from '../../../config/environment';
import { OllamaRuntimeService } from '../runtime/ollama-runtime.service';
import { ModelValidator } from './model-validator';
import {
  AIModel,
  AIModelMessage,
  AIModelMetrics,
  AIModelRequest,
  AIModelResponse,
  AIModelStreamChunk,
} from './model.types';
import {
  OllamaAbortError,
  OllamaError,
  OllamaInvalidResponseError,
  OllamaTimeoutError,
  OllamaUnavailableError,
} from './ollama-errors';

interface OllamaChatMessage {
  role: string;
  content: string;
}

interface OllamaChatResponse {
  model: string;
  message?: {
    role: string;
    content: string;
  };
  response?: string; // fallback if /api/generate
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_duration?: number;
  eval_duration?: number;
  eval_count?: number;
  prompt_eval_count?: number;
  error?: string;
}

export class OllamaModelAdapter implements AIModel {
  public readonly name: string = 'OllamaModelAdapter';
  public readonly modelId: string;
  public readonly baseUrl: string;
  public readonly defaultTimeoutMs: number;
  public readonly defaultKeepAlive: string;

  constructor(options?: {
    baseUrl?: string;
    modelId?: string;
    defaultTimeoutMs?: number;
    defaultKeepAlive?: string;
  }) {
    this.baseUrl = options?.baseUrl || config.ollamaBaseUrl;
    this.modelId = options?.modelId || config.ollamaModel;
    this.defaultTimeoutMs = options?.defaultTimeoutMs || config.ollamaTimeoutMs;
    this.defaultKeepAlive = options?.defaultKeepAlive || config.ollamaKeepAlive || '5m';
  }

  /**
   * Builds the formatted message array for Ollama Chat API
   */
  private buildOllamaMessages(request: AIModelRequest): OllamaChatMessage[] {
    const messages: OllamaChatMessage[] = [];

    // 1. Inject system prompt
    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt,
      });
    }

    // 2. Add conversation history or direct prompt
    if (request.messages && request.messages.length > 0) {
      for (const msg of request.messages) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    } else if (request.prompt) {
      messages.push({
        role: 'user',
        content: request.prompt,
      });
    }

    return messages;
  }

  /**
   * Helper to construct AbortController linked with user signal and timeout
   */
  private createLinkedAbort(
    timeoutMs: number,
    userSignal?: AbortSignal
  ): {
    controller: AbortController;
    cleanup: () => void;
    wasTimedOut: () => boolean;
  } {
    const controller = new AbortController();
    let timedOut = false;

    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);

    const onUserAbort = () => {
      controller.abort();
    };

    if (userSignal) {
      if (userSignal.aborted) {
        controller.abort();
      } else {
        userSignal.addEventListener('abort', onUserAbort, { once: true });
      }
    }

    const cleanup = () => {
      clearTimeout(timeoutId);
      if (userSignal) {
        userSignal.removeEventListener('abort', onUserAbort);
      }
    };

    return {
      controller,
      cleanup,
      wasTimedOut: () => timedOut,
    };
  }

  /**
   * Maps raw Ollama nanosecond counters into typed millisecond metrics
   */
  private mapMetrics(
    data: OllamaChatResponse,
    wallDurationMs: number
  ): AIModelMetrics {
    const loadDurationMs = data.load_duration ? data.load_duration / 1_000_000 : undefined;
    const promptEvalDurationMs = data.prompt_eval_duration ? data.prompt_eval_duration / 1_000_000 : undefined;
    const evalDurationMs = data.eval_duration ? data.eval_duration / 1_000_000 : undefined;
    const evalCount = data.eval_count;
    const promptEvalCount = data.prompt_eval_count;

    let tokensPerSecond: number | undefined;
    if (evalCount && evalDurationMs && evalDurationMs > 0) {
      tokensPerSecond = evalCount / (evalDurationMs / 1000);
    }

    return {
      totalDurationMs: data.total_duration ? data.total_duration / 1_000_000 : wallDurationMs,
      loadDurationMs,
      promptEvalDurationMs,
      evalDurationMs,
      evalCount,
      promptEvalCount,
      tokensPerSecond,
    };
  }

  /**
   * Checks if Ollama runtime is reachable and configured model is present
   */
  public async isAvailable(): Promise<boolean> {
    const status = await OllamaRuntimeService.checkOllamaAvailability(
      this.baseUrl,
      this.modelId
    );
    return status.available && status.modelAvailable;
  }

  /**
   * Explicitly pre-warms the model in RAM
   */
  public async warmup(keepAlive: string = this.defaultKeepAlive): Promise<{
    success: boolean;
    durationMs: number;
    error?: string;
  }> {
    const startTime = performance.now();
    try {
      const res = await this.generate({
        prompt: 'ready',
        systemPrompt: 'Respond with OK.',
        maxTokens: 5,
        keepAlive,
        timeoutMs: 30000,
      });
      return {
        success: res.success,
        durationMs: performance.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        durationMs: performance.now() - startTime,
        error: err?.message || 'Warmup failed',
      };
    }
  }

  /**
   * Executes non-streaming text generation via local Ollama
   */
  public async generate(rawRequest: AIModelRequest): Promise<AIModelResponse> {
    const request = ModelValidator.sanitizeRequest(rawRequest);
    const timeoutMs = request.timeoutMs || this.defaultTimeoutMs;
    const { controller, cleanup, wasTimedOut } = this.createLinkedAbort(
      timeoutMs,
      request.signal
    );

    const endpoint = `${this.baseUrl}/api/chat`;
    const ollamaMessages = this.buildOllamaMessages(request);

    const payload = {
      model: this.modelId,
      messages: ollamaMessages,
      stream: false,
      keep_alive: request.keepAlive || this.defaultKeepAlive,
      options: {
        temperature: request.temperature,
        num_predict: request.maxTokens,
        num_ctx: 2048,
      },
    };

    const startTime = performance.now();

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const wallDurationMs = performance.now() - startTime;

      if (!response.ok) {
        let errMessage = `HTTP ${response.status} ${response.statusText}`;
        try {
          const errData = (await response.json()) as { error?: string };
          if (errData.error) errMessage = errData.error;
        } catch {
          // ignore non-json error
        }
        throw new OllamaInvalidResponseError(`Ollama request failed: ${errMessage}`);
      }

      const data = (await response.json()) as OllamaChatResponse;
      const text = data.message?.content || data.response || '';
      const metrics = this.mapMetrics(data, wallDurationMs);

      return {
        text: text.trim(),
        model: data.model || this.modelId,
        metrics,
        success: true,
      };
    } catch (err: any) {
      if (wasTimedOut()) {
        throw new OllamaTimeoutError(timeoutMs);
      }
      if (request.signal?.aborted || err?.name === 'AbortError') {
        throw new OllamaAbortError();
      }
      if (err instanceof OllamaError) {
        throw err;
      }
      if (err?.code === 'ECONNREFUSED' || err?.message?.includes('fetch failed')) {
        throw new OllamaUnavailableError(
          `Unable to connect to Ollama at ${this.baseUrl}. Is Ollama running?`
        );
      }
      throw new OllamaInvalidResponseError(err?.message || 'Unknown error communicating with Ollama');
    } finally {
      cleanup();
    }
  }

  /**
   * Executes progressive streaming generation yielding text chunks as they arrive
   */
  public async *generateStream(
    rawRequest: AIModelRequest
  ): AsyncIterable<AIModelStreamChunk> {
    const request = ModelValidator.sanitizeRequest(rawRequest);
    const timeoutMs = request.timeoutMs || this.defaultTimeoutMs;
    const { controller, cleanup, wasTimedOut } = this.createLinkedAbort(
      timeoutMs,
      request.signal
    );

    const endpoint = `${this.baseUrl}/api/chat`;
    const ollamaMessages = this.buildOllamaMessages(request);

    const payload = {
      model: this.modelId,
      messages: ollamaMessages,
      stream: true,
      keep_alive: request.keepAlive || this.defaultKeepAlive,
      options: {
        temperature: request.temperature,
        num_predict: request.maxTokens,
        num_ctx: 2048,
      },
    };

    const startTime = performance.now();

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        let errMessage = `HTTP ${response.status} ${response.statusText}`;
        try {
          const errData = (await response.json()) as { error?: string };
          if (errData.error) errMessage = errData.error;
        } catch {
          // ignore
        }
        throw new OllamaInvalidResponseError(`Ollama streaming request failed: ${errMessage}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const chunkData = JSON.parse(trimmed) as OllamaChatResponse;
            const chunkText = chunkData.message?.content || chunkData.response || '';

            if (chunkText) {
              yield {
                type: 'text',
                text: chunkText,
              };
            }

            if (chunkData.done) {
              const wallDurationMs = performance.now() - startTime;
              const metrics = this.mapMetrics(chunkData, wallDurationMs);
              yield {
                type: 'done',
                metrics,
              };
              return;
            }
          } catch {
            // Safe fallback for partial or malformed line
          }
        }
      }

      // Final yield if buffer has residual done signal
      const wallDurationMs = performance.now() - startTime;
      yield {
        type: 'done',
        metrics: { totalDurationMs: wallDurationMs },
      };
    } catch (err: any) {
      if (wasTimedOut()) {
        yield { type: 'error', error: `Ollama streaming timed out after ${timeoutMs}ms.` };
        throw new OllamaTimeoutError(timeoutMs);
      }
      if (request.signal?.aborted || err?.name === 'AbortError') {
        yield { type: 'error', error: 'Ollama streaming was aborted.' };
        throw new OllamaAbortError();
      }
      const errMsg = err?.message || 'Error occurred during Ollama streaming';
      yield { type: 'error', error: errMsg };
      if (err instanceof OllamaError) {
        throw err;
      }
      throw new OllamaInvalidResponseError(errMsg);
    } finally {
      cleanup();
    }
  }
}

// Export singleton instance configured for local environment
export const ollamaModelAdapter = new OllamaModelAdapter();
