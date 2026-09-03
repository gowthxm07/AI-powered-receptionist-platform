# Multi-Tenant Dashboard Architecture

This document describes the design, component hierarchy, multi-tenant state management, real-data integration, and future AI telemetry specifications of the **Professional Multi-Tenant Dashboard Foundation (Phase 3.3)** for the **AI-Powered Smart Receptionist Platform**.

---

## 1. Overview & SaaS Architecture

The dashboard serves as the central administrative workspace for business owners and operators to monitor front-desk operations, review customer directories, manage staff rosters, configure service catalogs, and supervise autonomous AI receptionists.

### Key Architectural Principles
- **Real Backend Data:** Dashboard metrics are derived dynamically from secured Express REST endpoints backed by PostgreSQL. No hardcoded or fabricated statistics are used.
- **Strict Multi-Tenancy:** The dashboard operates within an active **Business Context**. All statistics, customer records, staff members, and service offerings are scoped to the selected business tenant.
- **Security Boundary:** The frontend business selector is a UI convenience; the backend `OwnershipService` remains the authoritative security boundary, enforcing that `business.ownerId === req.user.userId`.
- **Responsive Layout:** Persistent sidebar on desktop viewports, responsive collapsibility on tablets, and slide-over navigation drawer on mobile viewports.
- **Future AI Extensibility:** Reserved architecture for sub-second AI latency telemetry (STT, TTFT, AI Response, and TTFA).

---

## 2. Component Hierarchy & Layout Tree

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
      └── Page Content (e.g., DashboardOverview)
           ├── Welcome Banner (Tenant Name, Phone, Isolation Badge)
           ├── StatsCard Grid (Customers, Staff, Services, Upcoming Bookings)
           ├── QuickActions (Shortcuts to Core Workflows)
           ├── AIReceptionistCard (Offline / Local AI Stack Preview)
           ├── AIPerformanceCard (Sub-second Latency Telemetry Placeholder)
           ├── RecentActivity (Honest Event Stream Placeholder)
           └── SystemStatus (PostgreSQL, Tenant Isolation, HTTP-Only Cookie Session)
```

---

## 3. Business Context & Multi-Tenant State Flow

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
       ▼
[ useDashboardStats() Hook ]
       │
       ├──> Calls api.customers.getAll(selectedBusinessId)
       ├──> Calls api.staff.getAll(selectedBusinessId)
       └──> Calls api.services.getAll(selectedBusinessId)
              │
              ▼ (Parallel Resolution)
       Computes Real Metrics:
         • totalCustomers = customers.length
         • activeStaff = staff.filter(s => s.isActive).length
         • totalStaff = staff.length
         • availableServices = services.filter(s => s.isActive).length
         • totalServices = services.length
         • upcomingAppointments = null (Phase 4 module)
```

---

## 4. Real Backend APIs Used

| Domain | Method & Endpoint | Scoping Parameter | Derived Metric |
|---|---|---|---|
| **Businesses** | `GET /api/businesses` | Authenticated `req.user.userId` | Populates active business dropdown |
| **Customers** | `GET /api/customers?businessId=...` | Verified `businessId` | `totalCustomers` count |
| **Staff** | `GET /api/staff?businessId=...` | Verified `businessId` | `activeStaff` / `totalStaff` |
| **Services** | `GET /api/services?businessId=...` | Verified `businessId` | `availableServices` / `totalServices` |
| **Appointments** | `GET /api/appointments` | *Scheduled for Phase 4* | Displayed as "Phase 4 Coming Soon" |
| **Health** | `GET /api/health` | Public diagnostic | System diagnostic heartbeat |

---

## 5. Sub-Route Navigation & Placeholder Strategy

All dashboard routes are guarded against unauthenticated access. Sub-routes for future phases provide clean, descriptive roadmap guidance:

| Route | Sub-Module Title | Scheduled Phase | Description |
|---|---|---|---|
| `/dashboard` | Main Overview | **Phase 3.3 (Active)** | Real-data stats, quick actions, AI cards, system status |
| `/dashboard/customers` | Customer Directory | **Phase 6** | Searchable caller database, profiles, interaction timelines |
| `/dashboard/staff` | Staff Roster | **Phase 6** | Specialist availability, operating roles, calendar linking |
| `/dashboard/services` | Services Catalog | **Phase 6** | Bookable service catalog with minute durations and FAQs |
| `/dashboard/appointments` | Appointments Calendar | **Phase 4** | Autonomous AI slot locking & calendar scheduling |
| `/dashboard/conversations` | Conversation Logs | **Phase 4** | Turn-by-turn dialogue transcripts & AI summaries |
| `/dashboard/ai-receptionist` | AI Receptionist Engine | **Phase 4 & Phase 5** | Persona tuning, Ollama local LLM, Whisper STT, Piper TTS |
| `/dashboard/settings` | System Settings | **Phase 6** | Business profile info, operating hours, notification webhooks |

---

## 6. Future AI Performance & Latency Telemetry

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

## 7. Responsive Design Breakpoints

- **Desktop (`>= 1024px`):** Persistent 64px/256px sidebar, multi-column statistics grid, 2-column operational layout.
- **Tablet (`768px - 1023px`):** Collapsible sidebar, 2-column statistics grid, responsive header with business selector.
- **Mobile (`< 768px`):** Slide-over navigation drawer, single-column stacked statistics cards, compact business selector.
