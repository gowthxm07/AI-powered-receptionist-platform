# AI Conversation REST API Specification & Performance Instrumentation

This document defines the **Phase 5.5 AI Conversation REST API** (`POST /api/ai/conversation`) for the **AI-Powered Smart Receptionist Platform**. It details the transport interface, validation schemas, session lifecycle, multi-tenant security guardrails, high-resolution performance instrumentation, structured server-side logging, and error taxonomy.

---

## 1. Architectural Role & Overview

The Conversation API exposes the multi-turn AI receptionist orchestrator through a clean, transport-agnostic HTTP REST interface. It serves as the single unified dialogue gateway for:

1. **Frontend Dashboard Chat & Simulator**
2. **Voice Interface & Speech Pipeline (Whisper STT / Piper TTS)**
3. **Telephony & Phone-Call Ingestion**
4. **External Mobile / Web Client Integrations**

```text
 Client (Web Chat / Voice STT / Telephony)
                   │
                   ▼ [HTTP POST /api/ai/conversation]
         [ Express Route & Zod Validation ]
                   │
                   ▼
     [ AIConversationController ]
     ├── Business Tenant Verification (PostgreSQL)
     ├── Customer Foreign Key Scoping (PostgreSQL)
     ├── Session Resolution & Business Isolation (InMemorySessionStore)
     ├── High-Resolution Timing Start (performance.now())
     │             │
     │             ▼
     │   [ AIReceptionistService ]
     │   ├── Active Multi-Turn Booking (AppointmentStateMachine)
     │   ├── Fast Deterministic Paths (< 1ms)
     │   ├── Database Micro-Tools (< 15ms)
     │   └── Local Ollama Fallback (llama3.2:3b)
     │             │
     │             ▼
     ├── Safe Performance Logging ([Conversation API] latency telemetry)
     └── Structured Client Response (sessionId, response, source, latencyMs, metadata)
                   │
                   ▼
            HTTP 200 OK JSON
```

---

## 2. API Endpoint Specification

### Endpoint
`POST /api/ai/conversation`

### Headers
- `Content-Type: application/json`

---

## 3. Request Format & Validation

```json
{
  "sessionId": "sess_1788423942571_fb6a2e5f02350060",
  "businessId": "b0000001-0000-0000-0000-000000000001",
  "message": "I want to book an appointment",
  "context": {
    "customerId": "c0000001-0000-0000-0000-000000000001",
    "channel": "WEB",
    "metadata": {
      "callerZip": "94105"
    }
  }
}
```

### Field Definitions

| Field | Type | Required? | Constraints & Description |
|---|---|---|---|
| `sessionId` | `string` | Optional | Max 128 characters. If omitted, the API generates a unique session ID and returns it. If provided, continues the active session. |
| `businessId` | `string` (UUID) | **Required** | Must be a valid UUID referencing an active enterprise in PostgreSQL. |
| `message` | `string` | **Required** | Min 1 char (trimmed), Max 1000 chars. Empty or whitespace-only strings are rejected with HTTP 400. |
| `context.customerId` | `string` (UUID) | Optional | Must be a valid UUID and **must belong to `businessId`**. Cross-tenant customer IDs are rejected with HTTP 400. |
| `context.channel` | `string` (Enum) | Optional | One of `'WEB'`, `'VOICE'`, or `'PHONE'`. Defaults to `'WEB'`. |
| `context.metadata` | `object` | Optional | Arbitrary key-value dictionary for supplemental client/channel metadata. |

### Rationale for Message Length Limit (1000 characters)
In conversational voice and receptionist systems, spoken turns average 15–120 characters. A ceiling of 1000 characters accommodates complex business questions while defending against payload flooding, denial-of-service, and prompt injection attacks.

---

## 4. Response Format

### Success Response (HTTP 200 OK)

```json
{
  "success": true,
  "data": {
    "sessionId": "sess_1788423942587_0ddadf543cd55835",
    "response": "Got it, Comprehensive Oral Exam & Digital X-Rays (30 mins). Do you have a preferred specialist, or would anyone be fine?",
    "source": "deterministic",
    "action": "GET_STAFF",
    "intent": "BOOK_APPOINTMENT",
    "latencyMs": 2.72,
    "totalLatencyMs": 5.62,
    "metadata": {
      "conversationStep": "BOOKING_COLLECT_STAFF",
      "serviceName": "Comprehensive Oral Exam & Digital X-Rays",
      "staffName": null,
      "date": null,
      "time": null
    }
  }
}
```

### Response Field Definitions

| Field | Type | Description |
|---|---|---|
| `data.sessionId` | `string` | Unique session identifier for subsequent turns. |
| `data.response` | `string` | Natural language text answer from the AI receptionist. |
| `data.source` | `string` | Safe execution source: `'deterministic'`, `'tool'`, `'llm'`, or `'fallback'`. |
| `data.action` | `string` | Action performed (e.g. `'CREATE_APPOINTMENT'`, `'GET_SERVICES'`, `'NONE'`). |
| `data.intent` | `string` | Intent classified (e.g. `'BOOK_APPOINTMENT'`, `'GREETING'`). |
| `data.latencyMs` | `number` | Precise execution duration of the conversation engine in milliseconds. |
| `data.totalLatencyMs` | `number` | End-to-end API duration including validation and database queries in milliseconds. |
| `data.metadata.conversationStep` | `string` | Active booking step (`'IDLE'`, `'BOOKING_COLLECT_SERVICE'`, `'BOOKING_COLLECT_STAFF'`, `'BOOKING_COLLECT_DATE'`, `'BOOKING_SELECT_SLOT'`, `'BOOKING_CONFIRM'`, `'BOOKING_COMPLETE'`). |
| `data.metadata.serviceName` | `string \| null` | Currently resolved service catalog name. |
| `data.metadata.staffName` | `string \| null` | Currently resolved specialist name or `'Anyone'`. |
| `data.metadata.date` | `string \| null` | Currently resolved date (e.g. `'2026-09-04'`). |
| `data.metadata.time` | `string \| null` | Currently selected time label (e.g. `'10:00 AM'`). |

---

## 5. Session Lifecycle & Multi-Tenant Security

### 1. New Session Creation
When `sessionId` is omitted from the request:
1. The API generates a cryptographically secure session ID (`sess_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`).
2. An initial session entry is created in `InMemorySessionStore` with a 15-minute TTL (`DEFAULT_SESSION_TTL_MS = 15 * 60 * 1000`).
3. The generated `sessionId` is returned in `data.sessionId`.

### 2. Session Continuation
When `sessionId` is supplied:
1. The API retrieves the session from `InMemorySessionStore`.
2. The session's `expiresAt` timestamp is refreshed on every interaction.
3. Multi-turn booking attributes (service, staff, date, slot) persist seamlessly across turns.

### 3. Session Expiration (HTTP 410 Gone)
If a client supplies a `sessionId` that has expired past its 15-minute TTL:
- The store purges the entry and returns `null`.
- The API returns **HTTP 410 Gone** with `error.code = 'SESSION_EXPIRED'`.
- The system **never** silently reuses or crosses expired session IDs.

### 4. Cross-Tenant Session Isolation (HTTP 403 Forbidden)
If a client attempts to use a session ID created for **Business A** with a request targeting **Business B**:
- The controller compares `session.businessId !== request.businessId`.
- The request is rejected with **HTTP 403 Forbidden** (`error.code = 'SESSION_BUSINESS_MISMATCH'`).
- Zero conversational data or appointments leak across tenants.

### 5. Cross-Tenant Customer Validation (HTTP 400 Bad Request)
If a client supplies a `context.customerId` that belongs to **Business B** in a request targeting **Business A**:
- The controller queries PostgreSQL `Customer` table scoped by `businessId`.
- Rejects with **HTTP 400 Bad Request** (`error.code = 'INVALID_CUSTOMER_BUSINESS_MISMATCH'`).

---

## 6. High-Resolution Latency Instrumentation & Safe Logging

### High-Resolution Timing
Timing is measured using Node.js `performance.now()`:
- `engineLatencyMs`: Duration of intent classification, tool execution, state machine mutation, or LLM generation.
- `totalApiLatencyMs`: Total duration from HTTP request entry to JSON serialization.

### Safe Structured Performance Logging
The server logs a single structured performance line per request:
```text
[Conversation API] sessionId=sess_1788423942587_0ddadf543cd55835 businessId=b0000001-0000-0000-0000-000000000001 source=deterministic engineLatency=2.72ms totalApiLatency=5.62ms
```

**Privacy Guarantees:**
- Zero customer phone numbers logged.
- Zero raw message text or transcript content logged.
- Zero authentication credentials or database secrets logged.

---

## 7. Performance Expectations: Deterministic vs LLM

| Request Category | Engine Operation | Engine Latency (`latencyMs`) | Total API Latency (`totalLatencyMs`) |
|---|---|---|---|
| **Deterministic Fast Path** | Greeting / Goodbye | **0.04 ms – 0.50 ms** | **2.0 ms – 4.5 ms** |
| **Database Micro-Tools** | Services / Staff / Business Info | **2.0 ms – 5.5 ms** | **4.0 ms – 8.0 ms** |
| **Multi-Turn Booking Turns** | Slot Finder / State Machine | **2.0 ms – 18.0 ms** | **4.5 ms – 21.0 ms** |
| **Local Ollama LLM** | Open-ended reasoning (`llama3.2:3b`) | **2,200 ms – 3,500 ms** | **2,205 ms – 3,510 ms** |

---

## 8. Error Response Taxonomy

| HTTP Status | Error Code | Trigger Condition |
|---|---|---|
| **400 Bad Request** | `VALIDATION_ERROR` | Malformed JSON, missing `businessId`, non-UUID format, empty/whitespace message, or message exceeding 1000 chars. |
| **400 Bad Request** | `INVALID_CUSTOMER_BUSINESS_MISMATCH` | `customerId` provided does not belong to the requested `businessId`. |
| **403 Forbidden** | `SESSION_BUSINESS_MISMATCH` | `sessionId` belongs to a different business tenant. |
| **404 Not Found** | `BUSINESS_NOT_FOUND` | `businessId` UUID does not exist in PostgreSQL. |
| **410 Gone** | `SESSION_EXPIRED` | Provided `sessionId` has expired past its 15-minute TTL or does not exist. |
| **500 Internal Server Error** | `INTERNAL_SERVER_ERROR` | Unhandled exception (stack traces suppressed in production). |
