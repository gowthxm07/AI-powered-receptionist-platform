# Database & Data Modeling Specification

This document details the database architecture, schema design, Prisma ORM configuration, entity relationships, and operational instructions for the **AI-Powered Smart Receptionist Platform**.

---

## 1. Overview & Technology Stack

- **Database Engine:** [PostgreSQL](https://www.postgresql.org/) (Version 16+)
- **ORM & Query Builder:** [Prisma ORM](https://www.prisma.io/) (v5.22+)
- **Validation Engine:** [Zod](https://zod.dev/) (v3.23+)
- **Deployment Strategy:** Local containerized via **Docker Compose** or native local PostgreSQL service.
- **Cost & Dependencies:** 100% Free, Local, and Open-Source. Zero external cloud database dependencies.

---

## 2. Environment Variables Configuration

The backend uses a standard PostgreSQL connection URI configured in `.env`:

```env
# Backend Database Connection String
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/receptionist_db?schema=public"
```

### Connection URI Breakdown
- `postgresql://`: Protocol
- `postgres:postgres`: `<USER>:<PASSWORD>`
- `localhost:5432`: `<HOST>:<PORT>`
- `receptionist_db`: `<DATABASE_NAME>`
- `?schema=public`: Target PostgreSQL schema

---

## 3. Database Schema Design & Entities

The schema is defined in [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma). It is designed to be industry-agnostic (supporting clinics, salons, hotels, legal practices, and consultancy firms).

### 3.1 Entity Breakdown

| Entity | Purpose | Key Fields | Relationships |
|---|---|---|---|
| **Business** | Tenant / Organization profile | `id`, `name`, `phone`, `email`, `address`, `timezone` | 1-to-many: Staff, Services, Appointments, Conversations |
| **Customer** | Caller / Client directory | `id`, `name`, `phone` (unique), `email` | 1-to-many: Appointments, Conversations |
| **Staff** | Service providers & receptionists | `id`, `businessId`, `name`, `email`, `phone`, `role`, `isActive` | Belongs to Business; 1-to-many: Appointments |
| **Service** | Bookable offerings / catalog | `id`, `businessId`, `name`, `description`, `durationMinutes`, `isActive` | Belongs to Business; 1-to-many: Appointments |
| **Appointment** | Scheduled calendar bookings | `id`, `businessId`, `customerId`, `staffId`, `serviceId`, `startTime`, `endTime`, `status`, `notes` | Belongs to Business, Customer, Staff (opt), Service |
| **Conversation** | AI dialogue sessions (preparatory) | `id`, `businessId`, `customerId`, `channel`, `status`, `startedAt`, `endedAt`, `summary` | Belongs to Business, Customer (opt); 1-to-many: Messages |
| **ConversationMessage** | Individual chat/voice dialogue turns | `id`, `conversationId`, `role`, `content`, `createdAt` | Belongs to Conversation |

---

### 3.2 Enums

```prisma
enum AppointmentStatus {
  SCHEDULED
  CONFIRMED
  COMPLETED
  CANCELLED
}

enum ConversationChannel {
  WEB
  VOICE
}

enum ConversationStatus {
  ACTIVE
  COMPLETED
  ESCALATED
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}
```

---

## 4. Entity-Relationship Diagram (ERD)

```text
┌──────────────┐          1:N          ┌──────────────┐
│   Customer   ├───────────────────────┤ Appointment  │
│  (id, phone) │                       │ (startTime)  │
└──────┬───────┘                       └──────┬───────┘
       │                                      │
       │ 1:N                                  │ N:1
       ▼                                      ▼
┌──────────────┐          1:N          ┌──────────────┐
│ Conversation ├───────────────────────┤   Business   │
│  (channel)   │                       │  (timezone)  │
└──────┬───────┘                       └──────┬───────┘
       │                                      │
       │ 1:N                                  │ 1:N
       ▼                                      ▼
┌─────────────────────┐                ┌──────────────┐
│ ConversationMessage │                │    Staff     │
│   (role, content)   │                │ (role, name) │
└─────────────────────┘                └──────┬───────┘
                                              │
                                              │ 1:N
                                              ▼
                                       ┌──────────────┐
                                       │   Service    │
                                       │  (duration)  │
                                       └──────────────┘
```

---

## 5. Docker Setup & Management

A [`docker-compose.yml`](../docker-compose.yml) file is located at the project root for containerized PostgreSQL.

### 5.1 Start PostgreSQL with Docker Compose
```bash
# From project root
docker compose up -d
```

### 5.2 Check Database Container Status
```bash
docker compose ps
```

### 5.3 View Database Logs
```bash
docker compose logs -f postgres
```

### 5.4 Stop PostgreSQL Container
```bash
docker compose down
```
*(Data persists safely in the named Docker volume `postgres_data`)*

---

## 6. Prisma Commands & Migration Workflow

All Prisma commands are run inside the `backend/` directory (or via root workspace scripts):

### Validate Schema
```bash
npm --prefix backend run db:validate
# or
cd backend && npx prisma validate
```

### Generate Prisma Client
```bash
npm --prefix backend run db:generate
# or
cd backend && npx prisma generate
```

### Apply Migrations (Development)
```bash
npm --prefix backend run db:migrate
# or
cd backend && npx prisma migrate dev --name init_database_foundation
```

### Push Schema Directly to Database
```bash
npm --prefix backend run db:push
# or
cd backend && npx prisma db push
```

### Launch Prisma Studio (GUI Database Viewer)
```bash
npm --prefix backend run db:studio
# Opens interactive browser UI at http://localhost:5555
```

---

## 7. REST API Endpoints (Phase 2)

### 7.1 Businesses API (`/api/businesses`)
- `POST /api/businesses` — Create business profile.
- `GET /api/businesses` — List all businesses with entity count summaries.
- `GET /api/businesses/:id` — Retrieve business details, staff members, and services.
- `PUT /api/businesses/:id` — Update business profile.
- `DELETE /api/businesses/:id` — Remove business (cascades associated staff and services).

### 7.2 Customers API (`/api/customers`)
- `POST /api/customers` — Create customer with unique phone number.
- `GET /api/customers` — List all registered customers.
- `GET /api/customers/:id` — Retrieve customer profile, recent appointments, and conversation logs.
- `PUT /api/customers/:id` — Update customer details.
- `DELETE /api/customers/:id` — Remove customer record.

### 7.3 Staff API (`/api/staff`)
- `POST /api/staff` — Create staff member linked to a `businessId`.
- `GET /api/staff` — List staff (supports filtering: `?businessId=<UUID>`).
- `GET /api/staff/:id` — Retrieve staff member details with assigned appointments.
- `PUT /api/staff/:id` — Update staff profile or active status.
- `DELETE /api/staff/:id` — Remove staff member.

### 7.4 Services API (`/api/services`)
- `POST /api/services` — Create service catalog entry linked to `businessId`.
- `GET /api/services` — List services (supports filtering: `?businessId=<UUID>`).
- `GET /api/services/:id` — Retrieve service details and duration.
- `PUT /api/services/:id` — Update service parameters.
- `DELETE /api/services/:id` — Remove service offering.

---

## 8. Standard API Response Structure

### Success Envelope (HTTP 200 / 201)
```json
{
  "success": true,
  "message": "Business created successfully",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Downtown Wellness Clinic",
    "phone": "+1-555-0100",
    "email": "info@downtownwellness.com",
    "address": "450 Main St, Suite 200",
    "timezone": "America/New_York",
    "createdAt": "2026-09-02T15:30:00.000Z",
    "updatedAt": "2026-09-02T15:30:00.000Z"
  }
}
```

### Validation Error Envelope (HTTP 400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "phone",
      "message": "Phone number is required"
    }
  ]
}
```

### Unique Constraint Violation Envelope (HTTP 409)
```json
{
  "success": false,
  "message": "A record with this phone already exists",
  "errors": [
    {
      "field": "phone",
      "message": "Duplicate value violates unique constraint"
    }
  ]
}
```
