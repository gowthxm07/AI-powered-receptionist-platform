# Capstone Project Roadmap

## Project Vision: AI-Powered Smart Receptionist Platform
An end-to-end full-stack intelligent receptionist built exclusively using open-source, zero-cost technologies.

---

## 🎯 Phase Breakdown

### Phase 1: Project Foundation & Initial Full-Stack Setup (COMPLETED ✅)
- [x] Full-stack directory scaffolding (`frontend/`, `backend/`, `docs/`)
- [x] Express backend setup with TypeScript, CORS, Dotenv, and strict Error Handling
- [x] Next.js frontend setup with TypeScript and Tailwind CSS
- [x] Implementation of `GET /api/health` system diagnostic endpoint
- [x] Interactive frontend-to-backend status checker component
- [x] Initial polished UI shell with hero section and feature preview cards
- [x] Git repository initialization and progressive milestone commits
- [x] Complete project documentation (`README.md`, `ARCHITECTURE.md`, `ROADMAP.md`)

---

### Phase 2: Database Foundation & Core Data Modeling (COMPLETED ✅)
- [x] PostgreSQL relational database configuration with Docker Compose (`docker-compose.yml`)
- [x] Prisma ORM configuration with PostgreSQL provider and client generation
- [x] Generic, industry-agnostic domain schema:
  - `Business` (multi-tenant ready)
  - `Customer` (unique phone identification, business relation)
  - `Staff` (industry-agnostic team roster)
  - `Service` (bookable catalog items with duration)
  - `Appointment` (calendar scheduling structure & statuses)
  - `Conversation` & `ConversationMessage` (AI dialogue session preparation)
- [x] Reusable singleton Prisma client (`backend/src/lib/prisma.ts`)
- [x] Zod request validation middleware and schemas
- [x] CRUD REST APIs for Business, Customer, Staff, and Service entities
- [x] Database error handling middleware (Prisma P2002, P2025, P2003, Zod validation errors)
- [x] Comprehensive database & API documentation (`docs/DATABASE.md`)
- [x] Full PostgreSQL runtime verification with version-controlled migrations

---

### Phase 3.1: Authentication Backend Foundation (COMPLETED ✅)
- [x] `User` relational model and `UserRole` enum (`ADMIN`, `BUSINESS_OWNER`) in Prisma schema
- [x] `Business.ownerId` relationship linking business owners to business tenants
- [x] Version-controlled Prisma migration (`20260902170000_add_user_authentication`)
- [x] Password security using `bcryptjs` with salt hashing
- [x] JWT token generation, verification, and HTTP-only cookie management (`jsonwebtoken`, `cookie-parser`)
- [x] Authentication REST APIs:
  - `POST /api/auth/register` (Zod validated, unique email, safe response)
  - `POST /api/auth/login` (generic 401 on failure to prevent user enumeration)
  - `GET /api/auth/me` (protected profile inspection)
  - `POST /api/auth/logout` (cookie invalidation)
- [x] Authentication & Authorization middlewares (`authenticate`, `authorize(...roles)`)
- [x] Complete automated test suite covering registration, hashing, login, tokens, roles, and constraints
- [x] Documentation specification in `docs/AUTHENTICATION.md`

---

### Phase 3.2: Authentication Frontend & Protected Shell (COMPLETED ✅)
- [x] Centralized typed API client (`frontend/src/lib/api.ts`) with `credentials: "include"`
- [x] Global React authentication context (`AuthContext` + `AuthProvider`)
- [x] Next.js `/register` page with reactive validation, password visibility toggle, and error handling
- [x] Next.js `/login` page with reactive validation, password toggle, and error handling
- [x] Next.js `/dashboard` protected placeholder shell displaying verified user profile and session security details
- [x] `ProtectedRoute` guard preventing unauthorized access and content flashing
- [x] Authenticated user redirection logic from auth pages to `/dashboard`
- [x] Working `logout` flow with cookie clearance and state synchronization
- [x] Auth-aware navigation header with dynamic buttons

---

### Phase 3.2.1: API Authorization & Business Data Isolation (COMPLETED ✅)
- [x] Route-level protection with `authenticate` across all domain APIs (`/api/businesses`, `/api/customers`, `/api/staff`, `/api/services`)
- [x] Reusable server-side ownership engine (`OwnershipService`)
- [x] Server-derived user identity from verified JWT signatures (never trusting client-provided user IDs)
- [x] Strict tenant ownership verification on all resource creation, update, and deletion actions
- [x] Automated multi-tenant cross-business security test suite (31 tests) proving zero data leakage between User A and User B
- [x] 82 total master tests verified with 100% pass rate

---

### Phase 3.3: Professional Multi-Tenant Dashboard Foundation (COMPLETED ✅)
- [x] SaaS-style dashboard layout with responsive desktop sidebar and mobile navigation drawer
- [x] Global `BusinessContext` with multi-tenant switching and local preference recall
- [x] Real-time statistics cards powered by backend domain APIs (Customers, Staff, Services)
- [x] Quick operations shortcut grid for business workflows
- [x] AI Receptionist status preview card highlighting local open-source technology stack
- [x] Sub-second AI latency telemetry section reserved for Whisper, Ollama, and Piper
- [x] Honest recent activity placeholder reserving space for live AI call events
- [x] System and database runtime diagnostic indicators
- [x] Future sub-module placeholder route shells
- [x] Complete dashboard architecture documentation (`docs/DASHBOARD.md`)

---

### Phase 3.4: Core Management Frontend (COMPLETED ✅)
- [x] Real-data Customer Management (`/dashboard/customers`) with search, create modal, edit modal, delete dialog, and validation
- [x] Real-data Staff Specialist Management (`/dashboard/staff`) with role configuration, active status toggle, search, and delete dialog
- [x] Real-data Bookable Services Catalog (`/dashboard/services`) with duration minute setting, catalog toggle, search, and delete dialog
- [x] Reusable modal dialogs (`CustomerModal`, `StaffModal`, `ServiceModal`), confirmations (`ConfirmDialog`), and feedback notifications (`Toast`)
- [x] Multi-tenant business context integration with stale data clearing and race condition prevention
- [x] Desktop table views and mobile-optimized card layouts

---

### Phase 3.5: Appointment Management and Scheduling (COMPLETED ✅)
- [x] Complete appointment scheduling relational data model with composite querying indexes
- [x] Interval overlap conflict detection algorithm (`existing.startTime < new.endTime AND existing.endTime > new.startTime`)
- [x] Clean back-to-back appointment support without false-positive collisions
- [x] Soft cancellation lifecycle (`status: CANCELLED`) releasing time slots while preserving historical dialogue records
- [x] Lightweight availability check API (`GET /api/appointments/availability`) for interactive UI indicators and future AI tool calling
- [x] Strict cross-business resource validation preventing cross-tenant customer, staff, or service misuse
- [x] Interactive booking and rescheduling dashboard UI (`/dashboard/appointments`) with status and specialist filters
- [x] Comprehensive backend integration test suite (93 total master tests passing)
- [x] Complete scheduling architecture documentation (`docs/APPOINTMENTS.md`)

---

### Phase 4: Demo Data and Database Seeding (COMPLETED ✅)
- [x] 143 meaningful records populated deterministically into PostgreSQL
- [x] Multi-tenant demonstration scenario with 3 demo users and 4 distinct enterprises
- [x] Multi-business ownership demonstration (User 1 owns Lumina Dental & Radiance Dermatology)
- [x] 16 realistic staff specialists and 20 catalog services with accurate durations
- [x] 56 unique customer profiles with unique telephone identifiers
- [x] 44 conflict-free appointments distributed across Today, Past (Completed/Cancelled), and Future (Upcoming)
- [x] Salted Bcrypt password hashing across all demo user accounts (zero plaintext passwords)
- [x] Idempotent Prisma seed architecture (`npm run db:seed`, `npm run db:reset-demo`)
- [x] Automated database verification script and test runner (`npm run db:verify-demo`)
- [x] Comprehensive demonstration documentation (`docs/DEMO_DATA.md`)

---

### Phase 5.1: AI Receptionist Architecture & Tool Foundation (COMPLETED ✅)
- [x] Dedicated AI domain types (`AIConversationContext`, `AIIntent`, `AIAction`, `AIToolDefinition`, `AIToolCall`, `AIToolResult`)
- [x] Centralized `AIToolRegistry` for discovering and registering structured tools
- [x] Secure `AIToolRouter` with Zod input schema validation and error protection
- [x] Controlled Customer Tools (`search_customer`, `get_customer`)
- [x] Controlled Service Tools (`get_services`, `get_service_details`)
- [x] Controlled Staff Tools (`get_staff`, `get_staff_details`)
- [x] Controlled Business Information Tool (`get_business_info`)
- [x] Controlled Appointment Tools (`check_availability`, `get_appointments`, `create_appointment`, `cancel_appointment`)
- [x] Transactional appointment conflict detection preservation through tool calls
- [x] Lightweight `AIContextBuilder` enforcing low-latency minimal context injection
- [x] Complete automated test suite verifying tool security, validation, and multi-tenant isolation
- [x] Complete architectural specification (`docs/AI_ARCHITECTURE.md`)

---

### Phase 5.2.1: Ollama Runtime & Performance Benchmark (COMPLETED ✅)
- [x] Ollama v0.33.2 runtime integration and probe utility (`OllamaRuntimeService`)
- [x] `llama3.2:3b` model download and local verification
- [x] Typed environment configuration (`OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `OLLAMA_TIMEOUT_MS`)
- [x] High-precision benchmark suite (`npm run benchmark:ollama`)
- [x] Real measured CPU inference performance benchmarks (3.25s avg latency, 12.5 tokens/sec)
- [x] Complete performance report in `docs/OLLAMA_BENCHMARK.md`

---

### Phase 5.2.2: Ollama Model Adapter & Local Generation (COMPLETED ✅)
- [x] Core AI Model interface abstraction (`AIModel`, `AIModelRequest`, `AIModelResponse`, `AIModelStreamChunk`)
- [x] `OllamaModelAdapter` implementation using native `fetch` over `/api/chat`
- [x] Non-streaming generation (`generate()`) with latency and token throughput calculation
- [x] Progressive streaming generation (`generateStream()`) via `AsyncIterable`
- [x] Request timeout and cancellation support via `AbortController` and `AbortSignal`
- [x] Defensive context sanitization and bounding (`ModelValidator`)
- [x] Memory keep-alive configuration (`OLLAMA_KEEP_ALIVE=5m`)
- [x] Explicit model pre-warm utility (`npm run ai:warmup`)
- [x] Comprehensive unit and mocked error tests (100% offline runnable)
- [x] Complete adapter specification in `docs/OLLAMA_ADAPTER.md`

---

### Phase 5.3: AI Receptionist Orchestration & Tool Routing (COMPLETED ✅)
- [x] Dual-path AI Receptionist Orchestrator (`AIReceptionistService`)
- [x] Fast deterministic regex & keyword heuristics classifier (`FastIntentRouter`)
- [x] Sub-millisecond deterministic responses for greetings and goodbyes ($< 1$ ms)
- [x] Fast database micro-tool integration for services, staff, business info ($< 15$ ms)
- [x] Concise guided prompt flows for appointment booking, availability, and cancellation
- [x] Safe local Ollama fallback (`llama3.2:3b`) for open-ended questions
- [x] Zero-crash offline failure resilience
- [x] Live multi-turn demonstration script (`npm run ai:orchestrate`)
- [x] Complete orchestration documentation (`docs/AI_ORCHESTRATION.md`)

---

### Phase 5.4: Multi-Turn Appointment Conversation Engine (COMPLETED ✅)
- [x] Deterministic booking state machine (`AppointmentStateMachine`)
- [x] In-memory session store with TTL expiration (`InMemorySessionStore`)
- [x] Real database slot discovery from PostgreSQL records (`AppointmentSlotFinder`)
- [x] Heuristic parsers: `ServiceMatcher`, `StaffMatcher`, `DateParser`, `TimeParser`, `ConfirmationParser`
- [x] Mid-flow informational question interruption handling
- [x] Zero-LLM booking turns ($< 80$ms total dialogue execution)
- [x] Comprehensive multi-turn test suite with DB integration verification
- [x] Complete conversation engine documentation (`docs/APPOINTMENT_CONVERSATION_ENGINE.md`)

---

### Phase 5.5: Conversation API & Performance Instrumentation (COMPLETED ✅)
- [x] Unified REST dialogue endpoint (`POST /api/ai/conversation`)
- [x] Strict multi-tenant session and customer isolation verification
- [x] Session lifecycle management: new session generation, continuation, and 15-minute expiration detection (HTTP 410)
- [x] High-resolution Node.js `performance.now()` latency telemetry (`latencyMs`, `totalLatencyMs`)
- [x] Safe structured performance logging (zero sensitive data or phone numbers logged)
- [x] 16 automated master test suites verified
- [x] Complete REST API specification (`docs/CONVERSATION_API.md`)

---

### Phase 6.1: AI Receptionist Web Conversation Console (COMPLETED ✅)
- [x] Dedicated conversational dashboard route (`/dashboard/ai-receptionist` and `/receptionist`)
- [x] Multi-tenant business selector integration with safe session reset
- [x] Conversational chat interface with auto-scroll and lightweight typing indicator
- [x] Session ID persistence across multi-turn booking flows
- [x] Live technical telemetry panel (Intent, Action, Booking Step, Source, Latency)
- [x] Anti-duplicate submission protection & keyboard shortcuts (`Enter` to send, `Shift+Enter` for newline)
- [x] Error handling with session expiration recovery (`SESSION_EXPIRED` 410 handler)
- [x] Complete web console documentation (`docs/AI_RECEPTIONIST_WEB_CONSOLE.md`)

---

### Phase 6.2.1: Local Speech Technology Benchmark & Evaluation (COMPLETED ✅)
- [x] Local CPU Speech-to-Text evaluation (`whisper.cpp` `tiny.en` vs `base.en`)
- [x] Local CPU Text-to-Speech evaluation (`Piper TTS` `lessac-medium` vs Windows SAPI)
- [x] Reproducible benchmark suites (`benchmark:stt`, `benchmark:tts`, `benchmark:speech`)
- [x] 8 GB RAM memory budget coexistence analysis (< 5.6 GB combined active load)
- [x] End-to-end voice latency budget determination (~1.41s deterministic / ~4.33s LLM fallback)
- [x] Safe runtime detection and non-crashing fallbacks (`SpeechDetectorService`)
- [x] Comprehensive evaluation documentation (`docs/VOICE_TECHNOLOGY_EVALUATION.md`)

---

### Phase 6.2.2: Local Speech Runtime Integration (COMPLETED ✅)
- [x] Asynchronous `WhisperCppProvider` STT with WAV validation and banner stripping
- [x] Asynchronous `PiperProvider` neural TTS with length limits and unique output paths
- [x] Directory-traversal-safe `AudioStorageService` with TTL audio cleanup
- [x] Unified `SpeechPipelineService` (Audio -> STT -> AI Receptionist -> TTS -> Audio)
- [x] REST endpoints: `POST /api/ai/voice/conversation`, `GET /api/ai/voice/audio/:audioId`, `GET /api/ai/voice/status`
- [x] Session preservation, deterministic fast paths, and multi-tenant security across voice turns
- [x] Live reproducible demonstration script (`npm run demo:voice`)
- [x] 18 master test suites passing
### Phase 6.3: Interactive Real-Time Voice Conversation Integration & Latency Optimization (COMPLETED ✅)
- [x] Dedicated `VoiceConversationOrchestrator` coordinating STT -> Text Validation -> Engine -> Voice Normalization -> Neural TTS -> Audio Storage
- [x] High-resolution stage-by-stage latency instrumentation (`audioInputProcessingMs`, `sttLatencyMs`, `conversationLatencyMs`, `ttsLatencyMs`, `totalPipelineLatencyMs`)
- [x] Multi-turn voice session continuity, booking state preservation, and mid-flow informational interruptions handling
- [x] Real measured 4-scenario latency benchmark on Intel Core i5-1235U CPU (`npm run benchmark:voice`)
- [x] Live multi-turn voice conversation demonstration script (`npm run demo:voice-conversation`)
- [x] 19 automated test suites passing with 100% success rate
- [x] Comprehensive technical documentation & latency analysis (`docs/VOICE_LATENCY_ANALYSIS.md`)

---

### Phase 7.1: Real-Time Voice Transport & Streaming Foundation (COMPLETED ✅)
- [x] Transport-independent voice architecture abstraction (`IVoiceTransportSession`, `VoiceTurnTransportResult`, signaling messages)
- [x] Dedicated `VoiceTransportSessionManager` managing transport connection lifecycles and mapping to AI conversation sessions
- [x] Low-latency turn-based audio transport service (`VoiceTurnTransportService`) supporting multipart audio, Buffers, and Base64
- [x] Real-time voice transport API endpoints: `POST /session`, `POST /turn`, `GET /session/:id`, `DELETE /session/:id`
- [x] Ultra-low transport overhead measured at **4.5 ms – 6.0 ms** (far below 50 ms budget)
- [x] Comprehensive multi-tenant session isolation and cross-business security defenses (`403 SESSION_BUSINESS_MISMATCH`)
- [x] Live reproducible demonstration script (`npm run demo:voice-transport`)
- [x] Real measured performance benchmark comparing direct pipeline vs. transport layer (`npm run benchmark:voice-transport`)
- [x] 20 master test suites passing with 100% success rate
- [x] Comprehensive technical documentation (`docs/VOICE_TRANSPORT_ARCHITECTURE.md`)

---

### Phase 7.2: Mobile Web Voice Interface & Real-Time Client (Upcoming ⏳)
- [ ] Responsive mobile voice receptionist interface
- [ ] Browser MediaRecorder voice capture and turn streaming
- [ ] Real-time audio playback and response visualization
- [ ] Mobile-to-laptop local network connectivity

---

### Phase 7.3: Admin Dashboard & Unified Operations (Upcoming ⏳)
- [ ] Analytics dashboard for receptionist calls, booking rates, and conversation sentiment
- [ ] Real-time call monitor and interactive chat simulator for testing
- [ ] Admin controls to update business knowledge docs and AI persona guidelines

---

### Phase 8: Testing, Hardening & Capstone Presentation (Upcoming ⏳)
- [ ] End-to-end voice and text conversational test suite
- [ ] Final security review, performance optimizations, and demonstration walkthrough
