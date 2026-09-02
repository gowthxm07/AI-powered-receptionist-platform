# AI-Powered Smart Receptionist Platform

> **"Intelligent conversations. Smarter appointments."**

An autonomous, full-stack AI-integrated receptionist platform designed to streamline front-desk operations, automate appointment bookings, resolve caller inquiries, and manage customer records using 100% free and open-source local AI, database, and authentication technologies.

---

## 📌 Current Development Status

```
Current Milestone: PHASE 3.1 — Authentication Backend Foundation
Status: Completed
```

- **Phase 1 (Foundation):** Next.js UI shell, Express API, TypeScript setup, Health check API, progressive Git history.
- **Phase 2 (Database & Data Modeling):** PostgreSQL local containerization via Docker Compose, Prisma ORM schema & client generation, Zod request validation, and core REST APIs for Businesses, Customers, Staff, and Services.
- **Phase 3.1 (Authentication Backend):** Secure JWT authentication with HTTP-only cookies, Bcrypt password hashing, User registration & login, `/api/auth/me`, and role-based authorization middleware.

---

## 🛠 Current Tech Stack

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
- **Authentication:** `jsonwebtoken`, `bcryptjs`, `cookie-parser` (HTTP-only cookies)
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
                               │ REST / JSON (CORS + Cookies)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Express API Server                      │
│             (Node.js + TypeScript + Middleware)             │
│                 http://localhost:5000                       │
│                                                             │
│  ├── /api/health      -> System & Uptime Diagnostic         │
│  ├── /api/auth        -> Register, Login, Me, Logout        │
│  ├── /api/businesses  -> Business Entity CRUD               │
│  ├── /api/customers   -> Customer Directory CRUD            │
│  ├── /api/staff       -> Staff Roster CRUD                  │
│  └── /api/services    -> Bookable Services Catalog CRUD     │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼ (Prisma ORM)                 ▼ (Future Phase)
┌──────────────────────────────┐ ┌────────────────────────────┐
│      PostgreSQL Database     │ │       Local AI Engine      │
│   • Users & Roles (Auth)     │ │   • Ollama (Local LLM)     │
│   • Businesses & Staff       │ │   • Whisper (STT)          │
│   • Customers & Services     │ │   • Piper (TTS)            │
│   • Appointments & Convos    │ │                            │
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
│   ├── AUTHENTICATION.md          # Authentication and authorization architecture
│   ├── DATABASE.md                # Database schema, ERD, and migration guide
│   └── ROADMAP.md                 # Multi-phase capstone project roadmap
├── backend/
│   ├── .env.example               # Backend environment variable template
│   ├── package.json               # Backend dependencies and scripts
│   ├── tsconfig.json              # Backend TypeScript configuration
│   ├── prisma/
│   │   ├── schema.prisma          # PostgreSQL relational schema definition
│   │   └── migrations/            # Version-controlled Prisma SQL migrations
│   └── src/
│       ├── config/
│       │   └── environment.ts     # Type-safe configuration loader
│       ├── controllers/
│       │   ├── auth.controller.ts     # Auth handlers (Register, Login, Me, Logout)
│       │   ├── business.controller.ts # Business CRUD handlers
│       │   ├── customer.controller.ts # Customer CRUD handlers
│       │   ├── health.controller.ts   # Health check controller
│       │   ├── service.controller.ts  # Service catalog handlers
│       │   └── staff.controller.ts    # Staff management handlers
│       ├── lib/
│       │   ├── jwt.ts             # JWT token & cookie utilities
│       │   ├── password.ts        # Bcrypt password hashing
│       │   └── prisma.ts          # Reusable Prisma client singleton
│       ├── middleware/
│       │   ├── auth.ts            # authenticate & authorize middlewares
│       │   ├── errorHandler.ts    # Prisma, validation, & 404 error handlers
│       │   └── validate.ts        # Generic Zod request validator
│       ├── routes/
│       │   ├── auth.routes.ts     # /api/auth route table
│       │   ├── business.routes.ts # /api/businesses route table
│       │   ├── customer.routes.ts # /api/customers route table
│       │   ├── health.routes.ts   # /api/health route table
│       │   ├── service.routes.ts  # /api/services route table
│       │   ├── staff.routes.ts    # /api/staff route table
│       │   └── index.ts           # Central router aggregator
│       ├── services/
│       │   ├── auth.service.ts
│       │   ├── business.service.ts
│       │   ├── customer.service.ts
│       │   ├── health.service.ts
│       │   ├── service.service.ts
│       │   └── staff.service.ts
│       ├── test/
│       │   ├── auth-integration.test.ts # Auth & JWT integration tests
│       │   ├── authorization.test.ts    # Role middleware tests
│       │   ├── db-integration.test.ts   # PostgreSQL CRUD tests
│       │   ├── validation.test.ts       # Zod schema validation tests
│       │   └── index.ts                 # Master test suite runner
│       ├── types/
│       │   ├── auth.types.ts
│       │   └── express.d.ts
│       ├── validation/
│       │   ├── auth.validation.ts
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
            ├── ArchitecturePreview.tsx
            ├── FeatureGrid.tsx
            ├── Footer.tsx
            ├── Header.tsx
            ├── Hero.tsx
            └── SystemStatus.tsx
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

## 🌐 API Route Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/health` | Service liveness & uptime status | No |
| `POST` | `/api/auth/register` | Register user & issue HTTP-only JWT cookie | No |
| `POST` | `/api/auth/login` | Authenticate user & issue JWT cookie | No |
| `GET` | `/api/auth/me` | Retrieve authenticated user profile | **Yes** |
| `POST` | `/api/auth/logout` | Clear authentication cookie | No |
| `POST` | `/api/businesses` | Create business profile | No |
| `GET` | `/api/businesses` | List all businesses with counts | No |
| `GET` | `/api/businesses/:id` | Get business details & staff/services | No |
| `PUT` | `/api/businesses/:id` | Update business profile | No |
| `DELETE` | `/api/businesses/:id` | Remove business | No |
| `POST` | `/api/customers` | Create customer (unique phone) | No |
| `GET` | `/api/customers` | List all customers | No |
| `GET` | `/api/customers/:id` | Get customer profile & history | No |
| `PUT` | `/api/customers/:id` | Update customer details | No |
| `DELETE` | `/api/customers/:id` | Remove customer | No |
| `POST` | `/api/staff` | Create staff member | No |
| `GET` | `/api/staff` | List staff (query: `?businessId=...`) | No |
| `GET` | `/api/staff/:id` | Get staff details & schedule | No |
| `PUT` | `/api/staff/:id` | Update staff profile | No |
| `DELETE` | `/api/staff/:id` | Remove staff member | No |
| `POST` | `/api/services` | Create service offering | No |
| `GET` | `/api/services` | List services (query: `?businessId=...`) | No |
| `GET` | `/api/services/:id` | Get service details | No |
| `PUT` | `/api/services/:id` | Update service offering | No |
| `DELETE` | `/api/services/:id` | Remove service offering | No |

---

## 🗺 Development Phases Roadmap

| Phase | Milestone Name | Focus Area | Status |
|---|---|---|---|
| **Phase 1** | **Project Foundation & Full-Stack Setup** | Next.js, Express, TypeScript, Tailwind, Health API, Git | **Completed** ✅ |
| **Phase 2** | **Database Foundation & Core Data Modeling** | PostgreSQL, Prisma Schema, Zod Validation, Core CRUD APIs | **Completed** ✅ |
| **Phase 3.1** | **Authentication Backend Foundation** | JWT, Bcrypt, HTTP-only Cookies, Register/Login/Me, Roles | **Completed** ✅ |
| **Phase 3.2** | **Frontend Auth & Protected Dashboard Shell** | Login/Register UI, Auth Context, Protected Routes | *Upcoming* ⏳ |
| **Phase 4** | **Local AI & Conversation Agent** | Ollama local LLM, prompt orchestration, call transcripts | *Upcoming* ⏳ |
| **Phase 5** | **RAG Knowledge Assistant & Voice Pipeline** | ChromaDB vector search, Whisper STT, Piper TTS | *Upcoming* ⏳ |
| **Phase 6** | **Testing, Hardening & Final Presentation** | End-to-end testing, documentation, capstone demo prep | *Upcoming* ⏳ |

---

## 🛡 License & Tech Constraints

This project is built strictly following open-source, free principles:
- **No paid API keys or subscriptions required**
- **No proprietary cloud auth or DB lock-in** (JWT + PostgreSQL run locally)
- **Local AI & Privacy First**
