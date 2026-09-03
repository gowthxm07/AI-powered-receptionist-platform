# AI-Powered Smart Receptionist Platform

> **"Intelligent conversations. Smarter appointments."**

An autonomous, full-stack AI-integrated receptionist platform designed to streamline front-desk operations, automate appointment bookings, resolve caller inquiries, and manage customer records using 100% free and open-source local AI, database, and authentication technologies.

---

## 📌 Current Development Status

```
Current Milestone: PHASE 7.2.2 — Live End-to-End Mobile Voice Integration & Latency Verification
Status: Completed
```

- **Phase 1 (Foundation):** Next.js UI shell, Express API, TypeScript setup, Health check API, progressive Git history.
- **Phase 2 (Database & Data Modeling):** PostgreSQL local containerization via Docker Compose, Prisma ORM schema & client generation, Zod request validation, and core REST APIs for Businesses, Customers, Staff, and Services.
- **Phase 3.1 (Authentication Backend):** Secure JWT authentication with HTTP-only cookies, Bcrypt password hashing, User registration & login, `/api/auth/me`, and role-based authorization middleware.
- **Phase 3.2 (Authentication Frontend):** React `AuthContext` state management, typed API client with `credentials: "include"`, `/login` and `/register` responsive forms with validation and password toggles, protected `/dashboard` shell, and automatic redirection flows.
- **Phase 3.2.1 (Authorization & Data Isolation):** Complete multi-tenant business data isolation, route protection across all domain APIs, server-enforced `OwnershipService` rules preventing cross-business data leakage, and rigorous security integration test suites.
- **Phase 3.3 (Professional Multi-Tenant Dashboard):** Real-data business dashboard overview with business selector, dynamic stats calculation (customers, staff, services, appointments), quick operations shortcuts, AI receptionist and latency telemetry cards, recent activity placeholder, and responsive sidebar navigation.
- **Phase 3.4 (Core Management Frontend):** Complete database-backed frontend management modules for Customers (`/dashboard/customers`), Staff specialists (`/dashboard/staff`), and Services catalog (`/dashboard/services`).
- **Phase 3.5 (Appointment Management & Scheduling):** Complete appointment scheduling engine with interval overlap conflict detection, dynamic catalog service duration calculation, availability check API (`/api/appointments/availability`), multi-tenant cross-resource validation, and interactive frontend booking dashboard (`/dashboard/appointments`).
- **Phase 4 (Demo Data & Database Seeding):** 143 meaningful records populated into PostgreSQL across 3 demo users, 4 multi-tenant businesses, 16 staff specialists, 20 catalog services, 56 customers, and 44 conflict-free appointments (Today, Past, Future) with automated verification.
- **Phase 5.1 (AI Receptionist Architecture & Tool Foundation):** Model-agnostic AI subsystem (`modules/ai`), centralized `AIToolRegistry`, secure `AIToolRouter` with Zod validation, lightweight `AIContextBuilder`, and 11 controlled business tools across Customers, Services, Staff, Appointments, and Business Info with strict multi-tenant isolation and conflict protection.
- **Phase 5.2.1 (Ollama Local Runtime & Performance Benchmark):** Ollama v0.33.2 runtime integration, `llama3.2:3b` model verification, typed configuration, automated `benchmark:ollama` performance suite, and real measured CPU inference benchmarks (3.25s avg latency, 12.5 tokens/sec).
- **Phase 5.2.2 (Ollama Model Adapter & Local Generation Layer):** `AIModel` abstraction, `OllamaModelAdapter` with native fetch, progressive text chunk streaming (`AsyncIterable`), timeout and `AbortController` cancellation, defensive context limits (`ModelValidator`), keep-alive RAM management, and explicit model warm-up (`npm run ai:warmup`).
- **Phase 5.3 (AI Receptionist Orchestration & Tool Routing):** Dual-path orchestration engine (`AIReceptionistService`), sub-millisecond deterministic intent classifier (`FastIntentRouter`), direct database tool integration for services/staff/business info ($< 15$ms), graceful Ollama fallback for open questions, and zero-crash offline resilience.
- **Phase 5.4 (Multi-Turn Appointment Conversation Engine):** Full multi-turn deterministic booking state machine (`AppointmentStateMachine`), in-memory session management with TTL expiration (`InMemorySessionStore`), real database slot discovery (`AppointmentSlotFinder`), intelligent service/staff/date/time heuristics, and 100% zero-LLM multi-turn booking execution ($< 80$ms total dialogue latency).
- **Phase 5.5 (Conversation REST API & Performance Instrumentation):** Production-grade `POST /api/ai/conversation` gateway, strict multi-tenant session and customer isolation, high-resolution `performance.now()` latency telemetry, safe structured server logging, and 16 automated test suites.
- **Phase 6.1 (AI Receptionist Web Conversation Console):** Real-time web chat console (`/dashboard/ai-receptionist` and `/receptionist`), session preservation across turns, multi-tenant enterprise switcher integration, live technical telemetry panel (Intent, Action, Step, Source, Latency), duplicate request prevention, auto-scroll, and demonstration chips.
- **Phase 6.2.1 (Local Speech Technology Benchmark & Evaluation):** Complete CPU speech evaluation of `whisper.cpp` (`tiny.en` vs `base.en`) and `Piper TTS` (`lessac-medium`) vs Windows SAPI, measuring latency (STT: 989ms, TTS: 764ms), RTF (STT: 0.466x, TTS: 0.212x), memory budget (< 5.6 GB combined in 8 GB RAM), and end-to-end voice latency budgets.
- **Phase 6.2.2 (Local Speech Runtime Integration):** Native asynchronous `whisper.cpp` STT and `Piper` neural TTS providers, path-traversal-safe `AudioStorageService`, end-to-end `SpeechPipelineService` (Audio -> STT -> AI Engine -> TTS -> Audio), `POST /api/ai/voice/conversation` and `GET /api/ai/voice/audio/:audioId` endpoints, and live reproducible voice demo script (`npm run demo:voice`).
- **Phase 6.3 (Interactive Real-Time Voice Conversation & Latency Optimization):** Unified `VoiceConversationOrchestrator`, stage-by-stage latency instrumentation (`audioInputProcessingMs`, `sttLatencyMs`, `conversationLatencyMs`, `ttsLatencyMs`, `totalPipelineLatencyMs`), multi-turn session continuity, booking state preservation during mid-flow inquiries, real 4-scenario benchmark suite (`npm run benchmark:voice`), and interactive voice demo (`npm run demo:voice-conversation`).
- **Phase 7.1 (Real-Time Voice Transport & Streaming Foundation):** Modular transport abstraction (`IVoiceTransportSession`, `VoiceTurnTransportResult`), dedicated `VoiceTransportSessionManager` mapping transport sessions to AI conversation sessions, turn-based audio transport service (`VoiceTurnTransportService`), ultra-low measured transport overhead (**4.5 ms – 6.0 ms**), `POST /api/ai/voice/transport/*` API endpoints, live demo (`npm run demo:voice-transport`), and transport benchmark (`npm run benchmark:voice-transport`).
- **Phase 7.2.1 (Mobile Voice Client Interface Foundation):** Dedicated mobile-responsive voice receptionist route (`/voice`), modular component architecture (`VoiceReceptionist`, `VoiceStatus`, `VoiceActivityIndicator`, `VoiceControlButton`, `RecordingTimer`, `VoiceSessionInfo`), `useVoiceSession` & `useMediaRecorder` hooks, push-to-talk audio turn capture, dynamic MIME negotiation, and real-time latency telemetry.
- **Phase 7.2.2 (Live End-to-End Mobile Voice Integration & Latency Verification):** Local network discovery tool (`npm run network:info`), dynamic development CORS origin strategy supporting all private LAN subnets and host IP addresses, live mobile verification suite (`npm run verify:mobile-voice`) testing greetings, queries, known/unknown multi-turn bookings, and Ollama fallback, speech transcript normalization, and comprehensive testing documentation.

---

## 🤖 Local AI & Speech Runtime Performance

The platform runs local AI inference and speech processing on standard CPU hardware without paid cloud APIs, subscriptions, or GPU requirements.

| Capability | Specification / Measured Metric |
|---|---|
| **Model** | `llama3.2:3b` (2.0 GB disk / RAM footprint) |
| **Inference Engine** | Ollama v0.33.2 (Local loopback `http://127.0.0.1:11434`) |
| **Speech-to-Text (STT)** | **`whisper.cpp (tiny.en)`** — **~901 – 950 ms live latency** (RTF: **0.466x**, ~77 MB RAM) |
| **Text-to-Speech (TTS)** | **`Piper TTS (lessac-medium)`** — **~600 – 885 ms live latency** (RTF: **0.212x**, ~60 MB RAM) |
| **Voice Transport Overhead** | **4.1 ms – 5.1 ms** (Target $< 50$ ms, $\sim 0.3\%$ of total latency) |
| **Transport Session Setup** | **~3.88 ms** |
| **Deterministic Voice Turn Roundtrip** | **~1.79 seconds total** (STT ~901ms + Fast Router ~1.0ms + Piper TTS ~885ms) |
| **Database Tool Voice Roundtrip** | **~3.06 seconds total** (STT ~915ms + DB Query ~6.6ms + Piper TTS ~2140ms) |
| **Multi-Turn Booking Confirmation** | **~3.00 seconds total** (STT ~1073ms + DB Execution ~70.4ms + Piper TTS ~1858ms) |
| **LLM Fallback Voice Roundtrip** | **~14.09 seconds total** (STT ~1112ms + Ollama CPU ~10,521ms + Piper TTS ~2455ms) |
| **Mobile Voice Client Route** | **`/voice` (Touch-Friendly Responsive Interface)** |
| **Local Network Discovery** | **`npm run network:info`** (Auto-detects host IPv4 & formats URLs) |
| **End-to-End Verification Suite** | **`npm run verify:mobile-voice`** (Live 5-scenario pipeline verification) |
| **Combined 8GB RAM Coexistence** | **~5.59 GB Total Load** (~70% of 8 GB RAM, 2.6 GB headroom) |
| **Full Architecture & Latency Analysis** | [`docs/MOBILE_VOICE_TESTING.md`](docs/MOBILE_VOICE_TESTING.md) & [`docs/MOBILE_VOICE_CLIENT.md`](docs/MOBILE_VOICE_CLIENT.md) |

---

## 🔑 Demo Login Credentials (Development Only)

> [!NOTE]
> Use the demo accounts below to test multi-tenant dashboard switching and appointment management.

| Demo Account | Email | Password | Owned Enterprises |
|---|---|---|---|
| **Dr. Sarah Jenkins** | `sarah.jenkins@luminahealth.demo` | `DemoUser123!` | 1. **Lumina Dental Care**<br>2. **Radiance Dermatology & Aesthetics** |
| **Marcus Vance** | `marcus.vance@apexadvisory.demo` | `DemoUser123!` | 3. **Apex Strategy & Financial Advisory** |
| **Elena Rostova** | `elena.rostova@zenithsalon.demo` | `DemoUser123!` | 4. **Zenith Luxury Hair & Spa Studio** |

---

## 🛠 Current Tech Stack

### Frontend
- **Framework:** [Next.js](https://nextjs.org/) (React 18, App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **State & Context:** React Context API (`AuthContext`, `BusinessContext`)
- **API Client:** Native `fetch` wrapper with HTTP-only cookie support (`lib/api.ts`)
- **AI Receptionist Console:** `ConversationConsole`, `ConversationMessage`, `ConversationInput`, `TypingIndicator`, `ConversationMetadataPanel`
- **Management UI:** `AppointmentModal`, `AppointmentTable`, `AppointmentFilters`, `CustomerModal`, `StaffModal`, `ServiceModal`, `ConfirmDialog`, `Toast`

### Backend
- **Runtime:** [Node.js](https://nodejs.org/)
- **Framework:** [Express](https://expressjs.com/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Database Engine:** [PostgreSQL](https://www.postgresql.org/) (Local / Docker Compose)
- **ORM:** [Prisma ORM](https://www.prisma.io/)
- **Authentication & Security:** `jsonwebtoken`, `bcryptjs`, `cookie-parser` (HTTP-only cookies), `OwnershipService`
- **Validation:** [Zod](https://zod.dev/)
- **Conversation REST Gateway:** `AIConversationController`, `aiConversationRequestSchema`, `POST /api/ai/conversation`
- **AI Conversation Engine:** `AppointmentStateMachine`, `InMemorySessionStore`, `AppointmentSlotFinder`, `ServiceMatcher`, `StaffMatcher`, `DateParser`, `TimeParser`, `ConfirmationParser`
- **AI Orchestration:** `AIReceptionistService`, `FastIntentRouter`, `AIToolRegistry`, `AIToolRouter`, `AIContextBuilder`
- **Local AI Generation Layer:** `OllamaModelAdapter`, `ModelValidator`, `OllamaRuntimeService`
- **Seeding & Verification:** `prisma/seed.ts`, `prisma/verify-seed.ts`

---

## ⚡ Installation & Quickstart Guide

### Step 1: Clone Repository & Configure Environment

```bash
git clone https://github.com/gowthxm07/AI-powered-receptionist-platform.git
cd AI-powered-receptionist-platform

# Backend Environment
cp backend/.env.example backend/.env

# Frontend Environment
cp frontend/.env.example frontend/.env.local
```

---

### Step 2: Start PostgreSQL, Seed Demo Data & Verify Ollama

```bash
# Start PostgreSQL container
docker compose up -d

# Apply migrations
npm --prefix backend run db:deploy

# Populate 140+ record demonstration dataset
npm --prefix backend run db:seed

# Pull local AI model (if not already downloaded)
ollama pull llama3.2:3b
```

---

### Step 3: Run Automated Verification & Test Suite

```bash
# Verify database seeding metrics and zero scheduling conflicts
npm --prefix backend run db:verify-demo

# Pre-warm local AI model in RAM (optional)
npm --prefix backend run ai:warmup

# Run live multi-turn appointment booking conversation demo
npm --prefix backend run ai:booking-demo

# Run all 100+ backend automated integration tests
npm --prefix backend run test
```

---

### Step 4: Start Applications

#### Run Backend API Server
```bash
npm --prefix backend run dev
```
*Backend runs on:* [http://localhost:5000](http://localhost:5000)

#### Run Frontend Web Client
```bash
npm --prefix frontend run dev
```
*Frontend runs on:* [http://localhost:3000](http://localhost:3000)

---

## 🗺 Development Phases Roadmap

| Phase | Milestone Name | Focus Area | Status |
|---|---|---|---|
| **Phase 1** | **Project Foundation & Full-Stack Setup** | Next.js, Express, TypeScript, Tailwind, Health API, Git | **Completed** ✅ |
| **Phase 2** | **Database Foundation & Core Data Modeling** | PostgreSQL, Prisma Schema, Zod Validation, Core CRUD APIs | **Completed** ✅ |
| **Phase 3.1** | **Authentication Backend Foundation** | JWT, Bcrypt, HTTP-only Cookies, Register/Login/Me, Roles | **Completed** ✅ |
| **Phase 3.2** | **Authentication Frontend & Protected Shell** | Login/Register UI, Auth Context, Protected Route Guard | **Completed** ✅ |
| **Phase 3.2.1**| **Authorization & Business Data Isolation** | Multi-tenant scoping, route protection, cross-tenant isolation | **Completed** ✅ |
| **Phase 3.3** | **Professional Multi-Tenant Dashboard** | Real-data overview, business selector, stats, responsive UI | **Completed** ✅ |
| **Phase 3.4** | **Core Management Frontend** | Real CRUD UI for Customers, Staff, and Services | **Completed** ✅ |
| **Phase 3.5** | **Appointment Management & Scheduling** | Conflict detection, dynamic duration, availability check, bookings | **Completed** ✅ |
| **Phase 4** | **Demo Data & Database Seeding** | 143 deterministic records, multi-business demo, seed verification | **Completed** ✅ |
| **Phase 5.1**| **AI Receptionist Architecture & Tool Layer** | Model-agnostic tool framework, registry, router, validation, 11 tools | **Completed** ✅ |
| **Phase 5.2.1**| **Ollama Runtime & Performance Benchmark** | Ollama v0.33.2, llama3.2:3b, CPU inference benchmark, performance docs | **Completed** ✅ |
| **Phase 5.2.2**| **Ollama Model Adapter & Local Generation** | `AIModel`, `OllamaModelAdapter`, streaming, aborts, timeouts, keep-alive | **Completed** ✅ |
| **Phase 5.3** | **AI Receptionist Orchestration & Fast Routing** | `AIReceptionistService`, `FastIntentRouter`, tool integration, LLM fallback | **Completed** ✅ |
| **Phase 5.4** | **Multi-Turn Appointment Conversation Engine** | `AppointmentStateMachine`, session store, slot finder, zero-LLM booking | **Completed** ✅ |
| **Phase 5.5** | **Conversation REST API & Performance Instrumentation**| `POST /api/ai/conversation`, tenant isolation, performance telemetry | **Completed** ✅ |
| **Phase 6.1** | **AI Receptionist Web Conversation Console** | Real-time chat console, session persistence, telemetry & demo chips | **Completed** ✅ |
| **Phase 6.2** | **Voice Pipeline & RAG Knowledge Retrieval** | ChromaDB vector search, Whisper STT, Piper TTS | *Upcoming* ⏳ |
| **Phase 7** | **Admin Dashboard & Unified Experience** | Live simulator, call analytics, settings | *Upcoming* ⏳ |
| **Phase 8** | **Testing, Hardening & Capstone Presentation** | End-to-end testing, documentation, capstone demo prep | *Upcoming* ⏳ |
