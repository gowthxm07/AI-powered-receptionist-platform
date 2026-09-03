# Real-Time Voice Transport & Session Architecture

This document describes the design, implementation, session lifecycle, multi-tenant security model, latency instrumentation, and benchmark measurements for **Phase 7.1: Real-Time Voice Transport & Streaming Foundation** on the **AI-Powered Smart Receptionist Platform**.

---

## 1. Architectural Overview & Objective

The primary objective of Phase 7.1 is establishing a **transport-independent voice session and audio turn communication foundation** between mobile/web clients and the local AI receptionist running on the developer's laptop (Intel Core i5-1235U CPU, 8 GB RAM, Windows 11).

The design strictly decouples transport protocols (HTTP multipart, WebSockets, or future WebRTC signaling) from the underlying conversation engine and speech runtimes.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        MOBILE CLIENT / BROWSER                         │
│   (Captures spoken audio turn via Web Audio / MediaRecorder API)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Audio Turn Transport
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STAGE 1: REAL-TIME VOICE TRANSPORT LAYER                               │
│ • Controller: VoiceTransportController (/api/ai/voice/transport/*)     │
│ • Service: VoiceTurnTransportService                                   │
│ • Handlers: Multipart audio, Buffer, Base64 data URLs                  │
│ • Validations: Tenant scoping, payload size (<15MB), MIME type check   │
│ • Measured Overhead: 4.5 ms – 6.0 ms                                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STAGE 2: VOICE TRANSPORT SESSION MANAGER                               │
│ • Component: VoiceTransportSessionManager                              │
│ • Maps: transportSessionId (vtr_*) <──> conversationSessionId (sess_*) │
│ • State Machine: INITIALIZING -> READY -> PROCESSING_TURN -> READY     │
│ • Security: 403 SESSION_BUSINESS_MISMATCH tenant barrier               │
│ • TTL: 15-minute sliding session expiration                            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STAGE 3: VOICE CONVERSATION ORCHESTRATOR & LOCAL RUNTIMES              │
│ • Whisper.cpp (tiny.en): ~940 ms STT transcription                     │
│ • FastIntentRouter / State Machine: 0.1 ms – 12 ms deterministic logic │
│ • Piper Neural TTS (en_US-lessac): ~600 ms audio synthesis             │
│ • AudioStorageService: Safe audio persistence & streaming URLs         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ STAGE 4: STRUCTURED REAL-TIME RESPONSE METADATA                        │
│ • Response: { success, transportSessionId, transcript, responseText,   │
│               audio: { url: "/api/ai/voice/audio/:id" }, metrics }     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Voice Transport Session Lifecycle

The `VoiceTransportSessionManager` provides full lifecycle tracking without duplicating the existing `InMemorySessionStore`. It acts as the transport coordination layer:

```text
       ┌──────────────┐
       │ Client Start │
       └──────┬───────┘
              │ POST /api/ai/voice/transport/session (or auto-provisioned on turn)
              ▼
       ┌──────────────┐
       │    READY     │ ◄────────────────────────┐
       └──────┬───────┘                          │
              │ Turn Submitted                   │ Turn Response Complete
              ▼                                  │
       ┌──────────────────┐                      │
       │ PROCESSING_TURN  │ ─────────────────────┘
       └──────┬───────────┘
              │ Explicit DELETE or TTL Timeout (15 mins)
              ▼
       ┌──────────────┐
       │  TERMINATED  │
       └──────────────┘
```

### Key Properties:
- **`transportSessionId`**: Unique identifier starting with `vtr_<timestamp>_<hex>` representing the transport connection.
- **`conversationSessionId`**: Mapped AI conversation session ID starting with `sess_voice_<timestamp>_<hex>` stored in `InMemorySessionStore`.
- **`businessId`**: Enforces strict tenant isolation across all turns.
- **`customerId`**: Binds the caller profile and phone number to the session for CRM and booking tracking.
- **`turnCount`**: Tracks the sequential conversational turns.
- **`clientMetadata`**: Records client channel (`MOBILE_WEB`, `WEB_VOICE`, `DESKTOP`, `API`), IP address, and User-Agent.

---

## 3. Real Measured Benchmark Results (Intel Core i5-1235U)

Actual measured latencies captured via `npm --prefix backend run benchmark:voice-transport`:

| Pipeline Configuration | Transport Overhead | STT Latency | Conversation Engine | Neural TTS | Total Pipeline Latency | User-Perceived Roundtrip |
|---|---|---|---|---|---|---|
| **Direct Pipeline (Baseline)** | `0.0 ms` | **992.4 ms** | **2.2 ms** | **636.4 ms** | **1,634.1 ms** | **~1.63 seconds** |
| **Transport Layer (Booking Intent)** | **6.0 ms** | **1,076.8 ms** | **0.8 ms** | **609.2 ms** | **1,692.8 ms** | **~1.69 seconds** |
| **Transport Layer (Database Tool)** | **5.0 ms** | **989.9 ms** | **8.9 ms** | **1,835.9 ms** | **2,839.8 ms** | **~2.84 seconds** |

### Transport Overhead Assessment:
- **Session Setup Latency:** **3.88 ms**
- **Transport Turn Overhead:** **4.5 ms – 6.0 ms** (Consists of tenant validation, session map resolution, and response structuring).
- **Target Budget ($< 50$ ms):** 🏆 **PASSED** (Overhead is $< 12\%$ of the 50 ms budget and $< 0.4\%$ of total turn latency).

---

## 4. Multi-Tenant Security & Tenant Boundary Enforcement

1. **Cross-Tenant Session Rejection (`403 Forbidden`):**
   If a client attempts to submit a turn with `transportSessionId` belonging to Business A while specifying `businessId` of Business B, the transport layer immediately rejects the request with code `SESSION_BUSINESS_MISMATCH`.
2. **Cross-Tenant Customer Parameter Binding (`400 Bad Request`):**
   If a customer ID does not belong to the target business, session creation fails with `INVALID_CUSTOMER_BUSINESS_MISMATCH`.
3. **Session Expiration (`410 Gone`):**
   Sessions older than 15 minutes are automatically purged and return `SESSION_EXPIRED`.
4. **Path Traversal Defenses:**
   Audio files are strictly written and served from configured upload and audio runtime directories with sanitized filenames.

---

## 5. Failure Handling & Resilience

- **STT Failure:** Gracefully returns structured error code `STT_PROCESSING_FAILED` without crashing the transport layer or executing LLM calls.
- **Missing / Oversized Audio Payload:** Cleanly rejected with `MISSING_AUDIO_PAYLOAD` or `AUDIO_PAYLOAD_TOO_LARGE` ($> 15$ MB).
- **TTS Synthesis Failure:** Preserves the conversation transcript and generated response text, returning `audio: null` with a structured warning without losing session state.
- **Client Disconnects:** Safe cleanup via `DELETE /api/ai/voice/transport/session/:transportSessionId` or automatic 15-minute TTL sweep.

---

## 6. Real-Time Transport API Endpoints

```text
POST   /api/ai/voice/transport/session                     Create / initialize transport session
GET    /api/ai/voice/transport/session/:transportSessionId Inspect transport session state & metadata
DELETE /api/ai/voice/transport/session/:transportSessionId Terminate & clean up transport session
POST   /api/ai/voice/transport/turn                        Submit audio turn (multipart / base64 / buffer)
GET    /api/ai/voice/audio/:audioId                        Safe audio response streaming endpoint
```

---

## 7. Future WebRTC & Continuous Streaming Compatibility

Phase 7.1 establishes a modular interface `IVoiceTransportSession` and `VoiceTurnTransportService`. In future phases:
- The same `VoiceTransportSessionManager` can manage WebRTC data channel connections or WebSocket signaling sessions.
- Audio chunks can be buffered or streamed into `WhisperCppProvider` without modifying the core `AIReceptionistService`, `AppointmentStateMachine`, or PostgreSQL tool router.
- Zero architectural refactoring will be required when introducing real-time mobile browser voice interfaces.
