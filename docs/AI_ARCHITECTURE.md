# AI Receptionist Architecture & Tool Foundation

This document defines the **AI Receptionist Architecture** for the **AI-Powered Smart Receptionist Platform**. It details the model-agnostic layer, tool registry, tool router, conversation context, multi-tenant isolation, appointment conflict safety, low-latency design strategy, local Ollama runtime layer, model generation adapter, and orchestration routing subsystem.

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
7. **Dual-Path Orchestration:** Common inquiries (greetings, services, staff, business info) are resolved via fast deterministic rules ($< 1$ms) or database micro-tools ($< 15$ms) without invoking the LLM, preserving system responsiveness.

---

## 2. End-to-End Conceptual Flow Diagram

```text
                                Caller / User
                                      │
                                      ▼
                          [ Inbound Dialogue Stream ]
                           (Web Chat / Voice / Phone)
                                      │
                                      ▼
                        [ AI Context Builder ]
                     (Minimal tenant & session metadata)
                                      │
                                      ▼
                       [ AIReceptionistService ]
                                      │
                                      ▼
                            [ FastIntentRouter ]
                        (Regex & Keyword Heuristics)
                                      │
              ┌───────────────────────┴───────────────────────┐
              │                                               │
      [ Deterministic / Tool ]                        [ UNKNOWN Intent ]
              │                                               │
      ┌───────┴───────┐                                       ▼
      ▼               ▼                            [ Local Ollama Adapter ]
Deterministic   Database Tool                            (llama3.2:3b)
  Fast Path       Execution                                   │
 (GREETING/     (get_services/                                │
  GOODBYE)        get_staff)                                  │
      │               │                                       │
      ▼               ▼                                       │
   (< 1 ms)        (< 15 ms)                                  │
      │               │                                       │
      └───────────────┼───────────────────────────────────────┘
                      │
                      ▼
          [ AIReceptionistResponse ]
    (Text, Action, Intent, Source, Latency)
```

---

## 3. Modular AI Subsystem Structure

```text
backend/src/modules/ai/
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
2. **Micro-Tool Execution:** Database queries execute against indexed PostgreSQL columns in $< 15$ ms.
3. **Concise Spoken Responses:** Responses are formatted into brief, conversational sentences suitable for fast TTS synthesis.
4. **Targeted Context Injection:** System prompts inject minimal tenant identity metadata ($< 100$ tokens).
5. **Memory Keep-Alive:** Ollama models remain resident in RAM (`OLLAMA_KEEP_ALIVE=5m`) to avoid cold-start delays.

---

## 9. Local AI Runtime Layer (Ollama + `llama3.2:3b`)

The platform utilizes a 100% free, local AI inference runtime powered by **Ollama** running the compact **`llama3.2:3b`** model (2.0 GB):

- **Average Warm Latency:** **3.25 seconds**
- **CPU Throughput:** **12.49 tokens/second**
- Complete benchmark details: [`docs/OLLAMA_BENCHMARK.md`](docs/OLLAMA_BENCHMARK.md).
- Complete adapter details: [`docs/OLLAMA_ADAPTER.md`](docs/OLLAMA_ADAPTER.md).
- Complete orchestration details: [`docs/AI_ORCHESTRATION.md`](docs/AI_ORCHESTRATION.md).
