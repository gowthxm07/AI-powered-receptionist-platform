# Authentication, Authorization & Business Data Isolation Architecture

This document describes the complete architecture, implementation, security properties, and endpoints of the **Authentication, Authorization & Multi-Tenant Business Data Isolation System** for the **AI-Powered Smart Receptionist Platform**.

---

## 1. Overview & Technology Stack

- **Authentication Strategy:** Decoupled JWT (JSON Web Tokens) with HTTP-Only Cookie Storage and Bearer Token header fallback.
- **Authorization & Data Isolation:** Server-enforced tenancy rules via `OwnershipService` mapping verified `req.user.userId` to owned `Business` models and child resources.
- **Frontend State:** React Context (`AuthContext` + `AuthProvider`) with automatic `/api/auth/me` session validation on initialization.
- **Frontend API Client:** Centralized `fetcher` abstraction using `credentials: "include"` for secure, client-side token-free cookie transmission.
- **Password Hashing:** `bcryptjs` with 10 salt rounds.
- **Token Management:** `jsonwebtoken` signed with symmetric `JWT_SECRET`.
- **Cookie Parser:** `cookie-parser` Express middleware.
- **Validation Engine:** `zod` for backend payload validation, coupled with client-side reactive form validation.
- **Cost & Dependencies:** 100% Free, Local, and Open-Source. Zero third-party cloud authentication dependencies (no Clerk, Auth0, Firebase, or Supabase).

---

## 2. Multi-Tenant Relational Domain Model

Defined in [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma):

```prisma
enum UserRole {
  ADMIN
  BUSINESS_OWNER
}

model User {
  id           String     @id @default(uuid())
  name         String
  email        String     @unique
  passwordHash String
  role         UserRole   @default(BUSINESS_OWNER)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  // Relations
  businesses   Business[]

  @@map("users")
}

model Business {
  id          String   @id @default(uuid())
  ownerId     String?
  name        String
  phone       String
  email       String
  address     String?
  description String?
  timezone    String   @default("UTC")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  owner         User?         @relation(fields: [ownerId], references: [id], onDelete: SetNull)
  customers     Customer[]
  staff         Staff[]
  services      Service[]
  appointments  Appointment[]
  conversations Conversation[]

  @@index([ownerId])
  @@map("businesses")
}

model Customer {
  id         String   @id @default(uuid())
  businessId String?
  name       String
  phone      String   @unique
  email      String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // Relations
  business      Business?      @relation(fields: [businessId], references: [id], onDelete: Cascade)
  appointments  Appointment[]
  conversations Conversation[]

  @@index([businessId])
  @@map("customers")
}
```

---

## 3. Business Data Isolation & Access Control Rules

```text
USER (Authenticated via verified JWT cookie)
 │
 ▼
REQUEST.USER (req.user.userId, req.user.role)
 │
 ├──> OWNED BUSINESSES (businesses WHERE ownerId = req.user.userId)
 │      │
 │      ├──> CUSTOMERS (customers WHERE businessId IN ownedBusinesses)
 │      ├──> STAFF     (staff WHERE businessId IN ownedBusinesses)
 │      └──> SERVICES  (services WHERE businessId IN ownedBusinesses)
```

### Security Enforcement Principles
1. **Server-Derived Identity:** The authenticated user identity is derived strictly from `req.user.userId` via verified JWT signature. Client-supplied user IDs in request bodies or query params are **never** trusted.
2. **Mandatory Authentication:** All domain routes (`/api/businesses`, `/api/customers`, `/api/staff`, `/api/services`) are protected by `authenticate` middleware.
3. **Cross-Tenant Access Rejection:** If User A attempts to view, modify, or delete a resource (business, staff, service, or customer) belonging to Business B (owned by User B), the backend immediately rejects the request with **HTTP 403 Forbidden**.
4. **Creation Tenancy Guard:** When creating child resources (customers, staff, services), the provided `businessId` is verified against `req.user.userId`. If the user does not own `businessId`, creation is rejected with **HTTP 403 Forbidden**.
5. **Scoped List Queries:** `GET` collection endpoints automatically filter resources to only those belonging to businesses owned by the caller.

---

## 4. Reusable Ownership Verification Engine

Located at [`backend/src/services/ownership.service.ts`](../backend/src/services/ownership.service.ts):

- `verifyBusinessOwnership(businessId, userId, role)`: Ensures `business.ownerId === userId` (or bypasses for `ADMIN`). Throws `NotFoundError` (404) or `ForbiddenError` (403).
- `getOwnedBusinessIds(userId, role)`: Returns array of business IDs owned by the user for scoping relational queries.
- `verifyStaffOwnership(staffId, userId, role)`: Verifies that the staff member belongs to an owned business.
- `verifyServiceOwnership(serviceId, userId, role)`: Verifies that the service belongs to an owned business.
- `verifyCustomerOwnership(customerId, userId, role)`: Verifies that the customer is directly or relationally linked to an owned business.

---

## 5. HTTP Status Code Strategy

| Code | Status | Trigger Condition |
|---|---|---|
| `200` | OK | Successful retrieval, update, or deletion of owned resources |
| `201` | Created | Successful insertion of user, business, customer, staff, or service |
| `400` | Bad Request | Zod schema validation errors (e.g. empty name, invalid UUID format) |
| `401` | Unauthorized | Missing, invalid, or expired JWT authentication cookie |
| `403` | Forbidden | Authenticated user attempting to access/modify another user's business data |
| `404` | Not Found | Target record does not exist in the database |
| `409` | Conflict | Unique constraint violation (duplicate email or customer phone) |

---

## 6. Authentication & Domain API Reference

| Method | Endpoint | Auth Required | Multi-Tenant Authorization Rule |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Public registration; creates user record |
| `POST` | `/api/auth/login` | No | Public login; sets HTTP-only `auth_token` cookie |
| `GET` | `/api/auth/me` | **Yes** | Returns authenticated profile for `req.user.userId` |
| `POST` | `/api/auth/logout` | No | Clears `auth_token` cookie |
| `POST` | `/api/businesses` | **Yes** | Sets `ownerId: req.user.userId` |
| `GET` | `/api/businesses` | **Yes** | Returns only businesses owned by caller (`ownerId = req.user.userId`) |
| `GET` | `/api/businesses/:id` | **Yes** | Verifies `business.ownerId === req.user.userId` |
| `PUT` | `/api/businesses/:id` | **Yes** | Verifies ownership before update |
| `DELETE` | `/api/businesses/:id` | **Yes** | Verifies ownership before deletion |
| `POST` | `/api/customers` | **Yes** | Verifies caller owns `businessId` before insertion |
| `GET` | `/api/customers` | **Yes** | Returns only customers belonging to owned businesses |
| `GET` | `/api/customers/:id` | **Yes** | Verifies customer belongs to owned business |
| `PUT` | `/api/customers/:id` | **Yes** | Verifies ownership before update |
| `DELETE` | `/api/customers/:id` | **Yes** | Verifies ownership before deletion |
| `POST` | `/api/staff` | **Yes** | Verifies caller owns `businessId` before insertion |
| `GET` | `/api/staff` | **Yes** | Returns only staff belonging to owned businesses |
| `GET` | `/api/staff/:id` | **Yes** | Verifies staff belongs to owned business |
| `PUT` | `/api/staff/:id` | **Yes** | Verifies ownership before update |
| `DELETE` | `/api/staff/:id` | **Yes** | Verifies ownership before deletion |
| `POST` | `/api/services` | **Yes** | Verifies caller owns `businessId` before insertion |
| `GET` | `/api/services` | **Yes** | Returns only services belonging to owned businesses |
| `GET` | `/api/services/:id` | **Yes** | Verifies service belongs to owned business |
| `PUT` | `/api/services/:id` | **Yes** | Verifies ownership before update |
| `DELETE` | `/api/services/:id` | **Yes** | Verifies ownership before deletion |
