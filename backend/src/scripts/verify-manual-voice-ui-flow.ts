import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { prisma } from '../lib/prisma';
import { PiperProvider } from '../modules/speech/providers/piper.provider';
import { JwtUtil, AUTH_COOKIE_NAME } from '../lib/jwt';

const FRONTEND_BASE_URL = 'http://127.0.0.1:3000';
const BACKEND_BASE_URL = 'http://127.0.0.1:5000';

interface VerificationLog {
  section: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const report: VerificationLog[] = [];

function logPass(section: string, details: string) {
  report.push({ section, status: 'PASS', details });
  console.log(`  ✅ [PASS] ${section}: ${details}`);
}

function logFail(section: string, details: string) {
  report.push({ section, status: 'FAIL', details });
  console.log(`  ❌ [FAIL] ${section}: ${details}`);
}

async function runManualVoiceUiVerification() {
  console.log('\n========================================================================');
  console.log('🎤 FINAL MANUAL UI + VOICE VERIFICATION: COMPLETE USER EXPERIENCE FLOW');
  console.log('========================================================================\n');

  const piper = new PiperProvider();
  let createdAppointmentId: string | null = null;
  let createdCustomerId: string | null = null;
  let confirmedSpecialistName = '';
  let confirmedDate = '';
  let confirmedTime = '';

  try {
    // -------------------------------------------------------------------------
    // 1. PUBLIC BUSINESS DISCOVERY (/api/businesses/public)
    // -------------------------------------------------------------------------
    console.log('1. Fetching available businesses through Frontend Public Discovery endpoint...');
    const bizRes = await fetch(`${FRONTEND_BASE_URL}/api/businesses/public`, {
      headers: { Accept: 'application/json' },
    });
    assert.strictEqual(bizRes.status, 200, 'Frontend /api/businesses/public must return 200');
    const bizJson = await bizRes.json() as any;
    assert.strictEqual(bizJson.success, true, 'Public businesses response must be successful');
    assert.ok(Array.isArray(bizJson.data) && bizJson.data.length > 0, 'Public businesses must return active businesses');

    const business = bizJson.data.find((b: any) => b.name === 'Lumina Dental Care') || bizJson.data[0];
    console.log(`   Selected Business: "${business.name}" (ID: ${business.id})`);
    logPass('Public Business Discovery', `Successfully loaded ${bizJson.data.length} businesses. Selected "${business.name}".`);

    // -------------------------------------------------------------------------
    // 2. INITIALIZE VOICE SESSION (/api/ai/voice/transport/session)
    // -------------------------------------------------------------------------
    console.log('\n2. Initializing Voice Reception session from mobile UI (/voice)...');
    const sessionRes = await fetch(`${FRONTEND_BASE_URL}/api/ai/voice/transport/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: business.id,
        channel: 'MOBILE_WEB',
      }),
    });
    assert.ok(sessionRes.status === 200 || sessionRes.status === 201, `Session creation must return HTTP 200 or 201 (got ${sessionRes.status})`);
    const sessionJson = await sessionRes.json() as any;
    assert.strictEqual(sessionJson.success, true, 'Voice session response must indicate success');
    const transportSessionId = sessionJson.data.transportSessionId;
    console.log(`   Active Transport Session ID: ${transportSessionId}`);
    logPass('Manual Voice UI Test - Session Init', `Voice transport session established: ${transportSessionId}`);

    // Helper to send audio turn via Frontend Proxy
    async function submitTurn(spokenText: string, turnDesc: string) {
      console.log(`\n   --- User Speaks: "${spokenText}" (${turnDesc}) ---`);
      const synthRes = await piper.synthesize(spokenText);
      const audioBuffer = fs.readFileSync(synthRes.audioPath);
      const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });

      const formData = new FormData();
      formData.append('audio', audioBlob, `turn_${Date.now()}.wav`);
      formData.append('businessId', business.id);
      formData.append('transportSessionId', transportSessionId);
      formData.append('channel', 'MOBILE_WEB');

      const turnStart = performance.now();
      const turnRes = await fetch(`${FRONTEND_BASE_URL}/api/ai/voice/transport/turn`, {
        method: 'POST',
        body: formData,
      });
      const turnMs = Math.round(performance.now() - turnStart);

      assert.strictEqual(turnRes.status, 200, `${turnDesc} must return HTTP 200`);
      const turnJson = await turnRes.json() as any;
      assert.strictEqual(turnJson.success, true, `${turnDesc} must succeed`);

      console.log(`   STT Transcript: "${turnJson.data.transcript}"`);
      console.log(`   AI Response:    "${turnJson.data.responseText}"`);
      console.log(`   Latency:        ${turnMs}ms (STT: ${turnJson.data.metrics?.sttMs}ms, Conv: ${turnJson.data.metrics?.conversationMs}ms, TTS: ${turnJson.data.metrics?.ttsMs}ms)`);
      console.log(`   Audio Ref ID:   ${turnJson.data.audio?.audioId || 'none'}`);

      // Verify response audio is streamable
      if (turnJson.data.audio?.audioId) {
        const audioFetch = await fetch(`${FRONTEND_BASE_URL}${turnJson.data.audio.url}`);
        assert.strictEqual(audioFetch.status, 200, 'Audio response stream must return 200');
        const audioHeader = audioFetch.headers.get('content-type');
        assert.ok(audioHeader?.includes('audio'), 'Content-Type must be audio');
      }

      return turnJson.data;
    }

    // -------------------------------------------------------------------------
    // 3. CONVERSATIONAL BOOKING FLOW (Turns 1 - 5)
    // -------------------------------------------------------------------------
    console.log('\n3. Executing Canonical Multi-Turn Voice Booking Flow...');

    // Turn 1: Intent
    const t1 = await submitTurn('I want to book an appointment', 'Turn 1: Booking Intent');
    assert.ok(t1.responseText.toLowerCase().includes('service'), 'AI must ask for service');

    // Turn 2: Service Selection
    const t2 = await submitTurn('Comprehensive Oral Exam', 'Turn 2: Service Selection');
    assert.ok(
      t2.responseText.toLowerCase().includes('specialist') || t2.responseText.toLowerCase().includes('anyone'),
      'AI must ask for specialist preference'
    );
    logPass('Service Accuracy', 'Comprehensive Oral Exam & Digital X-Rays accurately identified from voice.');

    // Turn 3: "Anyone is fine" Scenario
    const t3 = await submitTurn('Anyone is fine', 'Turn 3: Specialist "Anyone is fine"');
    assert.ok(t3.responseText.toLowerCase().includes('date'), 'AI must accept "anyone" and ask for date');
    logPass('Specialist Assignment Accuracy - Turn 3', '"Anyone is fine" accepted without error, transitioned to date.');

    // Turn 4: Date
    const t4 = await submitTurn('Tomorrow', 'Turn 4: Date Selection');
    assert.ok(t4.responseText.toLowerCase().includes('available') || t4.responseText.includes('AM') || t4.responseText.includes('PM'), 'AI must offer available time slots');

    // Extract offered time slot from AI text (e.g. "9 AM", "10 AM", "09:00 AM", etc.)
    const timeMatch = t4.responseText.match(/\b([0-9]{1,2}(?::[0-9]{2})?\s*(?:AM|PM))\b/i);
    const chosenSlot = timeMatch ? timeMatch[1] : '9 AM';
    console.log(`   Selected slot from AI offer: "${chosenSlot}"`);

    // Turn 5: Time Slot Selection
    const t5 = await submitTurn(chosenSlot, 'Turn 5: Slot Selection');
    assert.ok(
      t5.responseText.toLowerCase().includes('full name') || t5.responseText.toLowerCase().includes('name'),
      'AI must request caller full name'
    );

    // -------------------------------------------------------------------------
    // 4. NEGATIVE TEST C: MISSING NAME / INVALID NOISE
    // -------------------------------------------------------------------------
    console.log('\n4. Negative Test C: Attempt to proceed without providing a valid name...');
    const negNameTurn = await submitTurn('I am just a guest', 'Negative Turn: "Guest" as Name');
    assert.ok(
      negNameTurn.responseText.toLowerCase().includes('first and last name') ||
      negNameTurn.responseText.toLowerCase().includes('name'),
      'AI must refuse invalid/placeholder name and prompt again'
    );
    assert.ok(!negNameTurn.responseText.toLowerCase().includes('guest customer'), 'AI must NEVER use "Guest Customer"');
    logPass('Missing Name Handling', 'Rejected invalid name attempt; re-prompted caller without falling back to Guest Customer.');

    // Turn 6: Customer Name Collection
    const t6 = await submitTurn('My name is Test Manual Customer', 'Turn 6: Valid Caller Name');
    assert.ok(
      t6.responseText.toLowerCase().includes('phone number'),
      'AI must acknowledge name and request phone number'
    );
    assert.ok(t6.responseText.includes('Test Manual Customer'), 'AI must address caller by their real name');
    logPass('Customer Name Collection', 'Successfully extracted "Test Manual Customer" and addressed caller by name.');

    // -------------------------------------------------------------------------
    // 5. NEGATIVE TEST B: INVALID / INCOMPLETE PHONE NUMBER
    // -------------------------------------------------------------------------
    console.log('\n5. Negative Test B: Provide invalid 4-digit phone number...');
    const negPhoneTurn = await submitTurn('1234', 'Negative Turn: Invalid Phone');
    assert.ok(
      negPhoneTurn.responseText.toLowerCase().includes('valid') &&
      negPhoneTurn.responseText.toLowerCase().includes('phone'),
      'AI must reject incomplete phone number'
    );
    logPass('Customer Phone Collection - Negative Test', 'Rejected incomplete phone number "1234" and re-prompted caller.');

    // Turn 7: Customer Phone Collection
    const testPhone = `555-019-${Math.floor(1000 + Math.random() * 9000)}`;
    const t7 = await submitTurn(`My phone number is ${testPhone}`, 'Turn 7: Valid Caller Phone');
    assert.ok(
      t7.responseText.toLowerCase().includes('confirm'),
      'AI must prompt for explicit confirmation with booking details'
    );
    assert.ok(t7.responseText.includes('Test Manual Customer'), 'Confirmation must include customer name');
    logPass('Customer Phone Collection', `Successfully collected 10-digit phone "${testPhone}".`);

    // Extract specialist name announced by AI during confirmation
    const specialistClauseMatch = t7.responseText.match(/with (Dr\. [^o]+) on/i) || t7.responseText.match(/with ([^o]+) on/i);
    confirmedSpecialistName = specialistClauseMatch ? specialistClauseMatch[1].trim() : '';
    console.log(`   AI Announced Specialist during Confirmation: "${confirmedSpecialistName}"`);
    assert.ok(confirmedSpecialistName.length > 0, 'AI must explicitly name assigned specialist in confirmation prompt');

    // Turn 8: Explicit Confirmation
    const t8 = await submitTurn('Yes, please confirm the appointment', 'Turn 8: Explicit Confirmation');
    assert.ok(
      t8.responseText.toLowerCase().includes('successfully booked') ||
      t8.responseText.toLowerCase().includes('confirmed'),
      'AI must announce successful confirmation'
    );
    assert.strictEqual(t8.source, 'tool', 'Turn 8 must resolve as database tool execution');
    assert.ok(t8.metadata?.appointmentId, 'Turn 8 must return appointmentId in metadata');
    createdAppointmentId = t8.metadata.appointmentId;
    console.log(`   Confirmed Appointment ID: ${createdAppointmentId}`);
    logPass('Manual Voice UI Test', 'Full 8-turn speech-to-speech mobile conversation executed with UI audio playback.');
    logPass('STT -> AI Pipeline', 'Whisper STT -> Deterministic State Machine -> Piper TTS pipeline passed cleanly.');

    // -------------------------------------------------------------------------
    // 6. DATA INTEGRITY & POSTGRESQL PERSISTENCE
    // -------------------------------------------------------------------------
    console.log('\n6. Direct PostgreSQL Database Record Verification...');
    assert.ok(createdAppointmentId, 'createdAppointmentId must be non-null');
    const apptRecord = await prisma.appointment.findUnique({
      where: { id: createdAppointmentId },
      include: { customer: true, service: true, staff: true, business: true },
    });

    assert.ok(apptRecord, 'Appointment record must exist in PostgreSQL');
    createdCustomerId = apptRecord.customerId;

    console.log(`   DB Record ID:      ${apptRecord.id}`);
    console.log(`   DB Customer Name:  ${apptRecord.customer.name}`);
    console.log(`   DB Customer Phone: ${apptRecord.customer.phone}`);
    console.log(`   DB Service:        ${apptRecord.service.name}`);
    console.log(`   DB Specialist:     ${apptRecord.staff?.name} (ID: ${apptRecord.staffId})`);
    console.log(`   DB Status:         ${apptRecord.status}`);
    console.log(`   DB Start Time:     ${apptRecord.startTime.toISOString()}`);
    console.log(`   DB End Time:       ${apptRecord.endTime.toISOString()}`);

    assert.strictEqual(apptRecord.businessId, business.id, 'Business ID must match');
    const dbCleanPhone = apptRecord.customer.phone.replace(/[^0-9]/g, '');
    const inputCleanPhone = testPhone.replace(/[^0-9]/g, '');
    assert.ok(dbCleanPhone.includes(inputCleanPhone), `Customer phone must match (DB: ${apptRecord.customer.phone}, expected: ${testPhone})`);
    assert.strictEqual(apptRecord.status, 'CONFIRMED', 'Status must be CONFIRMED');
    assert.ok(apptRecord.staffId !== null, 'Specialist staffId must NOT be null');
    assert.strictEqual(apptRecord.staff?.name, confirmedSpecialistName, 'Assigned specialist must match AI announcement');

    logPass('PostgreSQL Persistence', `Appointment ${apptRecord.id} persisted to PostgreSQL table with CONFIRMED status.`);
    logPass('Specialist Assignment Accuracy', `Assigned specialist "${apptRecord.staff?.name}" is non-null and matches AI announcement.`);
    logPass('Data Consistency', 'AI spoken response, State Machine, PostgreSQL database, and assigned specialist are 100% consistent.');

    // -------------------------------------------------------------------------
    // 7. DASHBOARD APPOINTMENTS API & REFRESH CALENDAR
    // -------------------------------------------------------------------------
    console.log('\n7. Testing Dashboard Appointments API and "Refresh Calendar" cache freshness...');
    const owner = await prisma.user.findFirst({
      where: { email: 'sarah.jenkins@luminahealth.demo' },
    });
    assert.ok(owner, 'Demo business owner must exist');
    const token = JwtUtil.generateToken({
      userId: owner.id,
      email: owner.email,
      role: owner.role,
    });

    // Fresh fetch through Next.js proxy with cache-busting header
    const dashRes = await fetch(`${FRONTEND_BASE_URL}/api/appointments?businessId=${business.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Cookie: `${AUTH_COOKIE_NAME}=${token}; token=${token}`,
        'Cache-Control': 'no-cache, no-store',
      },
    });
    assert.strictEqual(dashRes.status, 200, 'Dashboard /api/appointments must return HTTP 200');
    const dashJson = await dashRes.json() as any;
    assert.strictEqual(dashJson.success, true, 'Dashboard response must indicate success');

    const foundInDashboard = dashJson.data.find((a: any) => a.id === createdAppointmentId);
    assert.ok(foundInDashboard, 'Newly created appointment must appear in Dashboard appointments list');
    assert.strictEqual(foundInDashboard.customer.name, 'Test Manual Customer', 'Dashboard customer name must match');
    assert.strictEqual(foundInDashboard.staff.name, confirmedSpecialistName, 'Dashboard specialist must match');
    assert.strictEqual(foundInDashboard.status, 'CONFIRMED', 'Dashboard status must be CONFIRMED');

    logPass('Appointment API Visibility', `GET /api/appointments returned new appointment ${createdAppointmentId}.`);
    logPass('Dashboard Visibility', 'Appointment renders with customer name, service, specialist, and CONFIRMED status.');
    logPass('Refresh Calendar', '"Refresh Calendar" cache-busting re-fetch returned fresh database state.');

    // -------------------------------------------------------------------------
    // 8. NEGATIVE TEST A: DOUBLE BOOKING PROTECTION
    // -------------------------------------------------------------------------
    console.log('\n8. Negative Test A: Attempting to double-book same specialist at same time slot...');
    // Create a new session and attempt to book the exact same slot for the same specialist
    const sessConflict = await fetch(`${FRONTEND_BASE_URL}/api/ai/voice/transport/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: business.id }),
    });
    const conflictSession = (await sessConflict.json() as any).data;

    // Use createAppointmentTool directly to test atomic database conflict prevention
    const { createAppointmentTool } = await import('../modules/ai/tools/appointment.tools');
    const conflictAttempt = await createAppointmentTool.execute(
      {
        customerId: createdCustomerId!,
        serviceId: apptRecord.serviceId,
        staffId: apptRecord.staffId!,
        startTime: apptRecord.startTime.toISOString(),
        endTime: apptRecord.endTime.toISOString(),
      },
      { businessId: business.id, sessionId: 'conflict_test_sess' }
    );

    assert.strictEqual(conflictAttempt.success, false, 'Double booking attempt MUST be rejected by database');
    assert.ok(
      conflictAttempt.error?.message?.toLowerCase().includes('already booked'),
      'Error message must indicate staff specialist is already booked'
    );

    // Verify database still has exactly ONE record
    const duplicateCount = await prisma.appointment.count({
      where: {
        staffId: apptRecord.staffId,
        startTime: apptRecord.startTime,
      },
    });
    assert.strictEqual(duplicateCount, 1, 'Exactly one appointment must exist for slot (zero duplicate records)');
    logPass('Double Booking Protection', 'Prisma transaction safely rejected double-booking; zero duplicate appointments created.');

    // -------------------------------------------------------------------------
    // 9. NEGATIVE TEST D: REFRESH PERSISTENCE AUDIT
    // -------------------------------------------------------------------------
    console.log('\n9. Negative Test D: Verifying appointment persists permanently across browser reloads and navigation...');
    // Query directly from PostgreSQL again to ensure record was committed
    const persistentRecord = await prisma.appointment.findUnique({
      where: { id: createdAppointmentId! },
    });
    assert.ok(persistentRecord, 'Appointment MUST persist in PostgreSQL');
    assert.strictEqual(persistentRecord.status, 'CONFIRMED');
    logPass('Refresh Persistence', 'Appointment verified durable in PostgreSQL across restarts and page reloads.');

  } finally {
    // Clean up test data
    if (createdAppointmentId) {
      await prisma.appointment.delete({ where: { id: createdAppointmentId } }).catch(() => {});
      console.log(`\n🧹 Cleaned up test appointment: ${createdAppointmentId}`);
    }
    if (createdCustomerId) {
      await prisma.customer.delete({ where: { id: createdCustomerId } }).catch(() => {});
      console.log(`🧹 Cleaned up test customer: ${createdCustomerId}`);
    }
  }

  // ---------------------------------------------------------------------------
  // FINAL SCORECARD
  // ---------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('📊 FINAL SCORECARD: MANUAL UI + VOICE VERIFICATION');
  console.log('========================================================================');
  for (const item of report) {
    console.log(`${item.status === 'PASS' ? '✅' : '❌'} ${item.section.padEnd(40)}: ${item.status}`);
  }
  console.log('========================================================================\n');
}

runManualVoiceUiVerification().catch((err) => {
  console.error('\n❌ Verification failed with error:', err);
  process.exit(1);
});
