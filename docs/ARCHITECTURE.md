# System Architecture Specification

## 1. Architectural Philosophy
The **AI-Powered Smart Receptionist Platform** is structured as a decoupled, multi-tier full-stack system engineered to maximize developer velocity, type safety, modularity, and operational privacy.

```
┌─────────────────────────────────────────────────────────────┐
│                   Presentation Layer                        │
│                   Next.js 14+ (React)                       │
│        • Tailwind CSS • Lucide Icons • Client Hooks         │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON (REST)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│                Node.js + Express + TypeScript               │
│     • Controllers • Routes • Services • Error Middleware    │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      Local AI Pipeline       │ │      Data Persistence      │
│   (Planned: Ollama/Whisper)  │ │   (Planned: SQL / Chroma)  │
└──────────────────────────────┘ └────────────────────────────┘
```

---

## 2. Component Layers (Phase 1)

### 2.1 Frontend (`/frontend`)
- **Technology:** Next.js (App Router), TypeScript, Tailwind CSS.
- **Port:** `3000` (configurable).
- **Core Components:**
  - `Header`: Global brand header with status tags and external repository links.
  - `Hero`: Platform pitch, capstone identifiers, and core project tagline.
  - `SystemStatus`: Real-time diagnostic consumer that tests live connectivity to the Express server.
  - `FeatureGrid`: Visual roadmap showcase highlighting incoming AI, scheduling, and RAG modules.
  - `ArchitecturePreview`: Modular layer diagram outlining technology boundaries.
  - `Footer`: Capstone information and tech stack summary.

### 2.2 Backend (`/backend`)
- **Technology:** Node.js, Express, TypeScript, CORS.
- **Port:** `5000` (configurable via `.env`).
- **Core Modules:**
  - `config/environment.ts`: Central typed environment loader.
  - `controllers/health.controller.ts`: Handles requests and formats JSON envelopes.
  - `services/health.service.ts`: Computes system uptime, status metrics, and environment data.
  - `routes/`: Modular routing table aggregated in `index.ts`.
  - `middleware/errorHandler.ts`: Explicit 404 handler and global exception catcher.
  - `app.ts`: Express application setup with CORS and JSON middleware.
  - `server.ts`: Server initialization and graceful process shutdown handlers (`SIGTERM`, `SIGINT`).

---

## 3. API Specification

### Health Check Endpoint
- **Route:** `GET /api/health`
- **Description:** Verifies server liveness, returns process uptime and runtime environment.
- **Headers:** `Content-Type: application/json`
- **Response Format:**
```json
{
  "success": true,
  "message": "AI-Powered Receptionist API is running",
  "data": {
    "status": "healthy",
    "uptimeSeconds": 120,
    "timestamp": "2026-09-02T14:11:27.865Z",
    "environment": "development",
    "version": "1.0.0"
  }
}
```

---

## 4. Open-Source AI Strategy (Future Phases)
To maintain zero recurring cost and complete data privacy:
- **LLM Inference:** Local deployment via Ollama (e.g., Llama 3 / Mistral / Gemma).
- **Speech-to-Text (STT):** Local OpenAI Whisper running on CPU/GPU.
- **Text-to-Speech (TTS):** Piper or Coqui TTS running locally.
- **Vector Retrieval:** ChromaDB or Qdrant for semantic knowledge retrieval.
