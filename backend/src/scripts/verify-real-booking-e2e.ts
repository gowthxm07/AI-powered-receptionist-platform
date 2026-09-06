import assert from 'assert';
import { prisma } from '../lib/prisma';
import '../modules/ai/tools';

const BACKEND_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:3000';

interface ConversationResponse {
  success: boolean;
  response: string;
  action: string;
  intent: string;
  sessionId: string;
  source: string;
  toolUsed?: string;
  data?: any;
  error?: any;
  latencyMs?: number;
}

async function sendVoiceTurn(
  sessionId: string | undefined,
  businessId: string,
  message: string,
  customerId?: string
): Promise<ConversationResponse> {
  const res = await fetch(`${BACKEND_URL}/api/ai/conversation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: sessionId || undefined,
      businessId,
      customerId,
      message,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`HTTP ${res.status} from /api/ai/conversation: ${errorText}`);
  }

  const json = (await res.json()) as any;
  return {
    success: json.success,
    sessionId: json.data?.sessionId,
    response: json.data?.response,
    action: json.data?.action,
    intent: json.data?.intent,
    source: json.data?.source,
    toolUsed: json.data?.toolUsed,
    data: json.data?.toolData || json.data,
    metadata: json.data?.metadata,
    error: json.error,
  } as any;
}

export async function runRealVoiceBookingEndToEndVerification() {
  console.log('\n================================================================');
  console.log('--- 🚀 REAL END-TO-END VOICE APPOINTMENT PERSISTENCE VERIFICATION ---');
  console.log('================================================================\n');

  // 1. Resolve Active Business (Lumina Dental Care)
  const business = await prisma.business.findFirst({
    where: { name: 'Lumina Dental Care' },
    include: {
      owner: true,
      services: { where: { isActive: true } },
      staff: { where: { isActive: true } },
    },
  });

  assert(business, 'Target business "Lumina Dental Care" must exist in PostgreSQL');
  console.log(`📍 1. Selected Voice Reception Business:`);
  console.log(`   • Business ID:   ${business.id}`);
  console.log(`   • Business Name: ${business.name}`);
  console.log(`   • Owner:         ${business.owner?.name} (${business.owner?.email})`);
  console.log(`   • Services:      ${business.services.length} active services`);
  console.log(`   • Specialists:   ${business.staff.length} active specialists`);

  const uniqueSuffix = Date.now().toString().slice(-4);
  const testCustomerName = 'Test Voice Customer';
  const testCustomerPhone = `+1-555-888-${uniqueSuffix}`;
  let sessionId: string = '';

  let createdAppointmentId: string | null = null;
  let createdCustomerId: string | null = null;
  let chosenSlotLabel: string = '';
  let assignedStaffName: string = '';

  try {
    // ----------------------------------------------------
    // STEP 1: Full Voice Conversation via Real HTTP API
    // ----------------------------------------------------
    console.log('\n----------------------------------------------------------------');
    console.log('🗣️  STEP 1: Conversational Voice Turn Progression via Real HTTP:');
    console.log('----------------------------------------------------------------');

    // Turn 1: Inbound booking intent (new session)
    console.log('\nCaller: "I want to book an appointment"');
    const t1 = await sendVoiceTurn(undefined, business.id, 'I want to book an appointment');
    sessionId = t1.sessionId;
    assert(sessionId, 'Turn 1 must generate and return a valid sessionId');
    console.log(`AI:     "${t1.response}"`);
    console.log(`[Session Initialized]: ${sessionId}`);
    assert.strictEqual(t1.success, true);
    assert(t1.response.includes('Which service'), 'Turn 1 must prompt for service');

    // Turn 2: Service Selection ("Comprehensive Oral Exam")
    console.log('\nCaller: "Comprehensive Oral Exam"');
    const t2 = await sendVoiceTurn(sessionId, business.id, 'Comprehensive Oral Exam');
    console.log(`AI:     "${t2.response}"`);
    assert.strictEqual(t2.success, true);
    assert(t2.response.includes('preferred specialist') || t2.response.includes('specialist'), 'Turn 2 must prompt for staff');

    // Turn 3: Specialist Selection ("Anyone is fine")
    console.log('\nCaller: "Anyone is fine"');
    const t3 = await sendVoiceTurn(sessionId, business.id, 'Anyone is fine');
    console.log(`AI:     "${t3.response}"`);
    assert.strictEqual(t3.success, true);
    assert(t3.response.includes('What date'), 'Turn 3 must prompt for date');

    // Turn 4: Date Selection ("Tomorrow")
    console.log('\nCaller: "Tomorrow"');
    const t4 = await sendVoiceTurn(sessionId, business.id, 'Tomorrow');
    console.log(`AI:     "${t4.response}"`);
    assert.strictEqual(t4.success, true);
    assert(t4.response.includes('Available times'), 'Turn 4 must list real available times');

    // Extract available slots from response text
    const slotMatch = t4.response.match(/are\s+([^.]+)\.\s+Which/i) || t4.response.match(/(?:are|times:)\s+([^.]+)/i);
    assert(slotMatch, 'Turn 4 must return open slot times');
    const slotLabels = slotMatch[1].split(',').map((s) => s.trim());
    chosenSlotLabel = slotLabels[0];
    console.log(`   [Extracted First Available Slot]: "${chosenSlotLabel}"`);

    // Turn 5: Slot Selection -> Must ask for Full Name
    console.log(`\nCaller: "${chosenSlotLabel}"`);
    const t5 = await sendVoiceTurn(sessionId, business.id, chosenSlotLabel);
    console.log(`AI:     "${t5.response}"`);
    assert.strictEqual(t5.success, true);
    assert(
      t5.response.includes('May I have your full name') || t5.response.includes('full name'),
      'Turn 5 must prompt for caller full name'
    );

    // Turn 6: Caller Name Collection ("Test Voice Customer")
    console.log(`\nCaller: "My name is ${testCustomerName}"`);
    const t6 = await sendVoiceTurn(sessionId, business.id, `My name is ${testCustomerName}`);
    console.log(`AI:     "${t6.response}"`);
    assert.strictEqual(t6.success, true);
    assert(
      t6.response.includes('phone number') || t6.response.includes('mobile number'),
      'Turn 6 must prompt for phone number'
    );
    assert(t6.response.includes(testCustomerName), 'Turn 6 must acknowledge caller name');

    // Turn 7: Caller Phone Collection -> Customer Created & Confirmation Prompted
    console.log(`\nCaller: "${testCustomerPhone}"`);
    const t7 = await sendVoiceTurn(sessionId, business.id, testCustomerPhone);
    console.log(`AI:     "${t7.response}"`);
    assert.strictEqual(t7.success, true);
    assert(
      t7.response.includes('Please confirm') || t7.response.includes('Should I confirm'),
      'Turn 7 must prompt for explicit confirmation'
    );
    assert(t7.response.includes(testCustomerName), 'Turn 7 must include caller name in confirmation summary');
    assert(t7.response.includes(testCustomerPhone), 'Turn 7 must include caller phone in confirmation summary');

    // Turn 8: Confirmation -> Executes real database create_appointment
    console.log('\nCaller: "Yes, please confirm the appointment"');
    const t8 = await sendVoiceTurn(sessionId, business.id, 'Yes, please confirm the appointment');
    console.log(`AI:     "${t8.response}"`);
    assert.strictEqual(t8.success, true);
    assert.strictEqual(t8.source, 'tool');
    assert.strictEqual(t8.toolUsed, 'create_appointment');
    assert(t8.response.includes('successfully booked'), 'Turn 8 must announce successful booking');
    assert(t8.response.includes(testCustomerName), 'Turn 8 must address the caller by name');

    const appointmentPayload = t8.data;
    assert(appointmentPayload?.id, 'Booking result must return a valid database appointment ID');
    createdAppointmentId = appointmentPayload.id;
    createdCustomerId = appointmentPayload.customerId;
    assignedStaffName = appointmentPayload.staffName;

    console.log(`\n✅ Voice Booking Completed Successfully!`);
    console.log(`   • Returned Appointment ID: ${createdAppointmentId}`);
    console.log(`   • Returned Customer ID:    ${createdCustomerId}`);
    console.log(`   • Assigned Specialist:     ${assignedStaffName}`);

    // ----------------------------------------------------
    // STEP 2: PostgreSQL Database Verification
    // ----------------------------------------------------
    console.log('\n----------------------------------------------------------------');
    console.log('🗄️  STEP 2: Direct PostgreSQL Database Record Verification:');
    console.log('----------------------------------------------------------------');

    // Verify Customer record
    const dbCustomer = await prisma.customer.findUnique({
      where: { id: createdCustomerId! },
      include: { business: true },
    });
    assert(dbCustomer, 'Customer record must exist in PostgreSQL');
    assert.strictEqual(dbCustomer.name, testCustomerName, 'Customer name must match');
    assert.strictEqual(dbCustomer.phone, testCustomerPhone, 'Customer phone must match');
    assert.strictEqual(dbCustomer.businessId, business.id, 'Customer businessId must match');
    console.log(`  ✓ Customer Record in PostgreSQL:`);
    console.log(`    • ID:         ${dbCustomer.id}`);
    console.log(`    • Name:       ${dbCustomer.name}`);
    console.log(`    • Phone:      ${dbCustomer.phone}`);
    console.log(`    • Business:   ${dbCustomer.business?.name} (${dbCustomer.businessId})`);

    // Verify Appointment record
    const dbAppointment = await prisma.appointment.findUnique({
      where: { id: createdAppointmentId! },
      include: {
        customer: true,
        staff: true,
        service: true,
        business: true,
      },
    });
    assert(dbAppointment, 'Appointment record must exist in PostgreSQL');
    assert.strictEqual(dbAppointment.id, createdAppointmentId, 'Persisted ID must match returned ID');
    assert.strictEqual(dbAppointment.businessId, business.id, 'Appointment businessId must match');
    assert.strictEqual(dbAppointment.customerId, dbCustomer.id, 'Appointment customerId must match');
    assert.strictEqual(dbAppointment.status, 'CONFIRMED', 'Status must be CONFIRMED');
    assert(dbAppointment.staffId !== null, 'Specialist must NOT be null even when "anyone" was requested');
    assert(dbAppointment.staff !== null, 'Specialist relation must be populated');
    console.log(`  ✓ Appointment Record in PostgreSQL:`);
    console.log(`    • ID:         ${dbAppointment.id}`);
    console.log(`    • Customer:   ${dbAppointment.customer.name}`);
    console.log(`    • Service:    ${dbAppointment.service.name} (${dbAppointment.serviceId})`);
    console.log(`    • Specialist: ${dbAppointment.staff?.name} (${dbAppointment.staffId})`);
    console.log(`    • Start Time: ${dbAppointment.startTime.toISOString()}`);
    console.log(`    • End Time:   ${dbAppointment.endTime.toISOString()}`);
    console.log(`    • Status:     ${dbAppointment.status}`);
    console.log(`    • Notes:      "${dbAppointment.notes}"`);

    // ----------------------------------------------------
    // STEP 3: Appointments API Verification (Backend HTTP)
    // ----------------------------------------------------
    console.log('\n----------------------------------------------------------------');
    console.log('📡 STEP 3: Appointments API Verification (GET /api/appointments):');
    console.log('----------------------------------------------------------------');

    const { JwtUtil } = await import('../lib/jwt');
    const authToken = JwtUtil.generateToken({
      userId: business.owner!.id,
      email: business.owner!.email,
      role: business.owner!.role,
    });

    const apiRes = await fetch(`${BACKEND_URL}/api/appointments?businessId=${business.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
        Cookie: `auth_token=${authToken}`,
      },
    });
    assert.strictEqual(apiRes.status, 200, 'GET /api/appointments must return HTTP 200');

    const apiData = (await apiRes.json()) as any;
    assert.strictEqual(apiData.success, true, 'API response must indicate success');
    assert(Array.isArray(apiData.data), 'API data must be an array of appointments');

    const foundInApi = apiData.data.find((a: any) => a.id === createdAppointmentId);
    assert(foundInApi, `Newly created appointment '${createdAppointmentId}' must appear in GET /api/appointments`);
    assert.strictEqual(foundInApi.customer?.name, testCustomerName);
    assert.strictEqual(foundInApi.customer?.phone, testCustomerPhone);
    assert.strictEqual(foundInApi.businessId, business.id);
    assert.strictEqual(foundInApi.status, 'CONFIRMED');
    assert(foundInApi.staff?.name, 'Specialist name must be populated in API response');

    console.log(`  ✓ GET /api/appointments returned ${apiData.data.length} appointments.`);
    console.log(`  ✓ Found newly created appointment in API payload:`);
    console.log(`    • ID:         ${foundInApi.id}`);
    console.log(`    • Customer:   ${foundInApi.customer?.name}`);
    console.log(`    • Phone:      ${foundInApi.customer?.phone}`);
    console.log(`    • Specialist: ${foundInApi.staff?.name}`);
    console.log(`    • Service:    ${foundInApi.service?.name}`);
    console.log(`    • Start:      ${foundInApi.startTime}`);
    console.log(`    • Status:     ${foundInApi.status}`);

    // ----------------------------------------------------
    // STEP 4: Frontend Proxy & Calendar Refresh Simulation
    // ----------------------------------------------------
    console.log('\n----------------------------------------------------------------');
    console.log('🖥️  STEP 4: Frontend Proxy & Calendar Refresh Verification:');
    console.log('----------------------------------------------------------------');

    // Simulate clicking "Refresh Calendar" on /dashboard/appointments via Next.js proxy
    const frontendRefreshRes = await fetch(
      `${FRONTEND_URL}/api/appointments?businessId=${business.id}`,
      {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
          Authorization: `Bearer ${authToken}`,
          Cookie: `auth_token=${authToken}`,
        },
      } as any
    );

    assert.strictEqual(frontendRefreshRes.status, 200, 'Next.js proxy GET /api/appointments must return HTTP 200');
    const frontendRefreshData = (await frontendRefreshRes.json()) as any;
    assert(Array.isArray(frontendRefreshData.data), 'Frontend response must contain appointments array');

    const foundInFrontend = frontendRefreshData.data.find((a: any) => a.id === createdAppointmentId);
    assert(foundInFrontend, 'New appointment must be present in frontend calendar refresh response');
    console.log(`  ✓ Simulated "Refresh Calendar" request to Next.js route on port 3000.`);
    console.log(`  ✓ Fresh network request returned HTTP 200 with ${frontendRefreshData.data.length} records.`);
    console.log(`  ✓ Verified new appointment renders in refreshed appointment dataset.`);

    // ----------------------------------------------------
    // STEP 5: Multi-Tenant Business Isolation Verification
    // ----------------------------------------------------
    console.log('\n----------------------------------------------------------------');
    console.log('🏢  STEP 5: Multi-Tenant Business Isolation Verification:');
    console.log('----------------------------------------------------------------');

    // Verify secondary business CANNOT access the appointment created in Lumina Dental
    const otherBusiness = await prisma.business.findFirst({
      where: { id: { not: business.id } },
    });
    assert(otherBusiness, 'Secondary business must exist in the database');

    const otherOwnerToken = JwtUtil.generateToken({
      userId: otherBusiness.ownerId || 'test-owner',
      email: otherBusiness.email,
      role: 'BUSINESS_OWNER',
    });

    const otherBizRes = await fetch(`${BACKEND_URL}/api/appointments?businessId=${otherBusiness.id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${otherOwnerToken}`,
        Cookie: `auth_token=${otherOwnerToken}`,
      },
    });
    const otherBizData = (await otherBizRes.json()) as any;
    const leakedAppointment = otherBizData.data?.find((a: any) => a.id === createdAppointmentId);
    assert(!leakedAppointment, 'Appointment MUST NOT leak into a different business tenant!');

    console.log(`  ✓ Queried secondary business "${otherBusiness.name}" (${otherBusiness.id}).`);
    console.log(`  ✓ Confirmed appointment '${createdAppointmentId}' is strictly isolated to "${business.name}".`);

    // ----------------------------------------------------
    // STEP 6: Confirmation Safety Test (Failure & Conflict)
    // ----------------------------------------------------
    console.log('\n----------------------------------------------------------------');
    console.log('🛡️  STEP 6: Confirmation Safety Test (Simulated Conflict):');
    console.log('----------------------------------------------------------------');

    const conflictSessionId = `conflict-session-${Date.now()}`;

    // Re-create the exact state in a new session pointing to the same time and staff
    const stateMachineModule = await import('../modules/ai/conversation/appointment-state-machine');
    const { sessionStore } = await import('../modules/ai/conversation');
    const { BookingConversationStep } = await import('../modules/ai/conversation/conversation-session.types');

    const nowTime = new Date();
    await sessionStore.setSession({
      sessionId: conflictSessionId,
      businessId: business.id,
      step: BookingConversationStep.BOOKING_CONFIRM,
      selectedServiceId: dbAppointment.serviceId,
      selectedServiceName: dbAppointment.service.name,
      selectedStaffId: dbAppointment.staffId,
      selectedStaffName: dbAppointment.staff?.name,
      selectedDate: dbAppointment.startTime.toISOString().slice(0, 10),
      selectedStartTime: dbAppointment.startTime.toISOString(),
      selectedEndTime: dbAppointment.endTime.toISOString(),
      customerId: dbCustomer.id,
      customerName: dbCustomer.name,
      customerPhone: dbCustomer.phone,
      createdAt: nowTime,
      updatedAt: nowTime,
      expiresAt: new Date(nowTime.getTime() + 15 * 60 * 1000),
    });

    // Attempt to confirm the exact same slot that is now booked
    console.log('Caller: "Yes, book this slot" (attempting duplicate booking for already-booked specialist interval)');
    const conflictResult = await stateMachineModule.appointmentStateMachine.handleTurn(
      'Yes, please book it',
      (await sessionStore.getSession(conflictSessionId))!,
      { businessId: business.id, sessionId: conflictSessionId, channel: 'VOICE' },
      performance.now()
    );

    console.log(`AI Response on Conflict: "${conflictResult.response.response}"`);
    console.log(`AI Success Flag:         ${conflictResult.response.success}`);

    // Verify ZERO false confirmations
    assert.strictEqual(
      conflictResult.response.success,
      false,
      'Conflicted booking MUST return success: false'
    );
    assert(
      !conflictResult.response.response.includes('successfully booked'),
      'AI MUST NOT claim appointment was booked when conflict occurs!'
    );
    assert(
      conflictResult.response.response.includes('conflict') ||
      conflictResult.response.response.includes("wasn't able to complete") ||
      conflictResult.response.response.includes('Could not complete'),
      'AI MUST explicitly report scheduling conflict to the caller'
    );

    console.log(`  ✓ Confirmed: Booking was REJECTED by PostgreSQL conflict detection.`);
    console.log(`  ✓ Confirmed: AI communicated conflict and NEVER stated appointment was confirmed.`);

  } finally {
    // Clean up test records
    if (createdAppointmentId) {
      await prisma.appointment.delete({
        where: { id: createdAppointmentId },
      }).catch(() => {});
      console.log(`\n🧹 Cleaned up test appointment '${createdAppointmentId}'.`);
    }
    if (createdCustomerId) {
      await prisma.customer.delete({
        where: { id: createdCustomerId },
      }).catch(() => {});
      console.log(`🧹 Cleaned up test customer '${createdCustomerId}'.`);
    }
  }

  console.log('\n================================================================');
  console.log('🎉 REAL END-TO-END VERIFICATION COMPLETED WITH 100% SUCCESS! 🎉');
  console.log('================================================================\n');
}

if (require.main === module) {
  runRealVoiceBookingEndToEndVerification()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n❌ VERIFICATION FAILED:', err);
      process.exit(1);
    });
}
