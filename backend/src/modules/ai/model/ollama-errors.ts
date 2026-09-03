export class OllamaError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;

  constructor(message: string, code: string = 'OLLAMA_ERROR', statusCode?: number) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class OllamaUnavailableError extends OllamaError {
  constructor(message: string = 'Ollama service is unreachable or not running on configured endpoint.') {
    super(message, 'OLLAMA_UNAVAILABLE', 503);
  }
}

export class OllamaTimeoutError extends OllamaError {
  constructor(timeoutMs: number) {
    super(`Ollama request timed out after ${timeoutMs}ms.`, 'OLLAMA_TIMEOUT', 504);
  }
}

export class OllamaAbortError extends OllamaError {
  constructor(message: string = 'Ollama request was aborted by caller or signal.') {
    super(message, 'OLLAMA_ABORTED', 499);
  }
}

export class OllamaModelUnavailableError extends OllamaError {
  constructor(model: string) {
    super(`Configured Ollama model '${model}' is not installed or available.`, 'OLLAMA_MODEL_UNAVAILABLE', 404);
  }
}

export class OllamaInvalidResponseError extends OllamaError {
  constructor(message: string = 'Ollama returned an invalid or malformed response.') {
    super(message, 'OLLAMA_INVALID_RESPONSE', 502);
  }
}
