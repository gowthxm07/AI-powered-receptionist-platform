import assert from 'assert';
import { prisma } from '../lib/prisma';
import { createApp } from '../app';
import http from 'http';

export async function runAppointmentTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- Running Appointment Scheduling & Conflict Tests ---');
  console.log('======================================================\n');

  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 5000;
  const baseUrl = `http://localhost:${port}`;

  let userACookie = '';
  let userBCookie = '';
  let userAId = '';
  let userBId = '';

  let businessAId = '';
  let businessBId = '';

  let customerAId = '';
  let customerBId = '';

  let staffAId = '';
  let staffBId = '';

  let serviceAId = '';
  let serviceBId = '';

  let createdAppointmentId = '';

  try {
    // ----------------------------------------------------
    // SETUP: Register User A & User B with their businesses
    // ----------------------------------------------------
    console.log('1. Setting up Test Users and Multi-Tenant Businesses:');

    // Register User A
    const regResA = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Doctor A',
        email: `doctor_a_${Date.now()}@clinic.local`,
        password: 'Password123!',
      }),
    });
    assert.strictEqual(regResA.status, 201, 'User A registration should succeed');
    userACookie = regResA.headers.get('set-cookie') || '';
    const regDataA = (await regResA.json()) as any;
    userAId = regDataA.data.id;

    // Register User B
    const regResB = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Doctor B',
        email: `doctor_b_${Date.now()}@clinic.local`,
        password: 'Password123!',
      }),
    });
    assert.strictEqual(regResB.status, 201, 'User B registration should succeed');
    userBCookie = regResB.headers.get('set-cookie') || '';
    const regDataB = (await regResB.json()) as any;
    userBId = regDataB.data.id;

    // Create Business A for User A
    const bizResA = await fetch(`${baseUrl}/api/businesses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: userACookie },
      body: JSON.stringify({
        name: 'Clinic Alpha',
        phone: `+1-800-${Date.now().toString().slice(-6)}`,
        email: 'alpha@clinic.local',
        timezone: 'UTC',
      }),
    });
    assert.strictEqual(bizResA.status, 201);
    const bizDataA = (await bizResA.json()) as any;
    businessAId = bizDataA.data.id;

    // Create Business B for User B
    const bizResB = await fetch(`${baseUrl}/api/businesses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: userBCookie },
      body: JSON.stringify({
        name: 'Clinic Beta',
        phone: `+1-800-${(Date.now() + 1).toString().slice(-6)}`,
        email: 'beta@clinic.local',
        timezone: 'UTC',
      }),
    });
    assert.strictEqual(bizResB.status, 201);
    const bizDataB = (await bizResB.json()) as any;
    businessBId = bizDataB.data.id;

    // Create Customer A & B
    const custResA = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: userACookie },
      body: JSON.stringify({
        businessId: businessAId,
        name: 'Customer A',
        phone: `+1-555-${Date.now().toString().slice(-6)}`,
        email: 'cust_a@example.com',
      }),
    });
    assert.strictEqual(custResA.status, 201);
    customerAId = ((await custResA.json()) as any).data.id;

    const custResB = await fetch(`${baseUrl}/api/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: userBCookie },
      body: JSON.stringify({
        businessId: businessBId,
        name: 'Customer B',
        phone: `+1-555-${(Date.now() + 1).toString().slice(-6)}`,
        email: 'cust_b@example.com',
      }),
    });
    assert.strictEqual(custResB.status, 201);
    customerBId = ((await custResB.json()) as any).data.id;

    // Create Staff A & B
    const staffResA = await fetch(`${baseUrl}/api/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: userACookie },
      body: JSON.stringify({
        businessId: businessAId,
        name: 'Specialist A',
        email: `specialist_a_${Date.now()}@clinic.local`,
        role: 'Dental Surgeon',
        isActive: true,
      }),
    });
    assert.strictEqual(staffResA.status, 201);
    staffAId = ((await staffResA.json()) as any).data.id;

    const staffResB = await fetch(`${baseUrl}/api/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: userBCookie },
      body: JSON.stringify({
        businessId: businessBId,
        name: 'Specialist B',
        email: `specialist_b_${Date.now()}@clinic.local`,
        role: 'Orthodontist',
        isActive: true,
      }),
    });
    assert.strictEqual(staffResB.status, 201);
    staffBId = ((await staffResB.json()) as any).data.id;

    // Create Service A (60 mins) & B (30 mins)
    const servResA = await fetch(`${baseUrl}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: userACookie },
      body: JSON.stringify({
        businessId: businessAId,
        name: 'Deep Cleaning (60 min)',
        durationMinutes: 60,
        isActive: true,
      }),
    });
    assert.strictEqual(servResA.status, 201);
    serviceAId = ((await servResA.json()) as any).data.id;

    const servResB = await fetch(`${baseUrl}/api/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: userBCookie },
      body: JSON.stringify({
        businessId: businessBId,
        name: 'Consultation (30 min)',
        durationMinutes: 30,
        isActive: true,
      }),
    });
    assert.strictEqual(servResB.status, 201);
    serviceBId = ((await servResB.json()) as any).data.id;

    console.log('  ✓ Test users, businesses, customers, staff, and services set up.');

    // ----------------------------------------------------
    // 2. TEST: Valid Appointment Creation & Duration Calculation
    // ----------------------------------------------------
    console.log('\n2. Testing Valid Appointment Creation:');
    const apt1Start = '2026-10-15T10:00:00.000Z';
    const createRes = await fetch(`${baseUrl}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: userACookie },
      body: JSON.stringify({
        businessId: businessAId,
        customerId: customerAId,
        staffId: staffAId,
        serviceId: serviceAId, // 60 minutes
        startTime: apt1Start,
        notes: 'First test appointment',
      }),
    });
    assert.strictEqual(createRes.status, 201, 'Appointment creation should return 201');
    const createData = (await createRes.json()) as any;
    createdAppointmentId = createData.data.id;
    assert.strictEqual(createData.data.status, 'SCHEDULED');
    assert.strictEqual(createData.data.startTime, apt1Start);
    // End time should be derived from service duration (10:00 -> 11:00)
    assert.strictEqual(createData.data.endTime, '2026-10-15T11:00:00.000Z');
    console.log('  ✓ POST /api/appointments creates appointment with derived end time (10:00 -> 11:00)');

    // ----------------------------------------------------
    // 3. TEST: Cross-Business Resource Rejection
    // ----------------------------------------------------
    console.log('\n3. Testing Cross-Business Resource Rejection:');

    // Customer from Business B in Business A appointment
    const crossCustRes = await fetch(`${baseUrl}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: userACookie },
      body: JSON.stringify({
        businessId: businessAId,
        customerId: customerBId, // Cross-business customer!
        staffId: staffAId,
        serviceId: serviceAId,
        startTime: '2026-10-15T14:00:00.000Z',
      }),
    });
    assert.strictEqual(crossCustRes.status, 400, 'Cross-business customer must be rejected with 400');
    console.log('  ✓ Rejects appointment with cross-business customer (HTTP 400)');

    // Staff from Business B in Business A appointment
    const crossStaffRes = await fetch(`${baseUrl}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: userACookie },
      body: JSON.stringify({
        businessId: businessAId,
        customerId: customerAId,
        staffId: staffBId, // Cross-business staff!
        serviceId: serviceAId,
        startTime: '2026-10-15T14:00:00.000Z',
      }),
    });
    assert.strictEqual(crossStaffRes.status, 400, 'Cross-business staff must be rejected with 400');
    console.log('  ✓ Rejects appointment with cross-business staff (HTTP 400)');

    // Service from Business B in Business A appointment
    const crossServRes = await fetch(`${baseUrl}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: userACookie },
      body: JSON.stringify({
        businessId: businessAId,
        customerId: customerAId,
        staffId: staffAId,
        serviceId: serviceBId, // Cross-business service!
        startTime: '2026-10-15T14:00:00.000Z',
      }),
    });
    assert.strictEqual(crossServRes.status, 400, 'Cross-business service must be rejected with 400');
    console.log('  ✓ Rejects appointment with cross-business service (HTTP 400)');

    // ----------------------------------------------------
    // 4. TEST: Overlapping Appointment Conflict Detection (HTTP 409)
    // ----------------------------------------------------
    console.log('\n4. Testing Overlapping Scheduling Conflicts (409 Conflict):');

    // Existing is 10:00 -> 11:00
    // Attempt 1: 10:30 -> 11:30 (Partial overlap start)
    const conflict1 = await fetch(`${baseUrl}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: userACookie },
      body: JSON.stringify({
        businessId: businessAId,
        customerId: customerAId,
        staffId: staffAId,
        serviceId: serviceAId,
        startTime: '2026-10-15T10:30:00.000Z',
      }),
    });
    assert.strictEqual(conflict1.status, 409, 'Overlapping appointment (10:30-11:30) must return 409');
    console.log('  ✓ Overlap 10:30-11:30 rejected with HTTP 409 Conflict');

    // Attempt 2: 09:30 -> 10:30 (Partial overlap end)
    const conflict2 = await fetch(`${baseUrl}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: userACookie },
      body: JSON.stringify({
        businessId: businessAId,
        customerId: customerAId,
        staffId: staffAId,
        serviceId: serviceAId,
        startTime: '2026-10-15T09:30:00.000Z',
      }),
    });
    assert.strictEqual(conflict2.status, 409, 'Overlapping appointment (09:30-10:30) must return 409');
    console.log('  ✓ Overlap 09:30-10:30 rejected with HTTP 409 Conflict');

    // Attempt 3: 10:00 -> 11:00 (Exact match)
    const conflict3 = await fetch(`${baseUrl}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: userACookie },
      body: JSON.stringify({
        businessId: businessAId,
        customerId: customerAId,
        staffId: staffAId,
        serviceId: serviceAId,
        startTime: '2026-10-15T10:00:00.000Z',
      }),
    });
    assert.strictEqual(conflict3.status, 409, 'Exact overlap (10:00-11:00) must return 409');
    console.log('  ✓ Exact match overlap 10:00-11:00 rejected with HTTP 409 Conflict');

    // ----------------------------------------------------
    // 5. TEST: Back-to-Back Appointments Allowed
    // ----------------------------------------------------
    console.log('\n5. Testing Back-to-Back Appointments (Allowed):');

    // Attempt 1: 11:00 -> 12:00 (Right after 10:00-11:00)
    const b2b1 = await fetch(`${baseUrl}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: userACookie },
      body: JSON.stringify({
        businessId: businessAId,
        customerId: customerAId,
        staffId: staffAId,
        serviceId: serviceAId,
        startTime: '2026-10-15T11:00:00.000Z',
      }),
    });
    assert.strictEqual(b2b1.status, 201, 'Back-to-back appointment (11:00-12:00) should succeed');
    const b2b1Data = (await b2b1.json()) as any;
    console.log('  ✓ Back-to-back 11:00-12:00 succeeds (HTTP 201)');

    // Attempt 2: 09:00 -> 10:00 (Right before 10:00-11:00)
    const b2b2 = await fetch(`${baseUrl}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: userACookie },
      body: JSON.stringify({
        businessId: businessAId,
        customerId: customerAId,
        staffId: staffAId,
        serviceId: serviceAId,
        startTime: '2026-10-15T09:00:00.000Z',
      }),
    });
    assert.strictEqual(b2b2.status, 201, 'Back-to-back appointment (09:00-10:00) should succeed');
    console.log('  ✓ Back-to-back 09:00-10:00 succeeds (HTTP 201)');

    // ----------------------------------------------------
    // 6. TEST: Availability Check Endpoint
    // ----------------------------------------------------
    console.log('\n6. Testing Availability Check API:');

    // Check occupied slot (10:00 - 11:00) -> available: false
    const availCheck1 = await fetch(
      `${baseUrl}/api/appointments/availability?businessId=${businessAId}&staffId=${staffAId}&startTime=2026-10-15T10:00:00.000Z&durationMinutes=60`,
      { headers: { Cookie: userACookie } }
    );
    assert.strictEqual(availCheck1.status, 200);
    const availData1 = (await availCheck1.json()) as any;
    assert.strictEqual(availData1.data.available, false);
    console.log('  ✓ GET /api/appointments/availability returns available=false for booked slot');

    // Check free slot (14:00 - 15:00) -> available: true
    const availCheck2 = await fetch(
      `${baseUrl}/api/appointments/availability?businessId=${businessAId}&staffId=${staffAId}&startTime=2026-10-15T14:00:00.000Z&durationMinutes=60`,
      { headers: { Cookie: userACookie } }
    );
    assert.strictEqual(availCheck2.status, 200);
    const availData2 = (await availCheck2.json()) as any;
    assert.strictEqual(availData2.data.available, true);
    console.log('  ✓ GET /api/appointments/availability returns available=true for open slot');

    // ----------------------------------------------------
    // 7. TEST: Cancellation & Slot Release
    // ----------------------------------------------------
    console.log('\n7. Testing Cancellation & Slot Release:');

    // Cancel appointment 1 (10:00 - 11:00)
    const cancelRes = await fetch(`${baseUrl}/api/appointments/${createdAppointmentId}/cancel`, {
      method: 'PATCH',
      headers: { Cookie: userACookie },
    });
    assert.strictEqual(cancelRes.status, 200, 'Cancellation should return 200');
    const cancelData = (await cancelRes.json()) as any;
    assert.strictEqual(cancelData.data.status, 'CANCELLED');
    console.log('  ✓ PATCH /api/appointments/:id/cancel updates status to CANCELLED');

    // Now re-booking 10:00 - 11:00 should succeed!
    const rebookRes = await fetch(`${baseUrl}/api/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: userACookie },
      body: JSON.stringify({
        businessId: businessAId,
        customerId: customerAId,
        staffId: staffAId,
        serviceId: serviceAId,
        startTime: '2026-10-15T10:00:00.000Z',
      }),
    });
    assert.strictEqual(rebookRes.status, 201, 'Rebooking a cancelled slot must succeed');
    console.log('  ✓ Rebooking cancelled time slot (10:00-11:00) succeeds (HTTP 201)');

    // ----------------------------------------------------
    // 8. TEST: Multi-Tenant Data Isolation
    // ----------------------------------------------------
    console.log('\n8. Testing Multi-Tenant Data Isolation:');

    // User B attempts to access User A's appointment details -> 403 / 404
    const userBGetApt = await fetch(`${baseUrl}/api/appointments/${createdAppointmentId}`, {
      headers: { Cookie: userBCookie },
    });
    assert.strictEqual(userBGetApt.status, 403, 'User B must not access User A appointment');
    console.log('  ✓ User B CANNOT access User A appointment (HTTP 403 Forbidden)');

    // User B list contains only User B appointments
    const userBList = await fetch(`${baseUrl}/api/appointments?businessId=${businessBId}`, {
      headers: { Cookie: userBCookie },
    });
    assert.strictEqual(userBList.status, 200);
    const userBListData = (await userBList.json()) as any;
    assert.strictEqual(
      userBListData.data.some((a: any) => a.id === createdAppointmentId),
      false,
      'User B list must not leak User A appointments'
    );
    console.log('  ✓ User B appointment list does NOT leak User A appointments');

    // ----------------------------------------------------
    // 9. CLEANUP
    // ----------------------------------------------------
    console.log('\n9. Cleaning up test data:');
    await prisma.appointment.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.service.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.staff.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.customer.deleteMany({
      where: { businessId: { in: [businessAId, businessBId] } },
    });
    await prisma.business.deleteMany({
      where: { id: { in: [businessAId, businessBId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userAId, userBId] } },
    });
    console.log('  ✓ Test appointments and records cleaned up successfully.');

    console.log('\n======================================================');
    console.log('Appointment Tests: 11 passed, 0 failed.');
    console.log('======================================================\n');
  } finally {
    server.close();
  }
}
