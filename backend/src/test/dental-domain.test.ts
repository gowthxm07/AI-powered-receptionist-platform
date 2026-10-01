import assert from 'assert';
import { aiReceptionistService } from '../modules/ai/services/ai-receptionist.service';
import { FastIntentRouter } from '../modules/ai/routing/intent-router';
import { AIIntent } from '../modules/ai/types/intent.types';
import { AIAction } from '../modules/ai/types/action.types';
import { BookingConversationStep } from '../modules/ai/conversation';
import { appointmentStateMachine } from '../modules/ai/conversation';
import { InMemorySessionStore } from '../modules/ai/conversation/in-memory-session-store';
import { AppointmentStateMachine } from '../modules/ai/conversation/appointment-state-machine';
import { LUMINA_DENTAL_BUSINESS_ID, findDoctorCabin, getClinicKnowledge } from '../modules/ai/knowledge';

export async function runDentalDomainTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- Running Dental-Domain Receptionist Test Suite ---');
  console.log('======================================================');

  const testSessionStore = new InMemorySessionStore();
  const testStateMachine = new AppointmentStateMachine(testSessionStore);

  // --------------------------------------------------------------------------
  // TEST 1: Natural Greeting for Lumina Dental Care vs Generic Business
  // --------------------------------------------------------------------------
  console.log('\n1. Testing Natural Receptionist Greeting:');
  const luminaGreeting = await aiReceptionistService.processMessage({
    message: 'Hello',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: 'test-greeting-lumina',
      metadata: { businessName: 'Lumina Dental Care' },
    },
  });

  assert.strictEqual(luminaGreeting.success, true);
  assert.strictEqual(luminaGreeting.intent, AIIntent.GREETING);
  assert.ok(
    luminaGreeting.response.includes('Lumina Dental Care'),
    'Greeting must identify Lumina Dental Care'
  );
  assert.ok(
    luminaGreeting.response.toLowerCase().includes('tooth pain') ||
      luminaGreeting.response.toLowerCase().includes('checkup'),
    'Greeting must invite symptom or routine checkup dialogue instead of robotic service question'
  );
  console.log('  ✓ Lumina Dental Care greeting is natural, welcoming, and invites visit-reason dialogue.');

  const genericGreeting = await aiReceptionistService.processMessage({
    message: 'Hi there',
    context: {
      businessId: 'b0000002-0000-0000-0000-000000000002',
      sessionId: 'test-greeting-generic',
      metadata: { businessName: 'Apex Endodontics' },
    },
  });
  assert.strictEqual(genericGreeting.success, true);
  assert.ok(genericGreeting.response.includes('Apex Endodontics'));
  console.log('  ✓ Multi-tenant greeting properly isolates other dental clinics.');

  // --------------------------------------------------------------------------
  // TEST 2: Dental Symptom Triage & Clinical Safety Language
  // --------------------------------------------------------------------------
  console.log('\n2. Testing Dental Symptom Triage & Cautious Clinical Language:');
  const symptomRes1 = await aiReceptionistService.processMessage({
    message: 'I have been having pain in my tooth for the past two days, especially when I chew.',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: 'test-symptom-pain',
    },
  });

  assert.strictEqual(symptomRes1.success, true);
  assert.strictEqual(symptomRes1.intent, AIIntent.DENTAL_SYMPTOM_INQUIRY);
  assert.strictEqual(symptomRes1.action, AIAction.TRIAGE_SYMPTOM);
  assert.ok(
    symptomRes1.response.includes('Comprehensive Oral Exam & Digital X-Rays'),
    'Should recommend Comprehensive Oral Exam for tooth pain'
  );
  assert.ok(
    symptomRes1.response.toLowerCase().includes('dentist must examine you in person'),
    'Must include clinical safety disclaimer distinguishing guidance from medical diagnosis'
  );
  assert.ok(
    symptomRes1.response.includes('schedule'),
    'Must offer to schedule the consultation'
  );
  console.log('  ✓ Tooth pain symptom correctly triaged to Comprehensive Oral Exam with clinical safety disclaimer.');

  // Verify routine hygiene triage
  const symptomRes2 = await aiReceptionistService.processMessage({
    message: 'I need a routine teeth cleaning and plaque removal',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: 'test-symptom-cleaning',
    },
  });
  assert.strictEqual(symptomRes2.intent, AIIntent.DENTAL_SYMPTOM_INQUIRY);
  assert.ok(
    symptomRes2.response.includes('Ultrasonic Prophylaxis Hygiene Scaling'),
    'Should recommend Ultrasonic Prophylaxis for cleaning'
  );
  console.log('  ✓ Routine cleaning symptom correctly triaged to Ultrasonic Prophylaxis Scaling.');

  // Verify pediatric triage
  const symptomRes3 = await aiReceptionistService.processMessage({
    message: 'My 5-year-old child needs a dental checkup for a baby tooth',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: 'test-symptom-pediatric',
    },
  });
  assert.strictEqual(symptomRes3.intent, AIIntent.DENTAL_SYMPTOM_INQUIRY);
  assert.ok(
    symptomRes3.response.includes('Pediatric Preventive Dental Evaluation'),
    'Should recommend Pediatric Evaluation for child inquiry'
  );
  console.log('  ✓ Pediatric symptom correctly triaged to Pediatric Preventive Evaluation.');

  // --------------------------------------------------------------------------
  // TEST 3: Emergency Dental Triage & High-Priority Safety
  // --------------------------------------------------------------------------
  console.log('\n3. Testing Emergency Dental Triage Escalation:');
  const emergencyRes = await aiReceptionistService.processMessage({
    message: 'I have severe facial swelling closing my eye and heavy bleeding that will not stop',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: 'test-emergency',
    },
  });

  assert.strictEqual(emergencyRes.success, true);
  assert.strictEqual(emergencyRes.intent, AIIntent.EMERGENCY_DENTAL);
  assert.strictEqual(emergencyRes.action, AIAction.EMERGENCY_ESCALATION);
  assert.ok(
    emergencyRes.response.includes('911') || emergencyRes.response.includes('emergency room'),
    'Emergency response must direct caller to 911 or emergency room'
  );
  assert.ok(
    emergencyRes.response.includes('Option 9') || emergencyRes.response.includes('+1-555-019-2831'),
    'Emergency response must provide urgent clinic triage contact'
  );
  console.log('  ✓ High-risk dental emergencies trigger immediate safety instructions and urgent ER escalation.');

  // --------------------------------------------------------------------------
  // TEST 4: Doctor Cabin & Room Location Inquiries
  // --------------------------------------------------------------------------
  console.log('\n4. Testing Doctor Cabins & Room Locations:');
  const cabinChen = await aiReceptionistService.processMessage({
    message: 'Where can I meet Dr. Emily Chen?',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: 'test-cabin-chen',
    },
  });
  assert.strictEqual(cabinChen.intent, AIIntent.CABIN_ROOM_LOCATION);
  assert.ok(
    cabinChen.response.includes('Cabin 2') && cabinChen.response.includes('Pediatric'),
    'Dr. Emily Chen must map to Cabin 2 in the Pediatric Wing'
  );
  console.log('  ✓ Dr. Emily Chen correctly located in Cabin 2 (Pediatric Wing).');

  const cabinThorne = await aiReceptionistService.processMessage({
    message: 'Which room should I go to for Dr. Marcus Thorne?',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: 'test-cabin-thorne',
    },
  });
  assert.strictEqual(cabinThorne.intent, AIIntent.CABIN_ROOM_LOCATION);
  assert.ok(
    cabinThorne.response.includes('Cabin 1') && cabinThorne.response.includes('West Wing'),
    'Dr. Marcus Thorne must map to Cabin 1 in the West Wing'
  );
  console.log('  ✓ Dr. Marcus Thorne correctly located in Cabin 1 (West Wing).');

  const cabinJenkins = await aiReceptionistService.processMessage({
    message: 'Where is Sarah Jenkins the hygienist located?',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: 'test-cabin-jenkins',
    },
  });
  assert.strictEqual(cabinJenkins.intent, AIIntent.CABIN_ROOM_LOCATION);
  assert.ok(
    cabinJenkins.response.includes('Hygiene Bay 3') && cabinJenkins.response.includes('East Wing'),
    'Sarah Jenkins must map to Hygiene Bay 3 in the East Wing'
  );
  console.log('  ✓ Sarah Jenkins, RDH correctly located in Hygiene Bay 3 (East Wing).');

  // --------------------------------------------------------------------------
  // TEST 5: Navigation & Wayfinding Directions
  // --------------------------------------------------------------------------
  console.log('\n5. Testing Navigation & Wayfinding Directions:');
  const navRes = await aiReceptionistService.processMessage({
    message: 'How do I reach the reception desk from the main entrance?',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: 'test-nav',
    },
  });
  assert.strictEqual(navRes.intent, AIIntent.CLINIC_DIRECTIONS);
  assert.ok(
    navRes.response.includes('glass doors') || navRes.response.includes('reception desk'),
    'Must provide entrance and reception instructions'
  );
  console.log('  ✓ Entrance and reception directions retrieved accurately.');

  // --------------------------------------------------------------------------
  // TEST 6: Patient Guidance & Waiting Area Policies
  // --------------------------------------------------------------------------
  console.log('\n6. Testing Waiting Area & Arrival Policies:');
  const earlyRes = await aiReceptionistService.processMessage({
    message: 'Where should I wait if I arrive early?',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: 'test-wait-early',
    },
  });
  assert.strictEqual(earlyRes.intent, AIIntent.WAITING_AREA_POLICY);
  assert.ok(
    earlyRes.response.toLowerCase().includes('waiting lounge') ||
      earlyRes.response.toLowerCase().includes('patient waiting'),
    'Must direct early arrivals to the waiting lounge'
  );
  console.log('  ✓ Early arrival guidance accurately points to waiting lounge with amenities.');

  const lateRes = await aiReceptionistService.processMessage({
    message: 'What should I do if I am running late for my appointment?',
    context: {
      businessId: LUMINA_DENTAL_BUSINESS_ID,
      sessionId: 'test-wait-late',
    },
  });
  assert.strictEqual(lateRes.intent, AIIntent.WAITING_AREA_POLICY);
  assert.ok(
    lateRes.response.includes('+1-555-019-2831') || lateRes.response.toLowerCase().includes('15 minutes'),
    'Must advise calling reception if running late'
  );
  console.log('  ✓ Late arrival guidance instructs patient to notify reception.');

  // --------------------------------------------------------------------------
  // TEST 7: Mid-Booking FAQ Interruption and Seamless Resumption
  // --------------------------------------------------------------------------
  console.log('\n7. Testing Mid-Booking FAQ Interruption & Step Resumption:');
  const midSessionId = 'test-mid-booking-interruption';
  const now = new Date();

  // Create an active session paused at BOOKING_COLLECT_DATE
  await testSessionStore.setSession({
    sessionId: midSessionId,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    step: BookingConversationStep.BOOKING_COLLECT_DATE,
    selectedServiceId: 'sv000001-0000-0000-0000-000000000001',
    selectedServiceName: 'Comprehensive Oral Exam & Digital X-Rays',
    selectedStaffId: 's0000001-0000-0000-0000-000000000001',
    selectedStaffName: 'Dr. Marcus Thorne',
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
  });

  const activeSession = await testSessionStore.getSession(midSessionId);
  assert.ok(activeSession);

  // User interrupts with a clinic question: "Where is Dr. Emily Chen's room?"
  const turnResult = await testStateMachine.handleTurn(
    'Where is Dr. Emily Chen\'s room?',
    activeSession,
    { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: midSessionId, channel: 'VOICE' },
    performance.now()
  );

  assert.strictEqual(turnResult.response.success, true);
  assert.strictEqual(turnResult.response.intent, AIIntent.CABIN_ROOM_LOCATION);
  assert.ok(
    turnResult.response.response.includes('Cabin 2'),
    'Must answer the FAQ question with Cabin 2'
  );
  assert.ok(
    turnResult.response.response.includes('what date would you prefer'),
    'Must seamlessly resume booking by asking for the appointment date'
  );
  assert.strictEqual(
    turnResult.updatedSession?.step,
    BookingConversationStep.BOOKING_COLLECT_DATE,
    'Session step must remain preserved at BOOKING_COLLECT_DATE'
  );
  console.log('  ✓ FAQ answered mid-booking and state machine successfully resumed active date collection step.');

  // --------------------------------------------------------------------------
  // TEST 8: Symptom Triage to Booking Transition
  // --------------------------------------------------------------------------
  console.log('\n8. Testing Symptom Triage to Booking Confirmation Transition:');
  const triageSessionId = 'test-triage-transition';
  await testSessionStore.setSession({
    sessionId: triageSessionId,
    businessId: LUMINA_DENTAL_BUSINESS_ID,
    step: BookingConversationStep.BOOKING_SYMPTOM_TRIAGE,
    suggestedServiceId: 'sv000001-0000-0000-0000-000000000001',
    suggestedServiceName: 'Comprehensive Oral Exam & Digital X-Rays',
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
  });

  const triageSession = await testSessionStore.getSession(triageSessionId);
  assert.ok(triageSession);

  // Caller says "Yes, please schedule that"
  const triageConfirmResult = await testStateMachine.handleTurn(
    'Yes please, let\'s schedule that',
    triageSession,
    { businessId: LUMINA_DENTAL_BUSINESS_ID, sessionId: triageSessionId, channel: 'VOICE' },
    performance.now()
  );

  assert.strictEqual(triageConfirmResult.response.success, true);
  assert.strictEqual(
    triageConfirmResult.updatedSession?.step,
    BookingConversationStep.BOOKING_COLLECT_STAFF,
    'Session must advance to specialist selection step'
  );
  assert.strictEqual(
    triageConfirmResult.updatedSession?.selectedServiceId,
    'sv000001-0000-0000-0000-000000000001',
    'Pre-staged service ID must be preserved'
  );
  assert.ok(
    triageConfirmResult.response.response.includes('Dr. Marcus Thorne') ||
      triageConfirmResult.response.response.includes('specialist'),
    'Response must ask for specialist preference'
  );
  console.log('  ✓ Caller agreement advances triage smoothly into deterministic specialist selection.');

  // --------------------------------------------------------------------------
  // TEST 9: Multi-Tenant Data Isolation
  // --------------------------------------------------------------------------
  console.log('\n9. Testing Multi-Tenant Clinic Knowledge Isolation:');
  const apexBusinessId = 'b0000002-0000-0000-0000-000000000002';
  const apexCabinRes = findDoctorCabin(apexBusinessId, 'Dr. Emily Chen');
  assert.strictEqual(
    apexCabinRes?.notFound,
    true,
    'Apex Endodontics must NOT have access to Lumina Dental Care doctors or cabins'
  );

  const unconfiguredId = 'b9999999-0000-0000-0000-000000000009';
  const unconfiguredProfile = getClinicKnowledge(unconfiguredId);
  assert.strictEqual(
    unconfiguredProfile,
    null,
    'Non-configured business profile must return null without data leaks'
  );
  console.log('  ✓ Multi-tenant data isolation verified with 0 cross-business information leakage.');

  console.log('\n======================================================');
  console.log('🎉 ALL DENTAL DOMAIN TESTS PASSED SUCCESSFULLY! 🎉');
  console.log('======================================================\n');
}
