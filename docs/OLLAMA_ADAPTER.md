# Ollama Model Adapter & Local AI Generation Layer

This document defines the **Phase 5.2.2 AI Model Abstraction & Ollama Model Adapter** for the **AI-Powered Smart Receptionist Platform**. It details the model abstraction contracts, native HTTP integration, streaming capabilities, defensive context bounding, keep-alive strategy, error taxonomy, and low-latency defaults.

---

## 1. Architectural Overview & Component Boundaries

The objective of Phase 5.2.2 is to bridge the domain AI layer with local open-source LLM inference running via **Ollama** (`llama3.2:3b`) on standard CPU hardware without introducing heavy Python frameworks, cloud SDKs, or paid subscriptions.

```text
       ┌─────────────────────────────────────────────────────────┐
       │                 AI Receptionist Domain                  │
       │    (Conversation Context, Intents, Business Facades)   │
       └────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │             AI Model Interface Abstraction              │
       │   (AIModel, AIModelRequest, AIModelResponse, Streaming) │
       └────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │                  Ollama Model Adapter                   │
       │   (OllamaModelAdapter, Native Fetch, AbortController)   │
       └────────────────────────────┬────────────────────────────┘
                                    │
                       (Local Loopback Port 11434)
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │             Ollama Local HTTP REST Service              │
       │                     (/api/chat)                         │
       └────────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │              llama3.2:3b Model (2.0 GB)                 │
       │               (CPU-First AVX2 Inference)                │
       └─────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Scope Notice:**  
> The `OllamaModelAdapter` handles raw prompt and chat generation only. **Tool calling and Tool Router execution are not yet connected to the LLM**; that integration occurs in subsequent milestones.

---

## 2. AI Model Abstraction Interfaces

Defined in [`backend/src/modules/ai/model/model.types.ts`](file:///d:/Receptionist/backend/src/modules/ai/model/model.types.ts):

### `AIModelRequest`
```typescript
export interface AIModelRequest {
  prompt?: string;
  messages?: AIModelMessage[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  keepAlive?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}
```

### `AIModelResponse`
```typescript
export interface AIModelResponse {
  text: string;
  model: string;
  metrics: AIModelMetrics;
  success: boolean;
  error?: string;
}
```

### `AIModelStreamChunk`
```typescript
export interface AIModelStreamChunk {
  type: 'text' | 'done' | 'error';
  text?: string;
  metrics?: AIModelMetrics;
  error?: string;
}
```

### `AIModel` Contract
```typescript
export interface AIModel {
  readonly name: string;
  readonly modelId: string;
  generate(request: AIModelRequest): Promise<AIModelResponse>;
  generateStream(request: AIModelRequest): AsyncIterable<AIModelStreamChunk>;
  isAvailable(): Promise<boolean>;
}
```

---

## 3. Ollama Model Adapter Implementation

The [`OllamaModelAdapter`](file:///d:/Receptionist/backend/src/modules/ai/model/ollama-model-adapter.ts) communicates directly with the local Ollama HTTP service over `/api/chat` using native Node.js `fetch`.

### Key Features
1. **Zero External AI SDKs:** No LangChain, LlamaIndex, OpenAI, or Anthropic libraries.
2. **Dual-Mode Generation:**
   - **`generate()`**: Returns a complete `AIModelResponse` with full generation metrics once finished.
   - **`generateStream()`**: Native `AsyncIterable<AIModelStreamChunk>` yielding progressive text chunks over a decoded `ReadableStream`.
3. **Cancellation & Timeout Management:** Employs an internal `AbortController` linked with any user-provided `AbortSignal` and timer guards (`OLLAMA_TIMEOUT_MS`).
4. **Metric Mapping:** Automatically converts nanosecond Ollama counters (`total_duration`, `load_duration`, `prompt_eval_duration`, `eval_duration`, `eval_count`) into millisecond latency and throughput values (`tokensPerSecond`).

---

## 4. Defensive Guardrails & Context Limiting

Implemented in [`ModelValidator`](file:///d:/Receptionist/backend/src/modules/ai/model/model-validator.ts) to prevent runaway memory usage on 8 GB RAM systems:

- **Message History Window:** Retains only the last **10 messages** (`MAX_MESSAGE_HISTORY = 10`).
- **Character Truncation:** Caps individual message text at **2,000 characters** (`MAX_MESSAGE_CONTENT_CHARS = 2000`).
- **Token Bounds:** Restricts `maxTokens` between **5 and 512 tokens** (Default: `60 tokens`).
- **Temperature Guard:** Clamps temperature to **0.0–1.0** (Default: `0.2`).

---

## 5. Keep-Alive Strategy for 8 GB RAM Hardware

- **Configuration:** `OLLAMA_KEEP_ALIVE=5m` (Default: `5m` / 5 minutes).
- **Rationale:**  
  - Keeps model weights resident in system RAM during conversational dialogues (preventing a 6-second cold reload on each turn).
  - Automatically unloads the 2.0 GB weights from RAM after 5 minutes of inactivity, reclaiming system memory for other laptop applications.

---

## 6. Model Warm-Up Capability

An explicit, non-blocking warm-up mechanism allows pre-loading the model weights prior to faculty demonstrations or live phone shifts:

```bash
npm --prefix backend run ai:warmup
```

- **Runtime:** Pre-loads `llama3.2:3b` into memory in ~7.4 seconds.
- **Subsequent Turns:** Operates in warm mode with ~1.0–3.2s latency.

---

## 7. Error Handling & Taxonomy

| Error Class | Error Code | HTTP Equivalent | Trigger Condition |
|---|---|---|---|
| `OllamaUnavailableError` | `OLLAMA_UNAVAILABLE` | `503` | Local Ollama service is stopped or port is unreachable |
| `OllamaTimeoutError` | `OLLAMA_TIMEOUT` | `504` | Request exceeded timeout limit (`OLLAMA_TIMEOUT_MS`) |
| `OllamaAbortError` | `OLLAMA_ABORTED` | `499` | Caller cancelled generation via `AbortSignal` |
| `OllamaModelUnavailableError` | `OLLAMA_MODEL_UNAVAILABLE` | `404` | Configured model (`llama3.2:3b`) not pulled in Ollama |
| `OllamaInvalidResponseError` | `OLLAMA_INVALID_RESPONSE` | `502` | Ollama returned malformed JSON or non-200 status |

---

## 8. Verification Commands

```bash
# Run unit & mocked test suites (works offline, zero live Ollama required)
npm --prefix backend run test

# Pre-warm local model in RAM
npm --prefix backend run ai:warmup

# Run live non-streaming and streaming smoke test against local Ollama
npm --prefix backend run ai:smoke
```
