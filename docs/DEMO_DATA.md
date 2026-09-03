# Demonstration Dataset & Database Seeding Guide

This document details the **Phase 4 Demo Dataset**, seeding architecture, deterministic data distribution, verification tools, and demo user accounts in the **AI-Powered Smart Receptionist Platform**.

---

## 1. Purpose of the Demo Dataset

To satisfy capstone faculty demonstration requirements and provide realistic operational context for future local AI receptionists, the platform includes a **100+ record deterministic demonstration dataset**.

### Key Demonstration Highlights
- **Multi-Tenant Demonstration:** Showcases multiple independent business owners with isolated datasets and zero cross-tenant leakage.
- **Multi-Business Switching:** User 1 (`Dr. Sarah Jenkins`) owns multiple businesses (*Lumina Dental Care* and *Radiance Dermatology*), allowing instant switching in the dashboard header.
- **Realistic Industry Scenarios:** Simulates real-world service domains (Dental Care, Clinical Dermatology, Corporate Consulting, and Luxury Salon/Spa).
- **Live Booking Calendar:** Deterministically schedules active appointments for the **current day (Today)**, historical **completed & cancelled slots (Past)**, and upcoming **bookings (Future)**.
- **Zero Conflict Guarantee:** Every specialist's calendar is mathematically verified against interval overlaps ($S_1 < E_2 \land E_1 > S_2$).
- **Future AI Tool-Calling Readiness:** Provides rich customer directories, staff rosters, and service menus for AI voice receptionist scenarios (*e.g., "Do you have an appointment available for teeth whitening today?", "Is Dr. Thorne free tomorrow at 10 AM?"*).

---

## 2. Dataset Distribution Summary

| Entity | Record Count | Description |
|---|---|---|
| **Users** | `3` | Business owners with salted Bcrypt password hashes |
| **Businesses** | `4` | 4 distinct service enterprises (1 multi-business owner) |
| **Staff Specialists** | `16` | 4 active team members per enterprise with realistic roles |
| **Services Catalog** | `20` | 5 bookable services per enterprise (30m, 45m, 60m, 90m) |
| **Customers** | `56` | 14 unique clients per enterprise with distinct phone numbers |
| **Appointments** | `44` | 12 Today, 16 Past (Completed/Cancelled), 16 Future (Upcoming) |
| **TOTAL RECORDS** | **`143`** | **Exceeds the 100+ faculty requirement by 43%** |

---

## 3. Demo User Accounts & Businesses

> [!IMPORTANT]
> **DEVELOPMENT / DEMO ONLY CREDENTIALS**  
> The credentials listed below are strictly for local evaluation and capstone presentation. No production secrets or live personal accounts are used.

### Demo Login Matrix

| Demo User | Role | Demo Login Email | Demo Password | Owned Businesses |
|---|---|---|---|---|
| **Dr. Sarah Jenkins** | `BUSINESS_OWNER` | `sarah.jenkins@luminahealth.demo` | `DemoUser123!` | 1. **Lumina Dental Care**<br>2. **Radiance Dermatology & Aesthetics** |
| **Marcus Vance** | `BUSINESS_OWNER` | `marcus.vance@apexadvisory.demo` | `DemoUser123!` | 3. **Apex Strategy & Financial Advisory** |
| **Elena Rostova** | `BUSINESS_OWNER` | `elena.rostova@zenithsalon.demo` | `DemoUser123!` | 4. **Zenith Luxury Hair & Spa Studio** |

---

## 4. Seeding Architecture & Commands

The seeding suite is implemented in TypeScript using native Prisma client operations.

### File Structure
```text
backend/prisma/
├── schema.prisma              -> Prisma database models
├── seed.ts                    -> Seed runner with metrics reporter
├── verify-seed.ts             -> Comprehensive database verification script
└── seed-data/
    ├── users.ts               -> User credentials and role definitions
    ├── businesses.ts          -> Enterprise profiles and operating hours
    ├── staff.ts               -> Clinical and operational specialist rosters
    ├── services.ts            -> Service catalog with durationMinutes
    ├── customers.ts           -> Client directory with unique phone numbers
    └── appointments.ts        -> Deterministic relative-date appointment generator
```

### Seeding Commands

#### 1. Populate Demo Database
```bash
npm --prefix backend run db:seed
```
*Executes idempotent upserts for all 143 demo records.*

#### 2. Reset and Re-seed
```bash
npm --prefix backend run db:reset-demo
```
*Re-applies all demo data relative to the current execution date.*

#### 3. Run Automated Seed Verification
```bash
npm --prefix backend run db:verify-demo
```
*Validates record counts, multi-tenant ownership, password hashing, and zero scheduling conflicts.*

---

## 5. Appointment Distribution & Scheduling Logic

Appointments are generated relative to the execution timestamp (`Day 0 = Today`):

```text
       Past (-5 to -1 Days)                  Today (Day 0)                 Future (+1 to +7 Days)
┌────────────────────────────────┐  ┌───────────────────────────────┐  ┌────────────────────────────────┐
│  • 12 Completed appointments   │  │  • 8 Confirmed appointments   │  │  • 10 Confirmed appointments   │
│  • 4 Cancelled appointments    │  │  • 4 Scheduled appointments   │  │  • 6 Scheduled appointments    │
│  • Full treatment notes        │  │  • Morning & Afternoon slots  │  │  • Tomorrow, 2d, 3d, 5d, 7d    │
└────────────────────────────────┘  └───────────────────────────────┘  └────────────────────────────────┘
```

### Scheduling Guarantees
- **No Overlapping Slots:** For every assigned specialist, all active appointments satisfy:
  $$\text{Existing.startTime} \ge \text{New.endTime} \quad \lor \quad \text{Existing.endTime} \le \text{New.startTime}$$
- **Back-to-Back Permitted:** Specialists can have adjacent slots (*e.g., 10:00–10:30 and 10:30–11:00*).
- **Dynamic Duration Integrity:** Every appointment's `endTime` exactly matches `startTime + service.durationMinutes`.

---

## 6. Password Security & Idempotency

1. **Bcrypt Salt Hashing:** Seeded user passwords are encrypted using `bcrypt.hash(password, 10)` identically to the live registration flow.
2. **Deterministic UUIDs & Upserts:** All records utilize fixed UUID identifiers. Running `npm run db:seed` multiple times updates existing records without generating duplicate rows.
