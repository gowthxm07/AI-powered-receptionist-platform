# AI Receptionist Architecture & Tool Foundation

This document defines the **AI Receptionist Architecture** for the **AI-Powered Smart Receptionist Platform**. It details the model-agnostic layer, tool registry, tool router, conversation context, multi-tenant isolation, appointment conflict safety, low-latency design strategy, local Ollama runtime layer, model generation adapter, orchestration routing subsystem, multi-turn booking engine, and conversation REST API gateway.

---

## 1. Architectural Overview & Design Principles

The core objective of the platform is to enable autonomous, low-latency conversational receptionists for multi-tenant businesses. To guarantee security, maintainability, and sub-second response times, the system enforces a strict separation between **AI Cognitive Inference** and **Deterministic Business Operations**.

### Key Architectural Principles
1. **No Direct Database Access:** The AI model **never** directly constructs SQL queries or accesses Prisma Client.
2. **Controlled Tool Execution:** The AI model interacts exclusively with registered, typed, and validated tools.
3. **Strict Multi-Tenant Scoping:** Every tool execution requires a verified `AIConversationContext` containing `businessId`. Cross-tenant data leakage is mathematically and architecturally impossible.
4. **Enforced Business Invariants:** AI tools pass through existing business services, ensuring that conflict detection, tenant verification, and validation rules cannot be bypassed.
5. **Model-Agnostic Design:** The tool framework is independent of any specific LLM provider or orchestration framework, preparing for future integration with local Ollama models.
6. **Low Latency by Design:** Minimal context construction prevents bloated prompts, reduces LLM token generation time, and executes small, indexed database queries.
7. **Dual-Path Orchestration:** Common inquiries (greetings, services, staff, business info) and multi-turn appointment booking workflows resolve via fast deterministic rules ($< 1$ms) or database micro-tools ($< 15$ms) without invoking the LLM, preserving system responsiveness.
8. **Unified REST Dialogue Gateway:** The conversational runtime is exposed via `POST /api/ai/conversation`, providing a decoupled interface for web, voice, and telephony clients with high-resolution performance metrics.

---

## 2. End-to-End Conceptual Flow Diagram

```text
                     Client (Web / Voice / Phone)
                                   │
                                   ▼
                   [ POST /api/ai/conversation ]
               (Zod Validation + Tenant Verification)
                                   │
                                   ▼
                        [ AI Context Builder ]
                     (Minimal tenant & session metadata)
                                   │
                                   ▼
                       [ AIReceptionistService ]
                                   │
                       [ Active Session Check ]
                                   │
              ┌────────────────────┴────────────────────┐
              │                                         │
     [ Active Booking State ]                   [ No Active State ]
              │                                         │
              ▼                                         ▼
   [ AppointmentStateMachine ]                 [ FastIntentRouter ]
  (Deterministic Multi-Turn:                            │
   Service -> Staff -> Date                     ┌───────┴───────┐
   -> Slot -> Confirm)                          │               │
              │                                 ▼               ▼
              │                           Deterministic    LLM Fallback
              │                             Fast Path        (Ollama)
              │                                 │               │
              └────────────────────┬────────────┘               │
                                   │                            │
                                   ▼                            ▼
                       [ AIToolRouter Execution ]               │
                      (get_services, get_staff,                 │
                       create_appointment)                      │
                                   │                            │
                                   └────────────┬───────────────┘
                                                │
                                                ▼
                                    [ AIReceptionistResponse ]
                              (Text, Action, Intent, Source, Latency)
                                                │
                                                ▼
                                  [ AIConversationController ]
                               (High-Res Timing & Safe Logging)
                                                │
                                                ▼
                                        HTTP 200 OK JSON
```

---

## 3. Modular AI Subsystem Structure

```text
backend/src/
├── controllers/
│   └── ai-conversation.controller.ts -> POST /api/ai/conversation controller
├── routes/
│   └── ai.routes.ts                  -> AI API route mounting
├── validation/
│   └── ai-conversation.validation.ts -> Zod schemas for conversation API
└── modules/ai/
    ├── types/
    │   ├── context.types.ts          -> AIConversationContext, AIChannel, BuildAIContextInput
    │   ├── intent.types.ts           -> Controlled AIIntent enum definitions (GREETING, GOODBYE, etc.)
    │   ├── action.types.ts           -> Controlled AIAction enum definitions
    │   ├── request-response.types.ts -> AIReceptionistRequest, AIReceptionistResponse, AIResponseSource
    │   ├── tool.types.ts             -> AIToolDefinition, AIToolCall, AIToolResult, AITool
    │   └── index.ts
    ├── tools/
    │   ├── registry.ts               -> Centralized AIToolRegistry singleton
    │   ├── router.ts                 -> Secure AIToolRouter with Zod validation
    │   ├── customer.tools.ts         -> search_customer, get_customer
    │   ├── service.tools.ts          -> get_services, get_service_details
    │   ├── staff.tools.ts            -> get_staff, get_staff_details
    │   ├── business.tools.ts         -> get_business_info
    │   ├── appointment.tools.ts      -> check_availability, get_appointments, create_appointment, cancel_appointment
    │   └── index.ts
    ├── context/
    │   ├── context-builder.ts        -> Lightweight AIContextBuilder
    │   └── index.ts
    ├── model/
    │   ├── model.types.ts            -> AIModel, AIModelRequest, AIModelResponse, AIModelStreamChunk
    │   ├── model-validator.ts        -> Request bounding and defensive sanitization
    │   ├── ollama-errors.ts          -> Typed Ollama error taxonomy
    │   ├── ollama-model-adapter.ts   -> Native fetch model adapter (streaming + non-streaming)
    │   └── index.ts
    ├── runtime/
    │   ├── ollama-runtime.service.ts -> Probing local Ollama service & model availability
    │   └── index.ts
    ├── routing/
    │   ├── intent-router.ts          -> FastIntentRouter regex & keyword heuristics
    │   └── index.ts
    ├── conversation/
    │   ├── conversation-session.types.ts -> BookingConversationStep, ConversationSessionData
    │   ├── session-store.interface.ts    -> IConversationSessionStore contract
    │   ├── in-memory-session-store.ts    -> InMemorySessionStore implementation with TTL
    │   ├── appointment-slot-finder.ts    -> Real PostgreSQL slot discovery
    │   ├── appointment-state-machine.ts  -> Multi-turn appointment booking state machine
    │   ├── parsers/                      -> ServiceMatcher, StaffMatcher, DateParser, TimeParser, ConfirmationParser
    │   └── index.ts
    ├── services/
    │   ├── ai-receptionist.service.ts-> AIReceptionistService dual-path orchestrator
    │   └── index.ts
    └── index.ts
```

---

## 4. Controlled AI Intents & Actions

### AI Intents (`AIIntent`)
- `GREETING`: Direct greetings ("Hello", "Good morning").
- `GOODBYE`: Sign-offs ("Goodbye", "Have a great day").
- `CUSTOMER_LOOKUP`: Identifying caller by name, phone, or account.
- `SERVICE_INFORMATION`: Inquiring about service offerings, pricing, or duration.
- `STAFF_INFORMATION`: Inquiring about practitioners, doctors, or specialists.
- `APPOINTMENT_AVAILABILITY`: Checking available calendar slots for a date/practitioner.
- `BOOK_APPOINTMENT`: Scheduling a new appointment.
- `VIEW_APPOINTMENTS`: Reviewing existing bookings.
- `CANCEL_APPOINTMENT`: Cancelling a booked appointment.
- `RESCHEDULE_APPOINTMENT`: Modifying an existing appointment time.
- `BUSINESS_INFORMATION`: Inquiring about business location, phone, or operating hours.
- `GENERAL_CONVERSATION`: Small talk or conversational turns.
- `UNKNOWN`: Fallback for unrecognized requests routed to Ollama.

### AI Actions (`AIAction`)
- `NONE`, `SEARCH_CUSTOMER`, `GET_CUSTOMER`, `GET_SERVICES`, `GET_SERVICE_DETAILS`, `GET_STAFF`, `GET_STAFF_DETAILS`, `CHECK_AVAILABILITY`, `CREATE_APPOINTMENT`, `GET_APPOINTMENTS`, `CANCEL_APPOINTMENT`, `RESCHEDULE_APPOINTMENT`, `GET_BUSINESS_INFO`.

---

## 5. Tool Registry & Tool Router

### `AIToolRegistry`
Maintains a type-safe registry of tools adhering to the `AITool` contract:
```typescript
export interface AITool<TInput = any, TResult = any> {
  readonly name: string;
  readonly description: string;
  readonly schema: ZodTypeAny;
  readonly definition: AIToolDefinition;
  execute(input: TInput, context: AIConversationContext): Promise<AIToolResult<TResult>>;
}
```

### `AIToolRouter`
Coordinates safe tool execution:
1. **Context Validation:** Asserts `businessId` and `sessionId` are present.
2. **Tool Lookup:** Verifies the requested tool is registered; rejects unknown tools with `UNKNOWN_TOOL`.
3. **Input Validation:** Parses inputs using the tool's Zod schema; rejects malformed inputs with `INVALID_INPUT`.
4. **Execution & Error Handling:** Executes the tool within the tenant context; catches errors (e.g., `ConflictError`) and returns structured JSON responses without exposing raw database exceptions or stack traces.

---

## 6. Registered AI Tool Catalog

| Tool Name | Purpose | Input Parameters | Output Data |
|---|---|---|---|
| `search_customer` | Find customer by name/phone | `{ query: string }` | `SafeCustomerSummary[]` |
| `get_customer` | Get customer profile by ID | `{ customerId: string }` | `SafeCustomerSummary` |
| `get_services` | List active service catalog | `{ isActiveOnly?: boolean }` | `SafeServiceSummary[]` |
| `get_service_details` | Service duration & details | `{ serviceId: string }` | `SafeServiceSummary` |
| `get_staff` | List active practitioners | `{ isActiveOnly?: boolean }` | `SafeStaffSummary[]` |
| `get_staff_details` | Specialist role & profile | `{ staffId: string }` | `SafeStaffSummary` |
| `get_business_info` | Company contact & hours | `{}` | `SafeBusinessSummary` |
| `check_availability` | Verify open time slot | `{ staffId, startTime, durationMinutes?, endTime? }` | `{ available: boolean, reason?: string }` |
| `get_appointments` | Query appointments | `{ staffId?, customerId?, status?, startDate?, endDate? }` | `SafeAppointmentSummary[]` |
| `create_appointment` | Schedule booking | `{ customerId, serviceId, staffId?, startTime, endTime?, notes? }` | `SafeAppointmentSummary` |
| `cancel_appointment` | Cancel booking | `{ appointmentId, reason? }` | `SafeAppointmentSummary` |

---

## 7. Multi-Tenant Security & Appointment Safety

### Multi-Tenant Data Isolation
Every tool query explicitly incorporates `businessId: context.businessId`. If a model requests a customer ID belonging to another business, the query returns `CUSTOMER_NOT_FOUND`. Cross-tenant querying is architecturally impossible.

### Customer Privacy Protection
AI tools return sanitized data transfer objects (`SafeCustomerSummary`, `SafeStaffSummary`). Password hashes, internal system flags, and sensitive billing credentials are never returned to the AI layer.

### Appointment Conflict Protection
The `create_appointment` tool utilizes PostgreSQL transactions and enforces the interval overlap condition:
$$\text{Existing.startTime} < \text{New.endTime} \quad \land \quad \text{Existing.endTime} > \text{New.startTime}$$
If an overlap occurs, the router catches `ConflictError` and returns `SCHEDULING_CONFLICT`, prompting the AI to suggest alternative time slots.

---

## 8. Low-Latency Strategy

In conversational voice applications, low end-to-end latency is critical. The platform achieves low latency through deliberate architectural decisions:

1. **Deterministic Fast Path:** Common questions bypass the LLM entirely, responding in $< 1$ ms.
2. **Deterministic Multi-Turn Booking:** Entire 6-turn booking conversations complete in $< 80$ ms total with zero LLM calls.
3. **Micro-Tool Execution:** Database queries execute against indexed PostgreSQL columns in $< 15$ ms.
4. **REST Gateway Efficiency:** API overhead is $< 3$ ms for validation and routing.
5. **Concise Spoken Responses:** Responses are formatted into brief, conversational sentences suitable for fast TTS synthesis.
6. **Targeted Context Injection:** System prompts inject minimal tenant identity metadata ($< 100$ tokens).
7. **Memory Keep-Alive:** Ollama models remain resident in RAM (`OLLAMA_KEEP_ALIVE=5m`) to avoid cold-start delays.

---

## 9. Local AI Runtime Layer (Ollama + `llama3.2:3b`)

The platform utilizes a 100% free, local AI inference runtime powered by **Ollama** running the compact **`llama3.2:3b`** model (2.0 GB):

- **Average Warm Latency:** **3.25 seconds**
- **CPU Throughput:** **12.49 tokens/second**
- Complete benchmark details: [`docs/OLLAMA_BENCHMARK.md`](docs/OLLAMA_BENCHMARK.md).
- Complete adapter details: [`docs/OLLAMA_ADAPTER.md`](docs/OLLAMA_ADAPTER.md).
- Complete orchestration details: [`docs/AI_ORCHESTRATION.md`](docs/AI_ORCHESTRATION.md).
- Complete conversation engine details: [`docs/APPOINTMENT_CONVERSATION_ENGINE.md`](docs/APPOINTMENT_CONVERSATION_ENGINE.md).
- Complete REST API details: [`docs/CONVERSATION_API.md`](docs/CONVERSATION_API.md).

---

## 10. Local Speech Technologies, Orchestration & Latency Analysis (whisper.cpp & Piper TTS)

Phases 6.2.1, 6.2.2, and 6.3 integrated speech-to-text (STT) and text-to-speech (TTS) engines with the core AI receptionist conversation engine:

- **Speech-to-Text:** `whisper.cpp` (`tiny.en`) — **~936 ms live transcription latency** (RTF: **0.466x**), **~77 MB RAM**.
- **Text-to-Speech:** `Piper TTS` (`en_US-lessac-medium`) — **~608 ms neural synthesis latency** (RTF: **0.212x**), **~60 MB RAM**.
- **Voice Orchestrator:** `VoiceConversationOrchestrator` coordinating STT, Text Normalization, Conversation State Machine, and Neural TTS with stage-by-stage timing instrumentation.
- **End-to-End Deterministic Latency:** **~1.44 – 1.55 seconds** (STT ~936ms + FastIntentRouter ~1.5ms + Piper TTS ~608ms).
- **Voice REST API:** `POST /api/ai/voice/conversation` and safe streaming `GET /api/ai/voice/audio/:audioId`.
- **Full Coexistence:** All 7 core services (Windows + Docker Postgres + Backend + Next.js + Ollama + Whisper + Piper) consume **~5.59 GB RAM** out of 8 GB.
- Complete voice technology evaluation details: [`docs/VOICE_TECHNOLOGY_EVALUATION.md`](docs/VOICE_TECHNOLOGY_EVALUATION.md).
- Complete speech pipeline integration details: [`docs/LOCAL_SPEECH_PIPELINE.md`](docs/LOCAL_SPEECH_PIPELINE.md).
- Complete voice latency benchmark & analysis: [`docs/VOICE_LATENCY_ANALYSIS.md`](docs/VOICE_LATENCY_ANALYSIS.md).

---

## 11. Real-Time Voice Transport & Session Management

Phase 7.1 established a modular, transport-independent layer decoupling client communication protocols from the core AI engine:

- **Transport Session Management:** `VoiceTransportSessionManager` binds transport sessions (`vtr_*`) to AI conversation sessions (`sess_*`), managing client connection state (`READY`, `PROCESSING_TURN`, `TERMINATED`) and 15-minute sliding TTL.
- **Audio Turn Transport:** `VoiceTurnTransportService` accepts multipart audio, Buffers, or Base64 payloads with strict MIME validation and path-traversal safety.
- **Ultra-Low Transport Overhead:** High-resolution instrumentation demonstrates only **4.5 ms – 6.0 ms** of transport layer overhead ($< 0.4\%$ of total latency).
- **Multi-Tenant Session Defense:** Strict rejection of cross-business session reuse (`403 SESSION_BUSINESS_MISMATCH`).
- Complete voice transport architecture details: [`docs/VOICE_TRANSPORT_ARCHITECTURE.md`](docs/VOICE_TRANSPORT_ARCHITECTURE.md).

---

## 12. Mobile Voice Client Interface & MediaRecorder Audio Capture

Phase 7.2.1 established the dedicated frontend mobile voice receptionist client (`/voice`):

- **Modular UI Hierarchy:** `VoiceReceptionist`, `VoiceStatus`, `VoiceActivityIndicator`, `VoiceControlButton`, `RecordingTimer`, `VoiceSessionInfo`.
- **Presentation State Hook (`useVoiceSession`):** Coordinates 8 client presentation states (`IDLE` -> `CONNECTING` -> `READY` -> `RECORDING` -> `PROCESSING` -> `PLAYING` -> `ENDED`).
- **Microphone & MediaRecorder (`useMediaRecorder`):** Requests `getUserMedia` audio permissions and captures audio turns dynamically matching browser codecs (`audio/webm`, `audio/ogg`, `audio/mp4`, `audio/wav`).
- **Push-to-Talk Interaction:** Touch-friendly tap-to-speak and tap-to-stop buttons with live recording timers and real-time latency telemetry.
- Complete mobile voice client architecture details: [`docs/MOBILE_VOICE_CLIENT.md`](docs/MOBILE_VOICE_CLIENT.md).

---

## 13. Live Mobile Voice Integration & Real Measured Latency Benchmark

Phase 7.2.2 verified the complete live end-to-end mobile voice integration across the local Wi-Fi network:

- **Local Network Discovery (`npm run network:info`):** Automated discovery tool determining laptop IPv4 LAN addresses and formatting accessible URLs for mobile devices (`http://<LAN_IP>:3000/voice`).
- **Dynamic CORS Policy:** Environment-driven and regex-assisted CORS authorization enabling mobile clients across any private RFC-1918 IPv4 subnet to communicate with the laptop backend engine.
- **Phonetic & Speech Transcript Normalization:** `TimeParser` and `FastIntentRouter` enhanced to handle speech-to-text nuances (e.g. `a.m.` / `p.m.` spacing, word-numbers `ten in the morning`, and STT transcription corrections).
- **Stage-by-Stage Latency Benchmark (Intel Core i5-1235U, 8 GB RAM, CPU Inference):**
  - **Deterministic Fast Path:** **~1.79 s** total roundtrip (STT: 901.8ms, Conv: 1.0ms, TTS: 884.7ms, Overhead: 5.1ms)
  - **Database Information Query:** **~3.06 s** total roundtrip (STT: 914.8ms, DB: 6.6ms, TTS: 2140.2ms, Overhead: 4.5ms)
  - **Multi-Turn Booking Confirmation:** **~3.00 s** total roundtrip (STT: 1073.0ms, DB: 70.4ms, TTS: 1858.2ms, Overhead: 4.1ms)
  - **Ollama LLM Fallback (`llama3.2:3b`):** **~14.09 s** total roundtrip (STT: 1112.6ms, LLM CPU: 10,521.4ms, TTS: 2455.0ms, Overhead: 3.6ms)
- Complete testing guide and firewall documentation: [`docs/MOBILE_VOICE_TESTING.md`](docs/MOBILE_VOICE_TESTING.md).



