# Local Speech Runtime & Pipeline Architecture

This document provides the technical specification, modular architecture, API endpoints, audio storage strategy, latency instrumentation, and security guardrails for **Phase 6.2.2: Local Speech Runtime Integration** on the **AI-Powered Smart Receptionist Platform**.

---

## 1. System Overview & Voice Pipeline Architecture

The speech subsystem integrates **Speech-to-Text (STT)** and **Text-to-Speech (TTS)** runtimes with the existing **AI Receptionist Conversation Engine** on standard laptop CPU hardware without any paid cloud APIs or GPU dependencies.

```text
                               ┌────────────────────────────────────────┐
                               │       Incoming Audio Turn (.wav)       │
                               └───────────────────┬────────────────────┘
                                                   │
                                                   ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. SPEECH-TO-TEXT LAYER (WhisperCppProvider)                                                           │
│    • Executable: whisper-cli.exe (AVX2 Alder Lake SIMD compilation)                                    │
│    • Model Weights: ggml-tiny.en.bin (~74 MB)                                                          │
│    • Execution: Non-blocking asynchronous child_process.spawn                                          │
│    • Output: Clean, normalized plain-text transcript                                                   │
└──────────────────────────────────────────────────┬─────────────────────────────────────────────────────┘
                                                   │
                                                   ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 2. AI RECEPTIONIST CONVERSATION ENGINE (AIReceptionistService)                                         │
│    • Session Management: In-memory store with 15-minute TTL & multi-tenant isolation                   │
│    • Fast Deterministic Path: Sub-millisecond keyword/regex intent classifier (< 1 ms)                 │
│    • Multi-Turn State Machine: 6-turn booking workflow (Zero LLM calls, < 25 ms total DB latency)     │
│    • Micro-Tools: PostgreSQL queries for catalog services, staff availability, business hours         │
│    • Fallback Path: Ollama llama3.2:3b CPU inference (only when open-ended reasoning is required)      │
└──────────────────────────────────────────────────┬─────────────────────────────────────────────────────┘
                                                   │
                                                   ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 3. TEXT-TO-SPEECH LAYER (PiperProvider)                                                                │
│    • Executable: piper.exe (Native Windows x64 ONNX VITS synthesizer)                                  │
│    • Voice Model: en_US-lessac-medium.onnx (~63 MB)                                                    │
│    • Output: Unique audio file stored at runtime/audio/tts_<timestamp>_<hash>.wav                      │
└──────────────────────────────────────────────────┬─────────────────────────────────────────────────────┘
                                                   │
                                                   ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ 4. CLIENT DELIVERY & STREAMING (AIVoiceController)                                                     │
│    • Structured JSON response with transcript, text response, session state, and latency metrics       │
│    • Safe Audio Retrieval Endpoint: GET /api/ai/voice/audio/:audioId (audio/wav streaming)            │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Modular Component Design

```text
backend/src/modules/speech/
├── types/
│   └── speech.types.ts                 # Typed DTOs, provider interfaces, and pipeline metrics
├── providers/
│   ├── whisper-cpp.provider.ts         # Asynchronous whisper.cpp STT provider
│   ├── piper.provider.ts               # Asynchronous Piper neural TTS provider
│   ├── mock-stt.provider.ts            # Fast mock STT provider for automated testing
│   └── mock-tts.provider.ts            # Fast mock TTS provider for automated testing
├── services/
│   ├── audio-storage.service.ts        # Path traversal defense & temporary audio management
│   ├── speech-detector.service.ts      # Runtime binary and model availability detection
│   └── speech-pipeline.service.ts      # End-to-end voice orchestrator (Audio -> STT -> Engine -> TTS)
├── speech.config.ts                    # Centralized speech paths and environment configuration
└── index.ts                            # Speech module barrel export
```

---

## 3. Speech-to-Text Integration (`whisper.cpp`)

- **Binary:** Native `whisper-cli.exe` compiled with Intel Alder Lake AVX2/AVX_VNNI instructions (`ggml-cpu-alderlake.dll`).
- **Model:** `ggml-tiny.en.bin` (~74.1 MB on disk, ~77 MB resident RAM).
- **Execution:** Uses asynchronous `child_process.spawn` with timeout guards (`STT_TIMEOUT_MS`, default 15s).
- **Audio Validation:** Checks file existence, non-zero size, maximum size limit (15 MB), and WAV `RIFF` header bytes.
- **Parsing:** Strips Whisper diagnostic lines (`whisper_`, `system_info`, `main:`, `load_backend`) and returns clean text.

---

## 4. Text-to-Speech Integration (`Piper TTS`)

- **Binary:** Native `piper.exe` (v1.2.0) with ONNX Runtime and `espeak-ng` phonemizer.
- **Voice Model:** `en_US-lessac-medium.onnx` (VITS neural acoustic architecture).
- **Execution:** Streams synthesized text to `piper.exe` via `stdin` asynchronously.
- **Input Guardrails:** Rejects empty/whitespace-only input; automatically bounds text to `maxTextLength` (600 characters) to prevent CPU starvation.
- **Temporary Output:** Generates unique, non-colliding output files (`tts_<timestamp>_<randomHex>.wav`).

---

## 5. Audio Storage & Path Traversal Security

Runtime audio files are managed strictly through `AudioStorageService`:
- **Storage Layout:** `backend/runtime/audio/` (generated speech) and `backend/runtime/uploads/` (incoming caller audio). Both are strictly ignored by Git (`.gitignore`).
- **ID Validation:** Audio IDs are strictly validated using `^[a-zA-Z0-9_-]+$`.
- **Path Traversal Defense:** `path.resolve` and `path.normalize` ensure files are strictly contained within `runtime/audio/`. Requests containing `..`, slashes, or foreign paths are rejected with `403 ACCESS_DENIED`.
- **TTL Purge:** `AudioStorageService.cleanupStaleAudio()` automatically purges temporary audio files older than `AUDIO_TTL_MS` (default: 1 hour).

---

## 6. Voice API Endpoints

### 1. Execute Voice Turn
`POST /api/ai/voice/conversation`

**Request Options:**
- **Multipart Form-Data:** `audio` (file upload) + `businessId` (UUID) + `sessionId` (optional) + `customerId` (optional).
- **JSON Payload:** `{ "audioBase64": "...", "businessId": "...", "sessionId": "..." }`
- **File Reference:** `{ "audioFilePath": "...", "businessId": "..." }`

**Example Response (HTTP 200):**
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_voice_1788442318860_b09eb33c1d217f6c",
    "transcript": "I want to book an appointment.",
    "response": "Sure! Which service would you like to book?",
    "source": "deterministic",
    "action": "PROMPT_FOR_SERVICE",
    "intent": "BOOK_APPOINTMENT",
    "audio": {
      "id": "tts_1788442319976_18c86866c38247a9",
      "url": "/api/ai/voice/audio/tts_1788442319976_18c86866c38247a9",
      "fileName": "tts_1788442319976_18c86866c38247a9.wav",
      "durationSec": 2.8
    },
    "metrics": {
      "sttMs": 1112.06,
      "conversationMs": 2.73,
      "ttsMs": 780.35,
      "totalMs": 1900.96
    },
    "metadata": {
      "conversationStep": "BOOKING_COLLECT_SERVICE",
      "serviceName": null,
      "staffName": null,
      "date": null,
      "time": null
    }
  }
}
```

### 2. Stream Audio Output
`GET /api/ai/voice/audio/:audioId`

- **Headers:** `Content-Type: audio/wav`, `Accept-Ranges: bytes`, `Cache-Control: public, max-age=3600`
- **Security:** Rejects path traversal attempts with `403 Forbidden`.

### 3. Voice Runtime Health Check
`GET /api/ai/voice/status`

**Example Response (HTTP 200):**
```json
{
  "success": true,
  "data": {
    "stt": {
      "provider": "whisper.cpp",
      "available": true,
      "modelFound": true,
      "binaryFound": true
    },
    "tts": {
      "provider": "piper",
      "available": true,
      "modelFound": true,
      "binaryFound": true
    },
    "runtime": {
      "threads": 4,
      "maxAudioSizeMB": 15,
      "maxTextLength": 600
    }
  }
}
```

---

## 7. Measured End-to-End Latency Benchmarks (Intel Core i5-1235U)

Actual measured latencies from the live integrated speech pipeline demo:

| Voice Conversation Turn | Spoken Caller Input | STT Latency | Conversation Engine Latency | TTS Latency | Total Pipeline Latency | Execution Source |
|---|---|---|---|---|---|---|
| **Turn 1: Booking Intent** | *"I want to book an appointment."* | **1,112.06 ms** | **2.73 ms** | **780.35 ms** | **1,900.96 ms (~1.90s)** | ⚡ Deterministic (Zero-LLM) |
| **Turn 2: Service Selection** | *"Comprehensive oral exam & x-rays"* | **1,066.39 ms** | **12.16 ms** | **1,428.98 ms** | **2,511.88 ms (~2.51s)** | ⚡ Deterministic (DB Tool) |

---

## 8. Reproducibility & Commands

```bash
# Run Live End-to-End Voice Pipeline Demo
npm --prefix backend run demo:voice

# Run Master Test Suite (All 18 suites including speech pipeline)
npm --prefix backend run test

# Run Production Builds
npm --prefix backend run build
npm --prefix frontend run build
```
