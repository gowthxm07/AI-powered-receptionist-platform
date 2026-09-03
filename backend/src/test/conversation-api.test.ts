import assert from 'assert';
import http from 'http';
import { createApp } from '../app';
import { prisma } from '../lib/prisma';
import { sessionStore } from '../modules/ai/conversation/in-memory-session-store';
import { BookingConversationStep } from '../modules/ai/conversation/conversation-session.types';

export async function runConversationApiTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- Running AI Conversation API Test Suite ---');
  console.log('======================================================');

  const app = createApp();
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}/api/ai/conversation`;

  // Fetch real seeded demo businesses
  const dentalBiz = await prisma.business.findFirst({
    where: { name: 'Lumina Dental Care' },
  });
  const dermBiz = await prisma.business.findFirst({
    where: { name: 'Radiance Dermatology & Aesthetics' },
  });

  assert(dentalBiz && dermBiz, 'Demo businesses must exist in database');

  const dentalCustomer = await prisma.customer.findFirst({
    where: { businessId: dentalBiz.id },
  });
  const dermCustomer = await prisma.customer.findFirst({
    where: { businessId: dermBiz.id },
  });

  assert(dentalCustomer && dermCustomer, 'Demo customers must exist in database');

  let createdAppointmentId: string | null = null;

  try {
    // ----------------------------------------------------
    // TEST GROUP 1: NEW SESSION
    // ----------------------------------------------------
    console.log('\n1. Testing New Session Initiation (No sessionId):');
    const res1 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: dentalBiz.id,
        message: 'Hello',
      }),
    });

    assert.strictEqual(res1.status, 200);
    const body1 = (await res1.json()) as any;
    assert.strictEqual(body1.success, true);
    assert(body1.data.sessionId, 'Must generate and return a new sessionId');
    assert(body1.data.sessionId.startsWith('sess_'));
    assert(typeof body1.data.response === 'string');
    assert.strictEqual(body1.data.source, 'deterministic');
    console.log(`  ✓ New session created: '${body1.data.sessionId}' with HTTP 200.`);

    // ----------------------------------------------------
    // TEST GROUP 2: SESSION CONTINUATION
    // ----------------------------------------------------
    console.log('\n2. Testing Session Continuation (With sessionId):');
    const existingSessionId = body1.data.sessionId;

    const res2 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: existingSessionId,
        businessId: dentalBiz.id,
        message: 'What services do you offer?',
      }),
    });

    assert.strictEqual(res2.status, 200);
    const body2 = (await res2.json()) as any;
    assert.strictEqual(body2.success, true);
    assert.strictEqual(body2.data.sessionId, existingSessionId, 'Must maintain identical sessionId');
    assert(body2.data.response.includes('offer'), 'Must return services response');
    console.log(`  ✓ Session '${existingSessionId}' continued seamlessly.`);

    // ----------------------------------------------------
    // TEST GROUP 3: MULTI-TURN APPOINTMENT BOOKING FLOW VIA API
    // ----------------------------------------------------
    console.log('\n3. Testing End-to-End Multi-Turn Booking Flow via HTTP API:');
    const bookingRes1 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: dentalBiz.id,
        message: 'I want to book an appointment',
        context: { customerId: dentalCustomer.id },
      }),
    });

    const bookingBody1 = (await bookingRes1.json()) as any;
    assert.strictEqual(bookingRes1.status, 200);
    const bookingSessionId = bookingBody1.data.sessionId;
    assert.strictEqual(bookingBody1.data.metadata.conversationStep, 'BOOKING_COLLECT_SERVICE');
    console.log('  ↳ Turn 1 (Initiation): Prompted for service catalog.');

    // Turn 2: Select Service
    const bookingRes2 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: bookingSessionId,
        businessId: dentalBiz.id,
        message: 'Comprehensive Oral Exam',
      }),
    });
    const bookingBody2 = (await bookingRes2.json()) as any;
    assert.strictEqual(bookingRes2.status, 200);
    assert.strictEqual(bookingBody2.data.metadata.conversationStep, 'BOOKING_COLLECT_STAFF');
    console.log(`  ↳ Turn 2 (Service): Selected '${bookingBody2.data.metadata.serviceName}'.`);

    // Turn 3: Select Staff (Anyone)
    const bookingRes3 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: bookingSessionId,
        businessId: dentalBiz.id,
        message: 'Anyone is fine',
      }),
    });
    const bookingBody3 = (await bookingRes3.json()) as any;
    assert.strictEqual(bookingRes3.status, 200);
    assert.strictEqual(bookingBody3.data.metadata.conversationStep, 'BOOKING_COLLECT_DATE');
    console.log('  ↳ Turn 3 (Staff): Stored "anyone" preference.');

    // Turn 4: Select Date (Tomorrow)
    const bookingRes4 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: bookingSessionId,
        businessId: dentalBiz.id,
        message: 'Tomorrow',
      }),
    });
    const bookingBody4 = (await bookingRes4.json()) as any;
    assert.strictEqual(bookingRes4.status, 200);
    assert.strictEqual(bookingBody4.data.metadata.conversationStep, 'BOOKING_SELECT_SLOT');
    console.log(`  ↳ Turn 4 (Date): Found slots for '${bookingBody4.data.metadata.date}'.`);

    // Turn 5: Select Slot
    const bookingRes5 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: bookingSessionId,
        businessId: dentalBiz.id,
        message: '10:00 AM',
      }),
    });
    const bookingBody5 = (await bookingRes5.json()) as any;
    assert.strictEqual(bookingRes5.status, 200);
    assert.strictEqual(bookingBody5.data.metadata.conversationStep, 'BOOKING_CONFIRM');
    console.log('  ↳ Turn 5 (Slot): Selected time and prompted confirmation.');

    // Turn 6: Confirm Booking
    const bookingRes6 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: bookingSessionId,
        businessId: dentalBiz.id,
        message: 'Yes, please confirm',
      }),
    });
    const bookingBody6 = (await bookingRes6.json()) as any;
    assert.strictEqual(bookingRes6.status, 200);
    assert.strictEqual(bookingBody6.data.source, 'tool');
    assert(bookingBody6.data.response.includes('successfully booked'));

    // Check appointment was created in PostgreSQL
    const checkAppointment = await prisma.appointment.findFirst({
      where: {
        businessId: dentalBiz.id,
        customerId: dentalCustomer.id,
      },
      orderBy: { createdAt: 'desc' },
    });
    assert(checkAppointment, 'Appointment must exist in PostgreSQL');
    createdAppointmentId = checkAppointment.id;
    console.log(`  ✓ Turn 6 (Creation): Verified appointment '${createdAppointmentId}' created in PostgreSQL.`);

    // ----------------------------------------------------
    // TEST GROUP 4: BUSINESS SESSION ISOLATION
    // ----------------------------------------------------
    console.log('\n4. Testing Multi-Tenant Business Session Isolation:');
    // Start session in Dental Business
    const isoInitRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: dentalBiz.id,
        message: 'I want to book an appointment',
      }),
    });
    const isoBody = (await isoInitRes.json()) as any;
    const dentalSessionId = isoBody.data.sessionId;

    // Attempt to access dentalSessionId with Dermatology Business ID
    const crossTenantRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: dentalSessionId,
        businessId: dermBiz.id, // CROSS-TENANT ATTACK
        message: 'Comprehensive Oral Exam',
      }),
    });

    assert.strictEqual(crossTenantRes.status, 403, 'Cross-tenant session usage must return HTTP 403 Forbidden');
    const crossBody = (await crossTenantRes.json()) as any;
    assert.strictEqual(crossBody.success, false);
    assert.strictEqual(crossBody.error?.code, 'SESSION_BUSINESS_MISMATCH');
    console.log('  ✓ Cross-tenant session hijacking cleanly blocked with HTTP 403.');

    // ----------------------------------------------------
    // TEST GROUP 5: CUSTOMER ISOLATION
    // ----------------------------------------------------
    console.log('\n5. Testing Customer Tenant Scoping & Isolation:');
    // Attempt to use Dermatology customer with Dental business
    const crossCustRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: dentalBiz.id,
        message: 'Hello',
        context: { customerId: dermCustomer.id }, // Belongs to Dermatology, not Dental!
      }),
    });

    assert.strictEqual(crossCustRes.status, 400, 'Cross-tenant customer mismatch must return HTTP 400 Bad Request');
    const crossCustBody = (await crossCustRes.json()) as any;
    assert.strictEqual(crossCustBody.success, false);
    assert.strictEqual(crossCustBody.error?.code, 'INVALID_CUSTOMER_BUSINESS_MISMATCH');
    console.log('  ✓ Cross-tenant customer injection cleanly blocked with HTTP 400.');

    // ----------------------------------------------------
    // TEST GROUP 6: INPUT VALIDATION
    // ----------------------------------------------------
    console.log('\n6. Testing Input Validation Guardrails:');

    // Missing businessId
    const valRes1 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello' }),
    });
    assert.strictEqual(valRes1.status, 400);

    // Invalid businessId UUID
    const valRes2 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: 'not-a-uuid', message: 'Hello' }),
    });
    assert.strictEqual(valRes2.status, 400);

    // Non-existent business UUID
    const valRes3 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: '00000000-0000-0000-0000-000000000000', message: 'Hello' }),
    });
    assert.strictEqual(valRes3.status, 404);
    const nonExistBody = (await valRes3.json()) as any;
    assert.strictEqual(nonExistBody.error?.code, 'BUSINESS_NOT_FOUND');

    // Missing message
    const valRes4 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: dentalBiz.id }),
    });
    assert.strictEqual(valRes4.status, 400);

    // Empty message
    const valRes5 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: dentalBiz.id, message: '' }),
    });
    assert.strictEqual(valRes5.status, 400);

    // Whitespace-only message
    const valRes6 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: dentalBiz.id, message: '     ' }),
    });
    assert.strictEqual(valRes6.status, 400);

    // Message exceeding 1000 characters
    const longMessage = 'a'.repeat(1001);
    const valRes7 = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: dentalBiz.id, message: longMessage }),
    });
    assert.strictEqual(valRes7.status, 400);

    console.log('  ✓ All 7 validation constraints verified.');

    // ----------------------------------------------------
    // TEST GROUP 7: SESSION EXPIRATION
    // ----------------------------------------------------
    console.log('\n7. Testing Session Expiration Detection:');
    const expiredSessionId = 'sess_expired_test_123';
    await sessionStore.setSession({
      sessionId: expiredSessionId,
      businessId: dentalBiz.id,
      step: BookingConversationStep.BOOKING_COLLECT_SERVICE,
      createdAt: new Date(Date.now() - 20 * 60 * 1000),
      updatedAt: new Date(Date.now() - 20 * 60 * 1000),
      expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
    });

    const expRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: expiredSessionId,
        businessId: dentalBiz.id,
        message: 'Continue my booking',
      }),
    });

    assert.strictEqual(expRes.status, 410, 'Expired session continuation must return HTTP 410 Gone');
    const expBody = (await expRes.json()) as any;
    assert.strictEqual(expBody.success, false);
    assert.strictEqual(expBody.error?.code, 'SESSION_EXPIRED');
    console.log('  ✓ Expired session cleanly caught and rejected with HTTP 410.');

    // ----------------------------------------------------
    // TEST GROUP 8: LATENCY METRICS VERIFICATION
    // ----------------------------------------------------
    console.log('\n8. Testing Latency & Timing Instrumentation:');
    const latRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: dentalBiz.id,
        message: 'Hello',
      }),
    });

    assert.strictEqual(latRes.status, 200);
    const latBody = (await latRes.json()) as any;
    assert(typeof latBody.data.latencyMs === 'number', 'latencyMs must be numeric');
    assert(typeof latBody.data.totalLatencyMs === 'number', 'totalLatencyMs must be numeric');
    assert(latBody.data.latencyMs >= 0, 'latencyMs must be non-negative');
    assert(latBody.data.totalLatencyMs >= 0, 'totalLatencyMs must be non-negative');
    console.log(`  ✓ Latency verified: engineLatency=${latBody.data.latencyMs}ms, totalApiLatency=${latBody.data.totalLatencyMs}ms.`);

    // ----------------------------------------------------
    // TEST GROUP 9: ERROR HANDLING & LEAK PROTECTION
    // ----------------------------------------------------
    console.log('\n9. Testing Safe Error Responses (No Stack Traces):');
    const errRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: dentalBiz.id,
        message: '   ',
      }),
    });
    const errBody = (await errRes.json()) as any;
    assert.strictEqual(errBody.stack, undefined, 'Must not expose stack traces');
    assert.strictEqual(errBody.error?.stack, undefined, 'Must not expose internal stack');
    console.log('  ✓ Zero stack traces leaked in error responses.');

  } finally {
    // Clean up dedicated test appointment if created
    if (createdAppointmentId) {
      await prisma.appointment.delete({
        where: { id: createdAppointmentId },
      }).catch(() => {});
      console.log(`\n  ✓ Cleaned up test appointment '${createdAppointmentId}'.`);
    }

    server.close();
  }

  console.log('\n======================================================');
  console.log('🎉 ALL AI CONVERSATION API TESTS PASSED! 🎉');
  console.log('======================================================\n');
}
