# Authentication & Authorization Architecture

This document describes the complete architecture, implementation, security properties, and endpoints of the **Authentication and Authorization System** (Backend Foundation Phase 3.1 & Frontend Integration Phase 3.2) for the **AI-Powered Smart Receptionist Platform**.

---

## 1. Overview & Technology Stack

- **Authentication Strategy:** Decoupled JWT (JSON Web Tokens) with HTTP-Only Cookie Storage and Bearer Token header fallback.
- **Frontend State:** React Context (`AuthContext` + `AuthProvider`) with automatic `/api/auth/me` session validation on initialization.
- **Frontend API Client:** Centralized `fetcher` abstraction using `credentials: "include"` for secure, client-side token-free cookie transmission.
- **Password Hashing:** `bcryptjs` with 10 salt rounds.
- **Token Management:** `jsonwebtoken` signed with symmetric `JWT_SECRET`.
- **Cookie Parser:** `cookie-parser` Express middleware.
- **Validation Engine:** `zod` for backend payload validation, coupled with client-side reactive form validation.
- **Cost & Dependencies:** 100% Free, Local, and Open-Source. Zero third-party cloud authentication dependencies (no Clerk, Auth0, Firebase, or Supabase).

---

## 2. User Model & Role Design

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
```

### Business Ownership Relationship
A `User` (specifically with role `BUSINESS_OWNER` or `ADMIN`) can own or manage multiple `Business` records via the optional `ownerId` foreign key on the `Business` model:

```text
User (id, email, role)
  │
  └── 1:N ──> Business (id, ownerId, name)
                ├── Staff
                ├── Services
                ├── Appointments
                └── Conversations
```

---

## 3. Password Security Workflow

Passwords are encrypted using `bcryptjs` before storage:

```text
Plaintext Password  ──>  bcrypt.hash(password, 10)  ──>  passwordHash ($2a$10$...)  ──>  PostgreSQL (users.passwordHash)
```

### Security Invariants
- Plaintext passwords are **never** persisted.
- `passwordHash` is **never** returned in any API response envelope.
- Bcrypt verification (`bcrypt.compare`) prevents timing attack vulnerabilities.

---

## 4. JWT & Cookie Architecture

### Token Payload
The JWT payload contains only minimal non-sensitive identity metadata:
```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "email": "owner@clinic.com",
  "role": "BUSINESS_OWNER",
  "iat": 1788370000,
  "exp": 1788974800
}
```

### HTTP-Only Cookie Configuration
The token is set in the `auth_token` cookie with the following security attributes:

| Option | Value | Purpose |
|---|---|---|
| `httpOnly` | `true` | Prevents client-side JavaScript access (mitigates XSS token theft) |
| `secure` | `production` only | Enforces HTTPS in production while permitting local HTTP development |
| `sameSite` | `'lax'` | Protects against Cross-Site Request Forgery (CSRF) |
| `maxAge` | `7 days` | 7-day session persistence |
| `path` | `'/'` | Available across all application routes |

---

## 5. Frontend Authentication Architecture

### 5.1 API Client (`frontend/src/lib/api.ts`)
The frontend communicates with the Express backend using a typed API client:
- Configured with `NEXT_PUBLIC_API_URL` (default: `http://localhost:5000`).
- Every request includes `credentials: "include"` so the browser automatically handles sending and receiving the `auth_token` cookie.
- No tokens are stored in `localStorage`, `sessionStorage`, or JavaScript memory variables.

### 5.2 Context State (`frontend/src/context/AuthContext.tsx`)
Provides global authentication state:
- `user`: Authenticated user profile or `null`.
- `loading`: Initialization and verification flag.
- `isAuthenticated`: Boolean status (`!!user`).
- `register(input)`: Executes registration and updates user state.
- `login(input)`: Executes login, receives cookie, and updates user state.
- `logout()`: Invalids cookie via backend and resets state to `null`.
- `refreshUser()`: Re-fetches `/api/auth/me` on startup or route transitions.

### 5.3 Protected Route Wrapper (`frontend/src/components/ProtectedRoute.tsx`)
Guards private pages (e.g. `/dashboard`):
- Displays a spinner while `loading` is `true`.
- Redirects unauthenticated guests immediately to `/login`.
- Prevents protected content flashes before authentication check completes.

### 5.4 Authenticated Redirection
- When an already authenticated user navigates to `/login` or `/register`, they are automatically redirected to `/dashboard`.

---

## 6. Authentication API Endpoints

### 6.1 Register (`POST /api/auth/register`)
- **Request Body:**
  ```json
  {
    "name": "Dr. Jane Owner",
    "email": "jane@wellness.com",
    "password": "SecurePassword123!",
    "role": "BUSINESS_OWNER"
  }
  ```
- **Response (`HTTP 201 Created`):**
  - Sets `Set-Cookie: auth_token=...; HttpOnly; SameSite=Lax; Path=/`
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "data": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Dr. Jane Owner",
      "email": "jane@wellness.com",
      "role": "BUSINESS_OWNER",
      "createdAt": "2026-09-02T17:00:00.000Z",
      "updatedAt": "2026-09-02T17:00:00.000Z"
    }
  }
  ```

### 6.2 Login (`POST /api/auth/login`)
- **Request Body:**
  ```json
  {
    "email": "jane@wellness.com",
    "password": "SecurePassword123!"
  }
  ```
- **Response (`HTTP 200 OK`):**
  - Sets `Set-Cookie: auth_token=...; HttpOnly; SameSite=Lax; Path=/`
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Dr. Jane Owner",
      "email": "jane@wellness.com",
      "role": "BUSINESS_OWNER",
      "createdAt": "2026-09-02T17:00:00.000Z",
      "updatedAt": "2026-09-02T17:00:00.000Z"
    }
  }
  ```
- **Error Response (`HTTP 401 Unauthorized`):**
  Returns generic error message to prevent account enumeration:
  ```json
  {
    "success": false,
    "message": "Invalid email or password"
  }
  ```

### 6.3 Get Current User Profile (`GET /api/auth/me`)
- **Headers / Cookie:** Requires `auth_token` cookie or `Authorization: Bearer <token>`
- **Response (`HTTP 200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "Dr. Jane Owner",
      "email": "jane@wellness.com",
      "role": "BUSINESS_OWNER",
      "createdAt": "2026-09-02T17:00:00.000Z",
      "updatedAt": "2026-09-02T17:00:00.000Z"
    }
  }
  ```

### 6.4 Logout (`POST /api/auth/logout`)
- **Response (`HTTP 200 OK`):**
  - Clears `auth_token` cookie: `Set-Cookie: auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

---

## 7. Environment Variables

### Backend (`backend/.env` & `backend/.env.example`)
```env
# Authentication Configuration
JWT_SECRET=replace_with_secure_random_secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
```

### Frontend (`frontend/.env.local` & `frontend/.env.example`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```
