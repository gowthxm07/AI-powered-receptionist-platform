# AI-Powered Smart Receptionist Platform

> **"Intelligent conversations. Smarter appointments."**

An autonomous, full-stack AI-integrated receptionist platform designed to streamline front-desk operations, automate appointment bookings, resolve caller inquiries, and manage customer records using 100% free and open-source local AI technologies.

---

## 📌 Current Development Status

```
Current Milestone: PHASE 1 — Project Foundation & Full-Stack Setup
Status: Completed
```

This repository is currently at **Phase 1** of a multi-phase capstone development lifecycle. It establishes a scalable, type-safe full-stack architectural foundation without external paid dependencies or proprietary APIs.

---

## 🛠 Current Tech Stack (Phase 1)

### Frontend
- **Framework:** [Next.js](https://nextjs.org/) (React 18, App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Linting:** ESLint

### Backend
- **Runtime:** [Node.js](https://nodejs.org/)
- **Framework:** [Express](https://expressjs.com/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Utilities:** `cors`, `dotenv`
- **Execution & Transpilation:** `tsx`, `tsc`

### Version Control & Quality
- **VCS:** Git & GitHub
- **Package Manager:** npm

---

## 🚀 Planned Future Features

1. **AI Receptionist Engine**
   - Autonomous speech-to-text with local **Whisper**
   - Local LLM inference & conversational reasoning with **Ollama**
   - Natural text-to-speech output using open-source **Piper**
2. **Smart Appointment Scheduling**
   - Automated slot checking, conflict detection, and calendar booking
   - Real-time rescheduling and cancellations
3. **Customer & Caller Management**
   - Comprehensive caller profiles, interaction timelines, and preference logs
4. **Knowledge Assistant (RAG)**
   - Context-aware retrieval augmented generation using **ChromaDB** or **Qdrant**
   - Business FAQ and document semantic search
5. **Conversation History & Analytics**
   - Searchable call logs and audio transcript records
   - AI-generated conversation summaries and sentiment extraction
6. **Admin Dashboard**
   - Central management portal for appointments, caller records, analytics, and AI model parameters

---

## 🏗 Project Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Client UI                        │
│             (React + TypeScript + Tailwind CSS)             │
│                 http://localhost:3000                       │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST / JSON (CORS Enabled)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Express API Server                      │
│             (Node.js + TypeScript + Middleware)             │
│                 http://localhost:5000                       │
│                                                             │
│  ├── /api/health   -> System & Uptime Health Verification   │
│  └── /api/*        -> Future Modules (Appointments, Logs)   │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼ (Future Phase)               ▼ (Future Phase)
┌──────────────────────────────┐ ┌────────────────────────────┐
│       Local AI Engine        │ │      Persistence Layer     │
│   • Ollama (Local LLM)       │ │   • Relational Database    │
│   • Whisper (STT)            │ │   • ChromaDB / Qdrant      │
│   • Piper (TTS)              │ │     (Vector Embeddings)    │
└──────────────────────────────┘ └────────────────────────────┘
```

---

## 📂 Project Structure

```text
Receptionist/
├── .gitignore                     # Git ignore rules for node_modules, envs, builds
├── README.md                      # Project documentation and guide
├── package.json                   # Root workspace scripts
├── docs/
│   ├── ARCHITECTURE.md            # In-depth architectural specification
│   └── ROADMAP.md                 # Multi-phase capstone project roadmap
├── backend/
│   ├── .env.example               # Backend environment variable template
│   ├── package.json               # Backend dependencies and scripts
│   ├── tsconfig.json              # Backend TypeScript configuration
│   └── src/
│       ├── config/
│       │   └── environment.ts     # Type-safe configuration loader
│       ├── controllers/
│       │   └── health.controller.ts # Health check controller
│       ├── middleware/
│       │   └── errorHandler.ts    # 404 and global error handlers
│       ├── routes/
│       │   ├── health.routes.ts   # /api/health route definitions
│       │   └── index.ts           # Central API router aggregator
│       ├── services/
│       │   └── health.service.ts  # System status calculation service
│       ├── app.ts                 # Express application setup
│       └── server.ts              # HTTP server entry point
└── frontend/
    ├── .env.example               # Frontend environment variable template
    ├── package.json               # Frontend dependencies and scripts
    ├── tsconfig.json              # Frontend TypeScript configuration
    ├── tailwind.config.ts         # Tailwind CSS configuration
    ├── postcss.config.mjs         # PostCSS configuration
    ├── next.config.mjs            # Next.js configuration
    └── src/
        ├── app/
        │   ├── globals.css        # Global Tailwind styles
        │   ├── layout.tsx         # Root HTML layout shell
        │   └── page.tsx           # Landing page with system status dashboard
        └── components/
            ├── Header.tsx         # Sticky navigation header
            ├── Hero.tsx           # Hero section with project tagline
            ├── SystemStatus.tsx   # Live API connectivity verification tool
            ├── FeatureGrid.tsx    # Visual preview cards for planned features
            ├── ArchitecturePreview.tsx # Architecture overview component
            └── Footer.tsx         # Footer with capstone metadata
```

---

## ⚡ Installation & Setup Instructions

### Prerequisites
- **Node.js**: v18.0.0 or later (`node -v`)
- **npm**: v9.0.0 or later (`npm -v`)
- **Git**

---

### Step 1: Clone Repository

```bash
git clone https://github.com/gowthxm07/AI-powered-receptionist-platform.git
cd AI-powered-receptionist-platform
```

---

### Step 2: Configure Environment Variables

#### Backend:
```bash
# Copy template in backend directory
cp backend/.env.example backend/.env
```
Default backend `.env`:
```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

#### Frontend:
```bash
# Copy template in frontend directory
cp frontend/.env.example frontend/.env.local
```
Default frontend `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

### Step 3: Install Dependencies

From the root project directory:
```bash
# Install backend dependencies
npm --prefix backend install

# Install frontend dependencies
npm --prefix frontend install
```

Or install inside each folder:
```bash
cd backend && npm install
cd ../frontend && npm install
```

---

### Step 4: Run the Applications

#### Option A: Run Backend & Frontend in Separate Terminals

**Terminal 1 (Backend):**
```bash
npm --prefix backend run dev
```
*Backend runs on:* `http://localhost:5000`

**Terminal 2 (Frontend):**
```bash
npm --prefix frontend run dev
```
*Frontend runs on:* `http://localhost:3000`

#### Option B: Build for Production

**Backend Build & Run:**
```bash
npm --prefix backend run build
npm --prefix backend run start
```

**Frontend Build & Run:**
```bash
npm --prefix frontend run build
npm --prefix frontend run start
```

---

## 🩺 System Health Verification API

Verify that the backend is running correctly:

### Endpoint
`GET /api/health`

### Example Request
```bash
curl http://localhost:5000/api/health
```

### Example Response
```json
{
  "success": true,
  "message": "AI-Powered Receptionist API is running",
  "data": {
    "status": "healthy",
    "uptimeSeconds": 42,
    "timestamp": "2026-09-02T14:11:27.865Z",
    "environment": "development",
    "version": "1.0.0"
  }
}
```

---

## 🗺 Development Phases Roadmap

| Phase | Milestone Name | Focus Area | Status |
|---|---|---|---|
| **Phase 1** | **Project Foundation & Full-Stack Setup** | Next.js, Express, TypeScript, Tailwind, Health API, Git | **Completed** ✅ |
| **Phase 2** | **Data Modeling & Core Management** | Database integration, Appointments CRUD, Customer Records | *Upcoming* ⏳ |
| **Phase 3** | **Local AI & Conversation Agent** | Ollama local LLM, prompt orchestration, call transcripts | *Upcoming* ⏳ |
| **Phase 4** | **RAG Knowledge Assistant & Voice Pipeline** | ChromaDB vector search, Whisper STT, Piper TTS | *Upcoming* ⏳ |
| **Phase 5** | **Admin Dashboard & Conversation Summaries** | Analytics, appointment management UI, AI summary cards | *Upcoming* ⏳ |
| **Phase 6** | **Testing, Hardening & Final Presentation** | End-to-end testing, documentation, capstone demo prep | *Upcoming* ⏳ |

---

## 🛡 License & Tech Constraints

This project is built strictly following open-source, free principles:
- **No paid API keys required**
- **No proprietary cloud lock-in** (No OpenAI, Anthropic, Twilio, or ElevenLabs)
- **Local AI & Privacy First**
