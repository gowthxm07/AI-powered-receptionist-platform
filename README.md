# AI-Powered Smart Receptionist Platform

> **"Intelligent conversations. Smarter appointments."**

An autonomous, full-stack AI-integrated receptionist platform designed to streamline front-desk operations, automate appointment bookings, resolve caller inquiries, and manage customer records using 100% free and open-source local AI, database, and authentication technologies.

---

## 📌 Current Development Status

```
Current Milestone: PHASE 3.4 — Core Management Frontend
Status: Completed
```

- **Phase 1 (Foundation):** Next.js UI shell, Express API, TypeScript setup, Health check API, progressive Git history.
- **Phase 2 (Database & Data Modeling):** PostgreSQL local containerization via Docker Compose, Prisma ORM schema & client generation, Zod request validation, and core REST APIs for Businesses, Customers, Staff, and Services.
- **Phase 3.1 (Authentication Backend):** Secure JWT authentication with HTTP-only cookies, Bcrypt password hashing, User registration & login, `/api/auth/me`, and role-based authorization middleware.
- **Phase 3.2 (Authentication Frontend):** React `AuthContext` state management, typed API client with `credentials: "include"`, `/login` and `/register` responsive forms with validation and password toggles, protected `/dashboard` shell, and automatic redirection flows.
- **Phase 3.2.1 (Authorization & Data Isolation):** Complete multi-tenant business data isolation, route protection across all domain APIs, server-enforced `OwnershipService` rules preventing cross-business data leakage, and rigorous security integration test suites.
- **Phase 3.3 (Professional Multi-Tenant Dashboard):** Real-data business dashboard overview with business selector, dynamic stats calculation (customers, staff, services), quick operations shortcuts, AI receptionist and latency telemetry cards, recent activity placeholder, and responsive sidebar navigation.
- **Phase 3.4 (Core Management Frontend):** Complete database-backed frontend management modules for Customers (`/dashboard/customers`), Staff specialists (`/dashboard/staff`), and Services catalog (`/dashboard/services`) with real-time CRUD, instant search, responsive tables/cards, modal dialogs, and delete confirmations.

---

## 🛠 Current Tech Stack

### Frontend
- **Framework:** [Next.js](https://nextjs.org/) (React 18, App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **State & Context:** React Context API (`AuthContext`, `BusinessContext`)
- **API Client:** Native `fetch` wrapper with HTTP-only cookie support (`lib/api.ts`)
- **Management UI:** `CustomerModal`, `StaffModal`, `ServiceModal`, `ConfirmDialog`, `Toast`
- **Linting:** ESLint

### Backend
- **Runtime:** [Node.js](https://nodejs.org/)
- **Framework:** [Express](https://expressjs.com/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Database Engine:** [PostgreSQL](https://www.postgresql.org/) (Local / Docker Compose)
- **ORM:** [Prisma ORM](https://www.prisma.io/)
- **Authentication & Security:** `jsonwebtoken`, `bcryptjs`, `cookie-parser` (HTTP-only cookies), `OwnershipService`
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
│                                                             │
│  ├── /                      -> Public Landing Page          │
│  ├── /login                 -> Authenticated Sign In Form   │
│  ├── /register              -> New Account Creation Form    │
│  ├── /dashboard             -> Multi-Tenant Overview (Real) │
│  ├── /dashboard/customers   -> Real-Data Customer CRUD      │
│  ├── /dashboard/staff       -> Real-Data Staff Roster CRUD  │
│  ├── /dashboard/services    -> Real-Data Services CRUD      │
│  ├── /dashboard/appointments-> Appointments Calendar Shell  │
│  ├── /dashboard/conversations-> Dialogue Transcripts Shell  │
│  ├── /dashboard/ai-receptionist -> AI Engine Shell          │
│  └── /dashboard/settings    -> Business Settings Shell      │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST / JSON (CORS + Cookies)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Express API Server                      │
│             (Node.js + TypeScript + Middleware)             │
│                 http://localhost:5000                       │
│                                                             │
│  ├── /api/health      -> System & Uptime Diagnostic (Public)│
│  ├── /api/auth        -> Register, Login, Me, Logout        │
│  ├── /api/businesses  -> Owned Business CRUD (Protected)    │
│  ├── /api/customers   -> Owned Customer CRUD (Protected)    │
│  ├── /api/staff       -> Owned Staff Roster CRUD (Protected)│
│  └── /api/services    -> Owned Services Catalog (Protected) │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼ (Prisma ORM)                 ▼ (Future Phase)
┌──────────────────────────────┐ ┌────────────────────────────┐
│      PostgreSQL Database     │ │       Local AI Engine      │
│   • Users & Roles (Auth)     │ │   • Ollama (Local LLM)     │
│   • Multi-Tenant Businesses  │ │   • Whisper (STT)          │
│   • Isolated Staff & Catalog │ │   • Piper (TTS)            │
│   • Scoped Customer Records  │ │                            │
└──────────────────────────────┘ └────────────────────────────┘
```

---

## ⚡ Installation & Quickstart Guide

### Prerequisites
- **Node.js**: v18.0.0 or later (`node -v`)
- **npm**: v9.0.0 or later (`npm -v`)
- **Docker & Docker Compose** (for PostgreSQL)

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

### Step 3: Start Local Database & Apply Migrations

```bash
# Start PostgreSQL Container
docker compose up -d

# Apply Version-Controlled Migrations
npm --prefix backend run db:deploy
```

---

### Step 4: Install Dependencies

```bash
# Backend
npm --prefix backend install

# Frontend
npm --prefix frontend install
```

---

### Step 5: Run the Applications & Test Suite

#### Run All Automated Tests
```bash
npm --prefix backend run test
```

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
| **Phase 4** | **Local AI & Conversation Agent** | Ollama local LLM, prompt orchestration, call transcripts | *Upcoming* ⏳ |
| **Phase 5** | **RAG Knowledge Assistant & Voice Pipeline** | ChromaDB vector search, Whisper STT, Piper TTS | *Upcoming* ⏳ |
| **Phase 6** | **Admin Dashboard & Unified Experience** | Live simulator, call analytics, settings | *Upcoming* ⏳ |
| **Phase 7** | **Testing, Hardening & Capstone Presentation** | End-to-end testing, documentation, capstone demo prep | *Upcoming* ⏳ |

---

## 🛡 License & Tech Constraints

This project is built strictly following open-source, free principles:
- **No paid API keys or subscriptions required**
- **No proprietary cloud auth or DB lock-in** (JWT + PostgreSQL run locally)
- **Local AI & Privacy First**
