# Appointment Management & Scheduling Architecture

This document describes the design, conflict detection algorithm, lifecycle states, availability API, multi-tenant security guarantees, and concurrency considerations of the **Appointment Management and Scheduling System (Phase 3.5)** in the **AI-Powered Smart Receptionist Platform**.

---

## 1. Overview & Low-Latency Foundation

The appointment scheduling subsystem provides an autonomous booking and schedule coordination foundation for the platform. Designed with low-latency REST APIs, it allows human business operators and future local AI voice receptionists (via tool calling) to query specialist availability and lock in bookings efficiently.

### Key Architectural Principles
- **Clean Relational Schema:** Every appointment references `Business`, `Customer`, `Staff` (optional/nullable for unassigned slots), and `Service`.
- **Dynamic Service Duration:** End times are derived dynamically from the catalog service's `durationMinutes` without requiring client manual math.
- **Accurate Conflict Detection:** Prevents double-booking specialists across overlapping time windows while supporting clean back-to-back appointments.
- **Strict Multi-Tenant Scoping:** Cross-business resource injection (e.g. User A booking with Customer B) is rejected at the service level.
- **Historical Integrity:** Cancellations are soft status updates (`status: CANCELLED`), preserving caller dialogue audit trails.

---

## 2. Appointment Data Model & Schema

```prisma
enum AppointmentStatus {
  SCHEDULED
  CONFIRMED
  COMPLETED
  CANCELLED
  NO_SHOW
}

model Appointment {
  id         String            @id @default(uuid())
  businessId String
  customerId String
  staffId    String?
  serviceId  String
  startTime  DateTime
  endTime    DateTime
  status     AppointmentStatus @default(SCHEDULED)
  notes      String?
  createdAt  DateTime          @default(now())
  updatedAt  DateTime          @updatedAt

  // Relations
  business Business @relation(fields: [businessId], references: [id], onDelete: Cascade)
  customer Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  staff    Staff?   @relation(fields: [staffId], references: [id], onDelete: SetNull)
  service  Service  @relation(fields: [serviceId], references: [id], onDelete: Cascade)

  @@index([businessId])
  @@index([businessId, startTime])
  @@index([customerId])
  @@index([staffId])
  @@index([staffId, startTime])
  @@index([serviceId])
  @@index([startTime])
  @@map("appointments")
}
```

### Relational Cascade Policies
- **Business (`onDelete: Cascade`):** Deleting a business tenant removes its appointment records.
- **Customer (`onDelete: Cascade`):** Deleting a customer removes associated records.
- **Staff (`onDelete: SetNull`):** Removing a staff member preserves historical appointment logs with `staffId = null`.
- **Service (`onDelete: Cascade`):** Deleting a service offering cascades to linked appointments.

---

## 3. Conflict Detection Algorithm

The scheduling engine uses an **interval overlap formula** to detect booking collisions for assigned specialists.

### Overlap Condition
Two time intervals $[S_1, E_1)$ and $[S_2, E_2)$ overlap if and only if:
$$\text{Existing.startTime} < \text{New.endTime} \quad \text{AND} \quad \text{Existing.endTime} > \text{New.startTime}$$

```text
Existing:  [======== 10:00 - 11:00 ========)
Attempt 1:        [== 10:30 - 11:30 ==)      -> OVERLAP (Rejected: 409 Conflict)
Attempt 2: [== 09:30 - 10:30 ==)            -> OVERLAP (Rejected: 409 Conflict)
Attempt 3: [======== 10:00 - 11:00 ========) -> OVERLAP (Rejected: 409 Conflict)
Attempt 4: [ 09:00 - 10:00 )                -> ALLOWED (Back-to-back before)
Attempt 5:                                 [ 11:00 - 12:00 ) -> ALLOWED (Back-to-back after)
```

### Excluded Statuses
- Appointments with `status = 'CANCELLED'` are explicitly excluded from conflict detection, releasing the time slot immediately for rebooking.
- When **rescheduling** an existing appointment, the current `appointment.id` is excluded (`id != currentId`) so the booking does not conflict with itself.

---

## 4. Multi-Tenant Cross-Resource Security

Every creation and update request validates that all referenced foreign entities belong to the verified tenant:

1. `OwnershipService.verifyBusinessOwnership(businessId, userId)`: Verifies caller owns the business.
2. `customer.businessId === businessId`: Prevents booking callers from other tenants.
3. `staff.businessId === businessId`: Prevents assigning specialists from other clinics.
4. `service.businessId === businessId`: Prevents attaching services from other business catalogs.

Cross-tenant tampering attempts are rejected with `HTTP 400 Bad Request` or `HTTP 403 Forbidden`.

---

## 5. Availability Check API

Designed specifically for real-time frontend indicators and future AI tool calling:

```http
GET /api/appointments/availability?businessId={uuid}&staffId={uuid}&startTime=2026-10-15T10:00:00.000Z&durationMinutes=60
```

### Response Formats
- **When Available (HTTP 200):**
  ```json
  {
    "success": true,
    "message": "Time slot is available",
    "data": { "available": true }
  }
  ```
- **When Unavailable (HTTP 200):**
  ```json
  {
    "success": true,
    "message": "Time slot is unavailable",
    "data": {
      "available": false,
      "reason": "The selected staff member is already booked during this time interval."
    }
  }
  ```
*(Privacy Note: Conflicting customer details are strictly redacted).*

---

## 6. Concurrency Handling & Limitations

- **Transaction Wrapping:** Booking operations are executed inside `prisma.$transaction` to perform conflict check and creation atomically.
- **Concurrency Note:** In standard single/multi-node deployments, transactional validation prevents double-booking. Under extreme high-concurrency microsecond race conditions without PostgreSQL exclusion constraints (`btree_gist`), application-level check-and-insert provides standard ACID isolation.

---

## 7. Frontend Management UI & Workflow

The `/dashboard/appointments` interface provides:
- **Filters:** Scoped by appointment status (`SCHEDULED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`) and staff specialist.
- **Dynamic Service Duration:** Selecting a service automatically displays duration in minutes and calculates the projected end time.
- **Availability Feedback:** Interactive "Check Availability" badge in modal.
- **One-Click Actions:** Mark Completed, Reschedule / Edit, Cancel Appointment (with slot release).
- **Responsive Layout:** Full desktop data table with responsive card transformations on tablets and mobile devices.
