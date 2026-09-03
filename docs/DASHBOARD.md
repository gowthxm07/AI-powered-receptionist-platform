# Multi-Tenant Dashboard Architecture & Core Management Frontend

This document describes the design, component hierarchy, multi-tenant state management, real-data CRUD integration, and future AI telemetry specifications of the **Professional Multi-Tenant Dashboard & Core Management Frontend (Phase 3.3 & Phase 3.4)** for the **AI-Powered Smart Receptionist Platform**.

---

## 1. Overview & SaaS Architecture

The dashboard serves as the central administrative workspace for business owners and operators to monitor front-desk operations, review customer directories, manage staff rosters, configure service catalogs, and supervise autonomous AI receptionists.

### Key Architectural Principles
- **Real Backend Data:** All dashboard metrics and management tables are derived dynamically from secured Express REST endpoints backed by PostgreSQL. No hardcoded, synthetic, or fake client-only CRUD exists.
- **Strict Multi-Tenancy:** The dashboard operates within an active **Business Context**. All statistics, customer records, staff members, and service offerings are scoped to the selected business tenant.
- **Security Boundary:** The frontend business selector is a UI convenience; the backend `OwnershipService` remains the authoritative security boundary, enforcing that `business.ownerId === req.user.userId`.
- **Responsive Layout:** Persistent sidebar on desktop viewports, responsive collapsibility on tablets, and slide-over navigation drawer on mobile viewports.
- **Future AI Extensibility:** Reserved architecture for sub-second AI latency telemetry (STT, TTFT, AI Response, and TTFA).

---

## 2. Core Management Modules (Phase 3.4)

### A. Customer Management (`/dashboard/customers`)
- **Real-Data CRUD:**
  - `GET /api/customers?businessId=...`: Loads customers belonging to the active business tenant.
  - `POST /api/customers`: Registers a new caller record with `name`, `phone`, and optional `email`.
  - `PUT /api/customers/:id`: Updates existing customer contact information.
  - `DELETE /api/customers/:id`: Permanently removes customer after confirmation.
- **Client-Side Search:** Instant, responsive, case-insensitive search across `name`, `phone`, and `email`.
- **Validation:** Frontend field validations mirroring backend Zod schemas (Name required, phone min 3 chars, valid email format).
- **Components:** `CustomerTable.tsx`, `CustomerModal.tsx`, `ConfirmDialog.tsx`, `Toast.tsx`.

### B. Staff Management (`/dashboard/staff`)
- **Real-Data CRUD:**
  - `GET /api/staff?businessId=...`: Loads specialists roster for the active business.
  - `POST /api/staff`: Onboards a specialist with `name`, `email`, `phone`, `role`, and `isActive` status.
  - `PUT /api/staff/:id`: Updates specialist operating role and active status.
  - `DELETE /api/staff/:id`: Removes specialist from the roster after confirmation.
- **Client-Side Search:** Instant filtering across `name`, `role`, `email`, and `phone`.
- **Status Management:** Active status toggle determining whether a specialist is available for AI appointment bookings.
- **Components:** `StaffTable.tsx`, `StaffModal.tsx`, `ConfirmDialog.tsx`, `Toast.tsx`.

### C. Services Catalog Management (`/dashboard/services`)
- **Real-Data CRUD:**
  - `GET /api/services?businessId=...`: Loads bookable catalog services for the active business.
  - `POST /api/services`: Creates a new service offering with `name`, `description`, `durationMinutes` (1-1440 mins), and `isActive`.
  - `PUT /api/services/:id`: Updates service details and duration.
  - `DELETE /api/services/:id`: Removes service from catalog after confirmation.
- **Client-Side Search:** Search across `name` and `description`.
- **Duration Configuration:** Minute duration configuration used by the autonomous AI receptionist to compute appointment slots.
- **Components:** `ServiceTable.tsx`, `ServiceModal.tsx`, `ConfirmDialog.tsx`, `Toast.tsx`.

---

## 3. Component Hierarchy & Layout Tree

```text
DashboardLayout (Protected by ProtectedRoute)
 │
 ├── Sidebar (Responsive Navigation)
 │    ├── Brand Logo & System Synchronized Indicator
 │    ├── Navigation Links (Dashboard, Customers, Staff, Services, Appointments, Conversations, AI Receptionist, Settings)
 │    └── PostgreSQL Engine Status Badge
 │
 └── Main Viewport
      ├── Topbar
      │    ├── Mobile Hamburger Menu Button
      │    ├── Page Title & Breadcrumbs
      │    ├── BusinessSelector (Dropdown & Active Tenant Switcher)
      │    ├── Authenticated User Profile (Name, Role Badge)
      │    └── Sign Out Button (Clears HTTP-only JWT Cookie)
      │
      ├── /dashboard (DashboardOverview)
      │    ├── Welcome Banner (Tenant Name, Phone, Isolation Badge)
      │    ├── StatsCard Grid (Customers, Staff, Services, Upcoming Bookings)
      │    ├── QuickActions (Shortcuts to Core Workflows)
      │    ├── AIReceptionistCard (Offline / Local AI Stack Preview)
      │    ├── AIPerformanceCard (Sub-second Latency Telemetry Placeholder)
      │    ├── RecentActivity (Honest Event Stream Placeholder)
      │    └── SystemStatus (PostgreSQL, Tenant Isolation, HTTP-Only Cookie Session)
      │
      ├── /dashboard/customers (Customer Management)
      │    ├── CustomerTable (Search, Sort, Responsive Mobile Cards)
      │    ├── CustomerModal (Create / Edit Dialog)
      │    ├── ConfirmDialog (Safe Delete Confirmation)
      │    └── Toast (Action Success / Error Alerts)
      │
      ├── /dashboard/staff (Staff Specialist Roster)
      │    ├── StaffTable (Roster List, Active Status Badges)
      │    ├── StaffModal (Onboarding & Role Configuration)
      │    ├── ConfirmDialog (Delete Confirmation)
      │    └── Toast (Feedback Notifications)
      │
      └── /dashboard/services (Services Catalog)
           ├── ServiceTable (Catalog List, Duration Badges)
           ├── ServiceModal (Service Creation & Minute Duration Setup)
           ├── ConfirmDialog (Delete Confirmation)
           └── Toast (Feedback Notifications)
```

---

## 4. Business Context & Multi-Tenant State Flow

State is managed via React Context in [`frontend/src/context/BusinessContext.tsx`](../frontend/src/context/BusinessContext.tsx):

```text
[ AuthProvider ]
       │
       ▼ (User Authenticated)
[ BusinessProvider ]
       │
       ├──> Fetch api.businesses.getAll() via HTTP-only cookie
       │      │
       │      ├── 0 Businesses: Empty state guidance
       │      ├── 1 Business: Auto-selected as active tenant
       │      └── >1 Businesses: Selects primary or saved preference
       │
       ▼
[ useBusiness() Hook ] ─── Provides: { selectedBusiness, selectedBusinessId, businesses, selectBusiness }
       │
       ├──> DashboardOverview -> useDashboardStats() (Dynamic aggregates)
       ├──> CustomersPage     -> api.customers.getAll(selectedBusinessId)
       ├──> StaffPage         -> api.staff.getAll(selectedBusinessId)
       └──> ServicesPage      -> api.services.getAll(selectedBusinessId)
```

### Stale Data Prevention & Concurrency Safety
When the user switches the active business:
1. `selectedBusinessId` updates.
2. Pages immediately clear the previous business's state array (`setCustomers([])`, `setStaffList([])`, `setServices([])`) to prevent data flashing.
3. An active request counter (`activeRequestId.current`) ensures that slow or out-of-order API responses from previous requests are discarded safely.

---

## 5. Real Backend APIs Used

| Domain | Method & Endpoint | Scoping Parameter | Derived Metric / Action |
|---|---|---|---|
| **Businesses** | `GET /api/businesses` | Authenticated `req.user.userId` | Populates active business dropdown |
| **Customers** | `GET /api/customers?businessId=...` | Verified `businessId` | Lists client records |
| **Customers** | `POST /api/customers` | Verified `businessId` | Registers new caller record |
| **Customers** | `PUT /api/customers/:id` | Ownership Verified | Updates caller record |
| **Customers** | `DELETE /api/customers/:id` | Ownership Verified | Permanently deletes caller |
| **Staff** | `GET /api/staff?businessId=...` | Verified `businessId` | Lists specialists |
| **Staff** | `POST /api/staff` | Verified `businessId` | Onboards new staff specialist |
| **Staff** | `PUT /api/staff/:id` | Ownership Verified | Updates role and availability |
| **Staff** | `DELETE /api/staff/:id` | Ownership Verified | Removes specialist |
| **Services** | `GET /api/services?businessId=...` | Verified `businessId` | Lists catalog offerings |
| **Services** | `POST /api/services` | Verified `businessId` | Adds bookable service |
| **Services** | `PUT /api/services/:id` | Ownership Verified | Updates service & duration |
| **Services** | `DELETE /api/services/:id` | Ownership Verified | Removes service offering |
| **Appointments** | `GET /api/appointments` | *Scheduled for Phase 4* | Displayed as "Phase 4 Coming Soon" |
| **Health** | `GET /api/health` | Public diagnostic | System diagnostic heartbeat |

---

## 6. Sub-Route Navigation & Module Status

| Route | Sub-Module Title | Milestone Status | Description |
|---|---|---|---|
| `/dashboard` | Main Overview | **Phase 3.3 (Completed)** | Real-data stats, quick actions, AI cards, system status |
| `/dashboard/customers` | Customer Directory | **Phase 3.4 (Completed)** | Full real-data CRUD, client-side search, modal forms |
| `/dashboard/staff` | Staff Roster | **Phase 3.4 (Completed)** | Full real-data CRUD, role configuration, active status |
| `/dashboard/services` | Services Catalog | **Phase 3.4 (Completed)** | Full real-data CRUD, duration minute setup, catalog toggle |
| `/dashboard/appointments` | Appointments Calendar | **Phase 4 (Upcoming)** | Autonomous AI slot locking & calendar scheduling |
| `/dashboard/conversations` | Conversation Logs | **Phase 4 (Upcoming)** | Turn-by-turn dialogue transcripts & AI summaries |
| `/dashboard/ai-receptionist` | AI Receptionist Engine | **Phase 4 & 5 (Upcoming)** | Persona tuning, Ollama local LLM, Whisper STT, Piper TTS |
| `/dashboard/settings` | System Settings | **Phase 6 (Upcoming)** | Business profile info, operating hours, notification webhooks |

---

## 7. Future AI Performance & Latency Telemetry

A core long-term requirement is **low response latency** during live voice dialogues between callers on mobile phones and the AI receptionist running on the laptop. The dashboard reserves telemetry tracking for:

```text
┌─────────────────────────────────────────────────────────────┐
│                 AI Voice Dialogue Latency                   │
│                                                             │
│  [ Speech-to-Text ] ──> [ LLM Generation ] ──> [ TTS Audio ]│
│    (Whisper STT)            (Ollama)             (Piper)    │
│      < 250ms                 < 200ms             < 350ms    │
│                                                             │
│        Target End-to-End Latency: < 800ms                   │
└─────────────────────────────────────────────────────────────┘
```

- **Speech-to-Text (STT) Latency:** Target `< 250ms` using local Whisper streaming.
- **Time to First Token (TTFT):** Target `< 200ms` using Ollama local quantized models.
- **End-to-End Response Latency:** Target `< 600ms` for natural dialogue flow.
- **Time to First Audio (TTFA):** Target `< 350ms` using Piper neural text-to-speech.

---

## 8. Responsive Design Breakpoints

- **Desktop (`>= 1024px`):** Persistent 256px sidebar, comprehensive data tables, multi-column statistics grid.
- **Tablet (`768px - 1023px`):** Collapsible navigation, scrollable tables, responsive modal dialogs.
- **Mobile (`< 768px`):** Slide-over navigation drawer, card-based management views replacing wide tables, full-width touch-friendly modals.
