# AI Receptionist Web Conversation Console

This document specifies the architecture, frontend components, session lifecycle, multi-tenant switching behavior, technical telemetry, and verification procedures for the **Phase 6.1 AI Receptionist Web Conversation Console** in the **AI-Powered Smart Receptionist Platform**.

---

## 1. Architectural Overview & Design Goals

The AI Receptionist Web Conversation Console provides an intuitive, high-performance interface for interacting with the platform's multi-tenant AI receptionist in real time. It communicates directly with the unified REST dialogue gateway (`POST /api/ai/conversation`) and interfaces with the underlying PostgreSQL database and deterministic booking state machine.

```text
  ┌────────────────────────────────────────────────────────────────────────┐
  │                    Browser Client (Next.js 14 / React)                │
  │                                                                        │
  │  [ BusinessContext ]              [ ConversationConsole ]              │
  │  ├── selectedBusiness             ├── Chat Message List (Auto-Scroll)  │
  │  └── selectBusiness(id)           ├── ConversationInput (Enter/Shift)  │
  │                                   ├── TypingIndicator (Pulsing state)  │
  │                                   └── MetadataPanel (Telemetry)        │
  └──────────────────────────────────────┬─────────────────────────────────┘
                                         │
                                         ▼ [HTTP POST /api/ai/conversation]
                                         │ (Single request per turn, with sessionId)
  ┌──────────────────────────────────────┴─────────────────────────────────┐
  │                   Express Backend API Gateway (Port 5000)              │
  │                                                                        │
  │  [ AIConversationController ]                                          │
  │  ├── Zod Input Validation & UUID Checks                                │
  │  ├── Tenant & Customer Scoping                                         │
  │  ├── High-Resolution Timing (performance.now())                        │
  │  └── Safe Structured Performance Logging                               │
  │                                                                        │
  │  [ AIReceptionistService Orchestrator ]                                │
  │  ├── Multi-Turn Booking (AppointmentStateMachine) ──> PostgreSQL DB   │
  │  ├── Fast Deterministic Paths (< 1ms)                                  │
  │  ├── Database Micro-Tools (< 15ms)                                     │
  │  └── Local Ollama Fallback (llama3.2:3b, CPU)                          │
  └────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Component Hierarchy

```text
frontend/src/
├── app/
│   ├── dashboard/ai-receptionist/page.tsx -> Primary dashboard route
│   └── receptionist/page.tsx              -> Direct protected route
├── components/
│   └── receptionist/
│       ├── ConversationConsole.tsx        -> Master state orchestrator & chat view
│       ├── ConversationMessage.tsx        -> Message bubble with source & latency badges
│       ├── ConversationInput.tsx          -> Textarea, char counter (1000 max), keybindings
│       ├── TypingIndicator.tsx            -> Animated 3-dot pulsing indicator
│       ├── ConversationMetadataPanel.tsx  -> Telemetry, session copy, demo prompts
│       └── index.ts                       -> Barrel export
├── context/
│   └── BusinessContext.tsx                -> Multi-tenant enterprise switcher
└── types/
    └── conversation.ts                    -> TypeScript API & chat data interfaces
```

---

## 3. Component Details & Responsibilities

### 1. `ConversationConsole.tsx`
- Manages the active message log (`messages`), `sessionId`, `isLoading`, and error states.
- Generates contextual welcome messages when a business is selected.
- Handles the `+ New Conversation` flow.
- Auto-scrolls smoothly to the bottom of the dialogue on each turn.
- Catches `SESSION_EXPIRED` (HTTP 410) and renders a user-friendly recovery prompt.

### 2. `ConversationMessage.tsx`
- Formats user and assistant message bubbles.
- Displays responsive source indicators:
  - ⚡ `Deterministic` (Emerald green badge)
  - 🔧 `DB Tool ([action])` (Blue badge)
  - 🧠 `Local LLM (llama3.2:3b)` (Purple badge)
  - 🛡️ `Safe Fallback` (Amber badge)
- Formats engine and total API latency chips (`< 1000ms` as `X.Xms`, `> 1000ms` as `X.XXs`).

### 3. `ConversationInput.tsx`
- Multi-line textarea that auto-resizes to content up to 140px.
- Keybindings: `Enter` sends message, `Shift + Enter` inserts new line.
- Enforces character limit: displays real-time counter (`0/1000`).
- Prevents duplicate submission by disabling input and send button while a request is in flight.

### 4. `ConversationMetadataPanel.tsx`
- Displays the currently selected business details (Name, Address, Phone).
- Shows Session ID with a 1-click clipboard copy utility and `ACTIVE` / `NEW` badges.
- Displays live telemetry:
  - **Classified Intent** (e.g. `BOOK_APPOINTMENT`, `GREETING`)
  - **Resolved Action** (e.g. `CREATE_APPOINTMENT`, `GET_SERVICES`)
  - **Booking Step** (e.g. `BOOKING_COLLECT_SERVICE`, `BOOKING_COLLECT_STAFF`, `BOOKING_SELECT_SLOT`, `BOOKING_CONFIRM`)
  - **Engine Latency** and **Total API Latency**
- Provides 1-click demonstration prompt chips for rapid demonstration during capstone reviews.

---

## 4. Session Lifecycle & Multi-Tenant Safety

### 1. New Session Initiation
- On the first message, the client sends `{ businessId, message }` **without** a `sessionId`.
- The backend creates the session in `InMemorySessionStore` with a 15-minute TTL and returns the newly generated `sessionId`.
- The frontend stores `sessionId` in local React state.

### 2. Session Continuation
- All subsequent messages pass `{ sessionId, businessId, message }`.
- The backend continues the deterministic state machine across all 6 turns without state loss.

### 3. Business Switching Safety
- When the user selects a different enterprise in the dashboard, `BusinessContext` triggers a state change.
- `ConversationConsole` immediately clears `sessionId`, message history, and metadata.
- Prevents cross-tenant session re-use or data leakage.

### 4. Session Expiration Handling
- If a user sends a message on a session older than 15 minutes, the backend responds with **HTTP 410 Gone** (`SESSION_EXPIRED`).
- The UI catches the 410 error and displays a recovery banner with a `"Start New Session"` button.

---

## 5. Performance & Latency Profile

The console displays genuine, backend-instrumented latency metrics measured with Node.js `performance.now()`:

| Operation | Engine Latency | Total API Latency | UI Status Indicator |
|---|---|---|---|
| **Deterministic Greeting / Sign-Off** | **0.04 ms – 0.50 ms** | **2.1 ms – 4.6 ms** | ⚡ `Deterministic` |
| **Catalog Query (Services / Staff / Info)** | **1.8 ms – 3.7 ms** | **4.2 ms – 6.6 ms** | 🔧 `PostgreSQL Tool Execution` |
| **Multi-Turn Slot Finder & State Transition** | **2.0 ms – 17.2 ms** | **4.3 ms – 20.2 ms** | ⚡ `Deterministic` / `DB Tool` |
| **Local Ollama Fallback (`llama3.2:3b`)** | **2.2 s – 3.5 s** | **2.2 s – 3.5 s** | 🧠 `Local LLM (llama3.2:3b)` |

---

## 6. End-to-End Multi-Turn Booking Walkthrough

Below is an exact transcript of a 6-turn appointment booking executed through the Web Console:

1. **User:** `"I want to book an appointment"`
   - **AI:** `"I would be happy to help you schedule an appointment at Lumina Dental Care! We offer the following services: Comprehensive Oral Exam & Digital X-Rays (30 mins), Laser Enamel Whitening & Brightening (60 mins), Ceramic Crown Preparation & Digital 3D Scan (90 mins), Pediatric Preventive Dental Evaluation (30 mins). Which service would you like to schedule?"`
   - *Metadata:* `Step: BOOKING_COLLECT_SERVICE` | `Source: deterministic` | `Latency: 0.17ms`
2. **User:** `"Comprehensive Oral Exam"`
   - **AI:** `"Got it, Comprehensive Oral Exam & Digital X-Rays (30 mins). Do you have a preferred specialist, or would anyone be fine?"`
   - *Metadata:* `Step: BOOKING_COLLECT_STAFF` | `Source: deterministic` | `Latency: 1.73ms`
3. **User:** `"Anyone"`
   - **AI:** `"No problem, we'll assign an available specialist. What date would you like to come in? (For example: 'tomorrow', 'Friday', or '2026-09-04')"`
   - *Metadata:* `Step: BOOKING_COLLECT_DATE` | `Source: deterministic` | `Latency: 1.63ms`
4. **User:** `"Tomorrow"`
   - **AI:** `"Here are the available openings for Comprehensive Oral Exam & Digital X-Rays on Friday, September 4, 2026: 1) 09:00 AM (Dr. Emily Chen) 2) 10:00 AM (Dr. Emily Chen) 3) 11:00 AM (Dr. Emily Chen) 4) 02:00 PM (Dr. Emily Chen). Which time works best for you?"`
   - *Metadata:* `Step: BOOKING_SELECT_SLOT` | `Source: deterministic` | `Latency: 4.70ms`
5. **User:** `"09:00 AM"`
   - **AI:** `"Let's confirm your booking: Business: Lumina Dental Care, Service: Comprehensive Oral Exam & Digital X-Rays, Specialist: Dr. Emily Chen, Date: Friday, September 4, 2026, Time: 09:00 AM - 09:30 AM. Shall I confirm this appointment?"`
   - *Metadata:* `Step: BOOKING_CONFIRM` | `Source: deterministic` | `Latency: 2.55ms`
6. **User:** `"Yes please"`
   - **AI:** `"Your appointment has been successfully booked! Here are your details: Appointment ID: 94da7fc5-0b85-4471-8935-347f235ce702, Business: Lumina Dental Care, Service: Comprehensive Oral Exam & Digital X-Rays, Specialist: Dr. Emily Chen, Date: Friday, September 4, 2026, Time: 09:00 AM - 09:30 AM. Is there anything else I can help you with today?"`
   - *Metadata:* `Step: IDLE` | `Source: tool` | `Action: CREATE_APPOINTMENT` | `Latency: 13.12ms` | **Persisted in PostgreSQL**

---

## 7. How to Test & Verify Locally

1. **Start Backend Server:**
   ```bash
   npm --prefix backend run dev
   ```
2. **Start Frontend Server:**
   ```bash
   npm --prefix frontend run dev
   ```
3. **Open Browser:**
   - Navigate to [`http://localhost:3000/dashboard/ai-receptionist`](http://localhost:3000/dashboard/ai-receptionist) or [`http://localhost:3000/receptionist`](http://localhost:3000/receptionist).
   - Log in using demo credentials (`sarah.jenkins@luminahealth.demo` / `DemoUser123!`).
   - Select an enterprise from the dropdown.
   - Click demo prompt chips or type your natural language inquiries.
