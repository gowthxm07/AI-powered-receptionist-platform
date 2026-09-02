# AI-Powered Smart Receptionist Platform

> **"Intelligent conversations. Smarter appointments."**

An autonomous, full-stack AI-integrated receptionist platform designed to streamline front-desk operations, automate appointment bookings, resolve caller inquiries, and manage customer records using 100% free and open-source local AI and database technologies.

---

## 📌 Current Development Status

```
Current Milestone: PHASE 2 — Database Foundation & Core Data Modeling
Status: Completed
```

- **Phase 1 (Foundation):** Next.js UI shell, Express API, TypeScript setup, Health check API, progressive Git history.
- **Phase 2 (Database & Data Modeling):** PostgreSQL local containerization via Docker Compose, Prisma ORM schema & client generation, Zod request validation, and core REST APIs for Businesses, Customers, Staff, and Services.

---

## 🛠 Current Tech Stack (Phases 1 & 2)

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
- **Database Engine:** [PostgreSQL](https://www.postgresql.org/) (Local / Docker Compose)
- **ORM:** [Prisma ORM](https://www.prisma.io/)
- **Validation:** [Zod](https://zod.dev/)
- **Utilities:** `cors`, `dotenv`
- **Execution & Transpilation:** `tsx`, `tsc`

### DevOps & Tools
- **Containerization:** Docker & Docker Compose (`docker-compose.yml`)
- **VCS:** Git & GitHub
- **Package Manager:** npm

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
│  ├── /api/health      -> System & Uptime Diagnostic         │
│  ├── /api/businesses  -> Business Entity CRUD               │
│  ├── /api/customers   -> Customer Directory CRUD            │
│  ├── /api/staff       -> Staff Roster CRUD                  │
│  └── /api/services    -> Bookable Services Catalog CRUD     │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼ (Prisma ORM)                 ▼ (Future Phase)
┌──────────────────────────────┐ ┌────────────────────────────┐
│      PostgreSQL Database     │ │       Local AI Engine      │
│   • Businesses & Staff       │ │   • Ollama (Local LLM)     │
│   • Customers & Services     │ │   • Whisper (STT)          │
│   • Appointments & Convos    │ │   • Piper (TTS)            │
└──────────────────────────────┘ └────────────────────────────┘
```

---

## 📂 Project Structure

```text
Receptionist/
├── .gitignore                     # Git ignore rules for node_modules, envs, builds
├── .env.example                   # Root environment template (Docker & DB)
├── docker-compose.yml             # Local PostgreSQL Docker Compose configuration
├── README.md                      # Primary project documentation
├── package.json                   # Root workspace scripts
├── docs/
│   ├── ARCHITECTURE.md            # In-depth architectural specification
│   ├── DATABASE.md                # Database schema, ERD, and migration guide
│   └── ROADMAP.md                 # Multi-phase capstone project roadmap
├── backend/
│   ├── .env.example               # Backend environment variable template
│   ├── package.json               # Backend dependencies and scripts
│   ├── tsconfig.json              # Backend TypeScript configuration
│   ├── prisma/
│   │   └── schema.prisma          # PostgreSQL relational schema definition
│   └── src/
│       ├── config/
│       │   └── environment.ts     # Type-safe configuration loader
│       ├── controllers/
│       │   ├── business.controller.ts # Business CRUD handlers
│       │   ├── customer.controller.ts # Customer CRUD handlers
│       │   ├── health.controller.ts   # Health check controller
│       │   ├── service.controller.ts  # Service catalog handlers
│       │   └── staff.controller.ts    # Staff management handlers
│       ├── lib/
│       │   └── prisma.ts          # Reusable Prisma client singleton
│       ├── middleware/
│       │   ├── errorHandler.ts    # Prisma, validation, & 404 error handlers
│       │   └── validate.ts        # Generic Zod request validator
│       ├── routes/
│       │   ├── business.routes.ts # /api/businesses route table
│       │   ├── customer.routes.ts # /api/customers route table
│       │   ├── health.routes.ts   # /api/health route table
│       │   ├── service.routes.ts  # /api/services route table
│       │   ├── staff.routes.ts    # /api/staff route table
│       │   └── index.ts           # Central router aggregator
│       ├── services/
│       │   ├── business.service.ts
│       │   ├── customer.service.ts
│       │   ├── health.service.ts
│       │   ├── service.service.ts
│       │   └── staff.service.ts
│       ├── test/
│       │   └── validation.test.ts # Zod schema unit test suite
│       ├── validation/
│       │   ├── business.validation.ts
│       │   ├── customer.validation.ts
│       │   ├── service.validation.ts
│       │   └── staff.validation.ts
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

## ⚡ Installation & Quickstart Guide

### Prerequisites
- **Node.js**: v18.0.0 or later (`node -v`)
- **npm**: v9.0.0 or later (`npm -v`)
- **Docker & Docker Compose** *(Optional for containerized PostgreSQL)* or a local PostgreSQL instance.

---

### Step 1: Clone Repository

```bash
git clone https://github.com/gowthxm07/AI-powered-receptionist-platform.git
cd AI-powered-receptionist-platform
```

---

### Step 2: Configure Environment Variables

```bash
# Backend Environment
cp backend/.env.example backend/.env

# Frontend Environment
cp frontend/.env.example frontend/.env.local
```

---

### Step 3: Start Local Database

**Using Docker Compose (Recommended):**
```bash
docker compose up -d
```

**Generate Prisma Client & Push Schema:**
```bash
npm --prefix backend run db:generate
npm --prefix backend run db:push
```

---

### Step 4: Install Dependencies

```bash
# Install backend dependencies
npm --prefix backend install

# Install frontend dependencies
npm --prefix frontend install
```

---

### Step 5: Run the Applications

#### Option A: Development Mode

**Terminal 1 (Backend):**
```bash
npm --prefix backend run dev
```
*Backend runs on:* [http://localhost:5000](http://localhost:5000)

**Terminal 2 (Frontend):**
```bash
npm --prefix frontend run dev
```
*Frontend runs on:* [http://localhost:3000](http://localhost:3000)

#### Option B: Run Validation Tests
```bash
npm --prefix backend run test
```

---

## 🌐 API Route Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service liveness & uptime status |
| `POST` | `/api/businesses` | Create business profile |
| `GET` | `/api/businesses` | List all businesses with counts |
| `GET` | `/api/businesses/:id` | Get business details & staff/services |
| `PUT` | `/api/businesses/:id` | Update business profile |
| `DELETE` | `/api/businesses/:id` | Remove business |
| `POST` | `/api/customers` | Create customer (unique phone) |
| `GET` | `/api/customers` | List all customers |
| `GET` | `/api/customers/:id` | Get customer profile & history |
| `PUT` | `/api/customers/:id` | Update customer details |
| `DELETE` | `/api/customers/:id` | Remove customer |
| `POST` | `/api/staff` | Create staff member |
| `GET` | `/api/staff` | List staff (query: `?businessId=...`) |
| `GET` | `/api/staff/:id` | Get staff details & schedule |
| `PUT` | `/api/staff/:id` | Update staff profile |
| `DELETE` | `/api/staff/:id` | Remove staff member |
| `POST` | `/api/services` | Create service offering |
| `GET` | `/api/services` | List services (query: `?businessId=...`) |
| `GET` | `/api/services/:id` | Get service details |
| `PUT` | `/api/services/:id` | Update service offering |
| `DELETE` | `/api/services/:id` | Remove service offering |

---

## 🗺 Development Phases Roadmap

| Phase | Milestone Name | Focus Area | Status |
|---|---|---|---|
| **Phase 1** | **Project Foundation & Full-Stack Setup** | Next.js, Express, TypeScript, Tailwind, Health API, Git | **Completed** ✅ |
| **Phase 2** | **Database Foundation & Core Data Modeling** | PostgreSQL, Prisma Schema, Zod Validation, Core CRUD APIs | **Completed** ✅ |
| **Phase 3** | **Local AI & Conversation Agent** | Ollama local LLM, prompt orchestration, call transcripts | *Upcoming* ⏳ |
| **Phase 4** | **RAG Knowledge Assistant & Voice Pipeline** | ChromaDB vector search, Whisper STT, Piper TTS | *Upcoming* ⏳ |
| **Phase 5** | **Admin Dashboard & Conversation Summaries** | Analytics, appointment management UI, AI summary cards | *Upcoming* ⏳ |
| **Phase 6** | **Testing, Hardening & Final Presentation** | End-to-end testing, documentation, capstone demo prep | *Upcoming* ⏳ |

---

## 🛡 License & Tech Constraints

This project is built strictly following open-source, free principles:
- **No paid API keys or subscriptions required**
- **No proprietary cloud database lock-in** (PostgreSQL runs locally)
- **Local AI & Privacy First**
